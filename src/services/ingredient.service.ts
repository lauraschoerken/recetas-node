import { Prisma, PrismaClient } from "@prisma/client";
import {
  Ingredient,
  CreateIngredientDto,
  UpdateIngredientDto,
  CreateUnitConversionDto,
  UnitConversion,
  IngredientVariant,
  CreateVariantDto,
  UpdateVariantDto,
} from "../domain";

const prisma = new PrismaClient();

const ingredientInclude = {
  conversions: true,
  variants: true,
  createdBy: { select: { id: true, name: true } },
};

export interface DailyNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export class IngredientService {
  private normalizeImportText(value: unknown): string {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  private normalizeIngredientImportRows(input: any): any[] {
    return Array.isArray(input)
      ? input
      : Array.isArray(input?.ingredients)
        ? input.ingredients
        : input && typeof input === "object" && input.name
          ? [input]
          : [];
  }

  private importTagRows(input: any): Array<{ name: string; color?: string }> {
    return (Array.isArray(input?.tags) ? input.tags : [])
      .map((tag: any) =>
        typeof tag === "string"
          ? { name: tag.trim() }
          : {
              name: String(tag?.name ?? "").trim(),
              color: tag?.color ? String(tag.color) : undefined,
            },
      )
      .filter((tag: { name: string }) => Boolean(tag.name));
  }

  private importDistance(a: string, b: string): number {
    const rows = Array.from({ length: a.length + 1 }, (_, i) => i);
    for (let j = 1; j <= b.length; j += 1) {
      let previous = rows[0];
      rows[0] = j;
      for (let i = 1; i <= a.length; i += 1) {
        const saved = rows[i];
        rows[i] = Math.min(
          rows[i] + 1,
          rows[i - 1] + 1,
          previous + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
        previous = saved;
      }
    }
    return rows[a.length];
  }

  async reviewImportJson(input: any, userId: number) {
    const rows = this.normalizeIngredientImportRows(input);
    if (rows.length === 0) {
      throw {
        httpCode: 400,
        message: "El JSON no contiene ningún ingrediente válido",
      };
    }
    const tags = await prisma.ingredientTag.findMany({
      where: { OR: [{ isGlobal: true }, { createdByUserId: userId }] },
      select: { id: true, name: true, color: true },
    });
    const conflicts: Array<{
      key: string;
      importedName: string;
      color?: string;
      candidates: Array<{ id: number; name: string; color: string | null }>;
    }> = [];
    const seen = new Set<string>();
    for (const row of rows) {
      for (const imported of this.importTagRows(row)) {
        const normalized = this.normalizeImportText(imported.name);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        if (
          tags.some(
            (tag) => this.normalizeImportText(tag.name) === normalized,
          )
        )
          continue;
        const candidates = tags
          .map((tag) => ({
            ...tag,
            score: this.importDistance(
              normalized,
              this.normalizeImportText(tag.name),
            ),
          }))
          .filter(
            (tag) =>
              tag.score <= Math.max(3, Math.floor(normalized.length / 2)) ||
              this.normalizeImportText(tag.name).includes(normalized) ||
              normalized.includes(this.normalizeImportText(tag.name)),
          )
          .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
          .slice(0, 8)
          .map(({ id, name, color }) => ({ id, name, color }));
        conflicts.push({
          key: `tag:${normalized}`,
          importedName: imported.name,
          color: imported.color,
          candidates,
        });
      }
    }
    return { needsReview: conflicts.length > 0, conflicts };
  }

  /**
   * An ingredient is visible when it is global, belongs to the current user,
   * or is exposed through a public recipe. Publishing a recipe therefore also
   * makes every ingredient needed to prepare it discoverable.
   */
  private visibilityFilter(userId?: number): Prisma.IngredientWhereInput {
    const publicRecipeUsage: Prisma.IngredientWhereInput[] = [
      { recipes: { some: { recipe: { isPublic: true } } } },
      {
        componentOptions: {
          some: { component: { recipe: { isPublic: true } } },
        },
      },
    ];

    return userId
      ? {
          OR: [
            { status: "GLOBAL" },
            { createdByUserId: userId },
            ...publicRecipeUsage,
          ],
        }
      : { OR: [{ status: "GLOBAL" }, ...publicRecipeUsage] };
  }

  private async touchIngredient(ingredientId: number): Promise<void> {
    await prisma.ingredient.update({
      where: { id: ingredientId },
      data: { updatedAt: new Date() },
    });
  }

  // ── Helper: aplicar overrides personales al array de ingredientes ──
  private async applyUserOverrides(
    data: Ingredient[],
    userId: number,
  ): Promise<Ingredient[]> {
    if (data.length === 0) return data;
    const ingredientIds = data.map((i) => i.id);
    const [ingredientOverrides, conversionOverrides] = await Promise.all([
      prisma.ingredientUserOverride.findMany({
        where: { userId, ingredientId: { in: ingredientIds } },
      }),
      prisma.ingredientConversionUserOverride.findMany({
        where: { userId, ingredientId: { in: ingredientIds } },
      }),
    ]);

    const overrideMap = new Map(
      ingredientOverrides.map((o) => [o.ingredientId, o]),
    );
    const convOverrideMap = new Map<number, typeof conversionOverrides>();
    for (const co of conversionOverrides) {
      if (!convOverrideMap.has(co.ingredientId))
        convOverrideMap.set(co.ingredientId, []);
      convOverrideMap.get(co.ingredientId)!.push(co);
    }

    return data.map((ingredient) => {
      const override = overrideMap.get(ingredient.id);
      const convOverrides = convOverrideMap.get(ingredient.id) ?? [];
      const result = { ...ingredient } as Record<string, unknown>;

      if (override) {
        if (override.imageUrl !== null && override.imageUrl !== undefined)
          result.imageUrl = override.imageUrl;
        if (
          override.defaultLocation !== null &&
          override.defaultLocation !== undefined
        )
          result.defaultLocation = override.defaultLocation;
        if (
          override.preferredUnit !== null &&
          override.preferredUnit !== undefined
        )
          result.preferredUnit = override.preferredUnit;
      }

      if (convOverrides.length > 0) {
        const globalConversions =
          (ingredient.conversions as UnitConversion[]) ?? [];
        const globalUnitNames = new Set(
          globalConversions.map((c) => c.unitName.toLowerCase()),
        );
        const userConversions = convOverrides
          .filter((co) => !globalUnitNames.has(co.unitName.toLowerCase()))
          .map((co) => ({
            id: co.id,
            unitName: co.unitName,
            gramsPerUnit: co.gramsPerUnit,
            ingredientId: co.ingredientId,
            isUserOverride: true,
          }));
        result.conversions = [...globalConversions, ...userConversions];
      }

      return result as unknown as Ingredient;
    });
  }

  async getAll(
    opts: {
      page?: number;
      pageSize?: number;
      search?: string;
      userId?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      authorId?: number;
      location?: string;
      statusFilter?: string; // 'GLOBAL' | 'PRIVATE' | 'PENDING'
      hasNutrition?: boolean;
      minCalories?: number;
      maxCalories?: number;
      minProtein?: number;
      maxProtein?: number;
      minCarbs?: number;
      maxCarbs?: number;
      minFat?: number;
      maxFat?: number;
      tagIds?: number[]; // filtrar por tags asignadas
    } = {},
  ): Promise<{ data: Ingredient[]; total: number }> {
    const {
      page,
      pageSize,
      search = "",
      userId,
      sortBy = "name",
      sortOrder = "asc",
      authorId,
      location,
      statusFilter: statusParam,
      hasNutrition,
      minCalories,
      maxCalories,
      minProtein,
      maxProtein,
      minCarbs,
      maxCarbs,
      minFat,
      maxFat,
      tagIds,
    } = opts;

    // Filtro de estado/visibilidad
    let visibilityFilter: Record<string, unknown>;
    if (statusParam === "GLOBAL") {
      visibilityFilter = { status: "GLOBAL" };
    } else if (statusParam === "PRIVATE" && userId) {
      visibilityFilter = { createdByUserId: userId, status: "PRIVATE" };
    } else if (statusParam === "PENDING" && userId) {
      visibilityFilter = { createdByUserId: userId, status: "PENDING" };
    } else {
      visibilityFilter = this.visibilityFilter(userId);
    }

    // Búsqueda insensible a tildes usando unaccent (extensión PostgreSQL)
    let searchIds: number[] | null = null;
    if (search) {
      const pattern = `%${search}%`;
      const rows = await prisma.$queryRaw<{ id: number }[]>(
        Prisma.sql`SELECT id FROM "Ingredient" WHERE unaccent(lower(name)) LIKE unaccent(lower(${pattern}))`
      );
      searchIds = rows.map((r) => r.id);
    }
    const searchFilter = searchIds !== null ? { id: { in: searchIds } } : {};

    const locationFilter = location
      ? { defaultLocation: { equals: location, mode: "insensitive" as const } }
      : {};

    // Filtro de variantes (macros)
    const macroFiltersActive =
      hasNutrition ||
      minCalories != null ||
      maxCalories != null ||
      minProtein != null ||
      maxProtein != null ||
      minCarbs != null ||
      maxCarbs != null ||
      minFat != null ||
      maxFat != null;

    let variantWhere: Record<string, unknown> = { isDefault: true };
    if (macroFiltersActive) {
      if (hasNutrition)
        variantWhere = { ...variantWhere, calories: { not: null } };
      if (minCalories != null || maxCalories != null) {
        variantWhere.calories = {
          ...(typeof variantWhere.calories === "object" && variantWhere.calories
            ? (variantWhere.calories as object)
            : {}),
          ...(minCalories != null ? { gte: minCalories } : {}),
          ...(maxCalories != null ? { lte: maxCalories } : {}),
        };
      }
      if (minProtein != null || maxProtein != null) {
        variantWhere.protein = {
          ...(minProtein != null ? { gte: minProtein } : {}),
          ...(maxProtein != null ? { lte: maxProtein } : {}),
        };
      }
      if (minCarbs != null || maxCarbs != null) {
        variantWhere.carbs = {
          ...(minCarbs != null ? { gte: minCarbs } : {}),
          ...(maxCarbs != null ? { lte: maxCarbs } : {}),
        };
      }
      if (minFat != null || maxFat != null) {
        variantWhere.fat = {
          ...(minFat != null ? { gte: minFat } : {}),
          ...(maxFat != null ? { lte: maxFat } : {}),
        };
      }
    }

    const where: Record<string, unknown> = {
      AND: [
        visibilityFilter,
        ...(authorId != null ? [{ createdByUserId: authorId }] : []),
      ],
      ...searchFilter,
      ...locationFilter,
      ...(macroFiltersActive ? { variants: { some: variantWhere } } : {}),
      ...(tagIds && tagIds.length > 0
        ? {
            tagAssignments: {
              some: {
                tagId: { in: tagIds },
                OR: [{ userId: null }, ...(userId ? [{ userId }] : [])],
              },
            },
          }
        : {}),
    };

    const macroSortFields = ["calories", "protein", "carbs", "fat", "fiber"];
    const sortByMacro = macroSortFields.includes(sortBy);

    let data: Ingredient[];
    let total: number;

    if (sortByMacro) {
      // Ordenar por macro: recuperar todos y ordenar en JS (Prisma no soporta orderBy en relaciones to-many)
      const allData = await prisma.ingredient.findMany({
        where,
        include: ingredientInclude,
      });
      const field = sortBy as
        | "calories"
        | "protein"
        | "carbs"
        | "fat"
        | "fiber";
      const sorted = allData.sort((a, b) => {
        const av =
          (a.variants as IngredientVariant[]).find((v) => v.isDefault) ??
          (a.variants as IngredientVariant[])[0];
        const bv =
          (b.variants as IngredientVariant[]).find((v) => v.isDefault) ??
          (b.variants as IngredientVariant[])[0];
        const aVal = av?.[field] ?? 0;
        const bVal = bv?.[field] ?? 0;
        const aNum = typeof aVal === "number" ? aVal : 0;
        const bNum = typeof bVal === "number" ? bVal : 0;
        return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
      });
      total = sorted.length;
      data =
        page && pageSize
          ? sorted.slice((page - 1) * pageSize, page * pageSize)
          : sorted;
    } else {
      const allowedSortFields = ["name", "createdAt", "updatedAt"];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "name";
      const [raw, count] = await prisma.$transaction([
        prisma.ingredient.findMany({
          where,
          orderBy: { [safeSortBy]: sortOrder === "desc" ? "desc" : "asc" },
          include: ingredientInclude,
          ...(page && pageSize
            ? { skip: (page - 1) * pageSize, take: pageSize }
            : {}),
        }),
        prisma.ingredient.count({ where }),
      ]);
      data = raw as unknown as Ingredient[];
      total = count;
    }

    if (userId && data.length > 0) {
      data = await this.applyUserOverrides(data, userId);
    }

    return { data, total };
  }

  async getAuthors(userId: number): Promise<{ id: number; name: string }[]> {
    return prisma.user.findMany({
      where: {
        createdIngredients: {
          some: this.visibilityFilter(userId),
        },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async search(query: string, userId?: number): Promise<Ingredient[]> {
    const pattern = `%${query}%`;
    // Búsqueda insensible a tildes usando unaccent (extensión PostgreSQL)
    const rows = await prisma.$queryRaw<{ id: number }[]>(
      Prisma.sql`SELECT id FROM "Ingredient"
        WHERE unaccent(lower(name)) LIKE unaccent(lower(${pattern}))`,
    );
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return [];
    const results = await prisma.ingredient.findMany({
      where: { AND: [{ id: { in: ids } }, this.visibilityFilter(userId)] },
      orderBy: { name: "asc" },
      take: 10,
      include: ingredientInclude,
    });
    if (userId && results.length > 0) {
      return this.applyUserOverrides(
        results as unknown as Ingredient[],
        userId,
      );
    }
    return results;
  }

  async create(
    data: CreateIngredientDto,
    userId?: number,
    userRole?: string,
  ): Promise<Ingredient> {
    const trimmed = data.name.trim();
    const normalizedName =
      trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    const unit = data.unit === "ml" ? "ml" : "g";
    const isAdmin = !userId || userRole === "ADMIN";

    // Buscar ingrediente GLOBAL existente con el mismo nombre
    const existing = await prisma.ingredient.findFirst({
      where: {
        name: { equals: normalizedName, mode: "insensitive" },
        status: "GLOBAL",
      },
      include: ingredientInclude,
    });

    if (existing) {
      if (!isAdmin) {
        // Usuario normal: el ingrediente ya existe globalmente, devolver sin modificar
        return existing;
      }
      // Admin: actualizar datos globales
      return prisma.ingredient.update({
        where: { id: existing.id },
        data: {
          name: normalizedName,
          unit: unit,
          imageUrl: data.imageUrl ?? existing.imageUrl,
          defaultLocation: data.defaultLocation ?? existing.defaultLocation,
        },
        include: ingredientInclude,
      });
    }

    // Crear nuevo ingrediente
    // Admin → GLOBAL directamente; Usuario normal → PRIVATE (solo para él)
    const ingredient = await prisma.ingredient.create({
      data: {
        name: normalizedName,
        unit: unit,
        imageUrl: data.imageUrl,
        defaultLocation: data.defaultLocation || null,
        status: isAdmin ? "GLOBAL" : "PRIVATE",
        createdByUserId: userId ?? null,
      },
      include: ingredientInclude,
    });

    // Crear variante por defecto "Crudo" si se proporcionaron macros o no hay variantes
    const variants = data.variants || [{ name: "Crudo", isDefault: true }];
    for (const variant of variants) {
      await prisma.ingredientVariant.create({
        data: {
          name: variant.name,
          isDefault: variant.isDefault ?? variants.length === 1,
          calories: variant.calories,
          protein: variant.protein,
          carbs: variant.carbs,
          fat: variant.fat,
          fiber: variant.fiber,
          weightFactor: variant.weightFactor ?? 1,
          ingredientId: ingredient.id,
        },
      });
    }

    return prisma.ingredient.findUnique({
      where: { id: ingredient.id },
      include: ingredientInclude,
    }) as Promise<Ingredient>;
  }

  async importFromJson(
    input: any,
    userId: number,
    userRole?: string,
    tagResolutions: Record<
      string,
      { tagId?: number; name?: string; color?: string; createNew?: boolean }
    > = {},
  ): Promise<{ importedCount: number; skipped: string[] }> {
    const rows = this.normalizeIngredientImportRows(input);

    if (rows.length === 0) {
      throw {
        httpCode: 400,
        message: "El JSON no contiene ningún ingrediente válido",
      };
    }

    let importedCount = 0;
    const skipped: string[] = [];
    for (const row of rows) {
      const name = String(row?.name ?? "").trim();
      if (!name) {
        throw {
          httpCode: 400,
          message: "Todos los ingredientes necesitan nombre",
        };
      }
      const imageUrl = String(row?.imageUrl ?? "").trim();
      if (!/^https:\/\//i.test(imageUrl)) {
        throw {
          httpCode: 400,
          message: `El ingrediente "${name}" necesita imageUrl con una imagen HTTPS pública y directa`,
        };
      }

      const existing = await prisma.ingredient.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          OR: [{ status: "GLOBAL" }, { createdByUserId: userId }],
        },
        select: { id: true },
      });
      if (existing) {
        skipped.push(name);
        continue;
      }

      const unit = row?.unit ?? row?.ingredientBaseUnit;
      const rawVariants = Array.isArray(row?.variants)
        ? row.variants.filter((variant: any) => variant?.name)
        : [];
      const requestedDefault = rawVariants.findIndex(
        (variant: any) => variant?.isDefault === true,
      );
      const normalizedVariants = rawVariants.map(
        (variant: any, index: number) => ({
          ...variant,
          isDefault: index === (requestedDefault >= 0 ? requestedDefault : 0),
        }),
      );

      const ingredient = await this.create(
        {
          name,
          unit: unit === "ml" ? "ml" : "g",
          imageUrl,
          defaultLocation: row?.defaultLocation ?? null,
          variants:
            normalizedVariants.length > 0 ? normalizedVariants : undefined,
        },
        userId,
        userRole,
      );

      const preferredUnit = String(row?.preferredUnit ?? "").trim();
      if (preferredUnit) {
        await prisma.ingredient.update({
          where: { id: ingredient.id },
          data: { preferredUnit },
        });
      }

      for (const conversion of Array.isArray(row?.conversions)
        ? row.conversions
        : []) {
        const unitName = String(conversion?.unitName ?? "").trim();
        const gramsPerUnit = Number(conversion?.gramsPerUnit);
        if (!unitName || !Number.isFinite(gramsPerUnit) || gramsPerUnit <= 0)
          continue;
        await this.addConversion(
          ingredient.id,
          { unitName, gramsPerUnit },
          userId,
          userRole,
        );
      }

      const minimumAlert = row?.minimumAlert ?? row?.minThreshold ?? null;
      const minQuantity = Number(
        minimumAlert?.minQuantity ?? minimumAlert?.quantity,
      );
      const minUnit = String(minimumAlert?.unit ?? unit ?? "g").trim();
      if (Number.isFinite(minQuantity) && minQuantity > 0 && minUnit) {
        await prisma.ingredientMinThreshold.upsert({
          where: {
            ingredientId_userId: { ingredientId: ingredient.id, userId },
          },
          create: {
            ingredientId: ingredient.id,
            userId,
            minQuantity,
            unit: minUnit,
          },
          update: { minQuantity, unit: minUnit },
        });
      }

      const visibleTags = await prisma.ingredientTag.findMany({
        where: { OR: [{ isGlobal: true }, { createdByUserId: userId }] },
      });
      for (const importedTag of this.importTagRows(row)) {
        const normalized = this.normalizeImportText(importedTag.name);
        const key = `tag:${normalized}`;
        const resolution = tagResolutions[key];
        let tag = resolution?.tagId
          ? visibleTags.find((candidate) => candidate.id === resolution.tagId)
          : visibleTags.find(
              (candidate) =>
                this.normalizeImportText(candidate.name) === normalized,
            );
        if (!tag && resolution?.createNew) {
          const newName = String(
            resolution.name ?? importedTag.name,
          ).trim();
          tag = visibleTags.find(
            (candidate) =>
              this.normalizeImportText(candidate.name) ===
              this.normalizeImportText(newName),
          );
          if (!tag) {
            tag = await prisma.ingredientTag.create({
              data: {
                name: newName,
                color: resolution.color ?? importedTag.color ?? null,
                isGlobal: false,
                createdByUserId: userId,
              },
            });
            visibleTags.push(tag);
          }
        }
        if (!tag) {
          throw {
            httpCode: 400,
            message: `Debes revisar el tag "${importedTag.name}" antes de importar`,
          };
        }
        const assignmentUserId =
          tag.isGlobal && userRole === "ADMIN" ? null : userId;
        const existingAssignment = await prisma.ingredientTagAssignment.findFirst(
          {
            where: {
              ingredientId: ingredient.id,
              tagId: tag.id,
              userId: assignmentUserId,
            },
          },
        );
        if (!existingAssignment) {
          await prisma.ingredientTagAssignment.create({
            data: {
              ingredientId: ingredient.id,
              tagId: tag.id,
              userId: assignmentUserId,
            },
          });
        }
      }

      const household = await prisma.householdMember.findFirst({
        where: { userId },
        select: { householdId: true },
      });
      const visibleStores = await prisma.userStore.findMany({
        where: {
          OR: [
            { userId },
            ...(household
              ? [{ householdId: household.householdId, isShared: true }]
              : []),
          ],
        },
      });
      for (const [index, storeInput] of (Array.isArray(row?.stores)
        ? row.stores
        : []).entries()) {
        const storeName = String(
          typeof storeInput === "string" ? storeInput : storeInput?.name,
        ).trim();
        if (!storeName) continue;
        const store = visibleStores.find(
          (candidate) =>
            this.normalizeImportText(candidate.name) ===
            this.normalizeImportText(storeName),
        );
        if (!store) {
          throw {
            httpCode: 400,
            message: `No existe la tienda "${storeName}" en tu configuración`,
          };
        }
        const storeDetails =
          typeof storeInput === "string" ? {} : storeInput;
        await prisma.userStoreIngredient.upsert({
          where: {
            storeId_ingredientId_userId: {
              storeId: store.id,
              ingredientId: ingredient.id,
              userId,
            },
          },
          create: {
            storeId: store.id,
            ingredientId: ingredient.id,
            userId,
            purchaseUrl: storeDetails?.purchaseUrl ?? null,
            preferredUnit: storeDetails?.preferredUnit ?? null,
            sortOrder: row?.storeOrderIndifferent
              ? null
              : (storeDetails?.sortOrder ?? index + 1),
          },
          update: {
            purchaseUrl: storeDetails?.purchaseUrl ?? null,
            preferredUnit: storeDetails?.preferredUnit ?? null,
            sortOrder: row?.storeOrderIndifferent
              ? null
              : (storeDetails?.sortOrder ?? index + 1),
          },
        });
      }

      if (row?.proposeToAdmin === true && userRole !== "ADMIN") {
        await prisma.ingredient.update({
          where: { id: ingredient.id },
          data: { status: "PENDING" },
        });
      }
      importedCount += 1;
    }

    return { importedCount, skipped };
  }

  async createBulk(ingredients: CreateIngredientDto[]): Promise<Ingredient[]> {
    const results: Ingredient[] = [];

    for (const data of ingredients) {
      const trimmed = data.name.trim();
      if (!trimmed) continue;
      const normalizedName =
        trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

      const unit = data.unit === "ml" ? "ml" : "g";

      const existing = await prisma.ingredient.findFirst({
        where: {
          name: { equals: normalizedName, mode: "insensitive" },
          status: "GLOBAL",
        },
        include: ingredientInclude,
      });

      let ingredient: Ingredient;

      if (existing) {
        ingredient = await prisma.ingredient.update({
          where: { id: existing.id },
          data: { unit },
          include: ingredientInclude,
        });
      } else {
        ingredient = await prisma.ingredient.create({
          data: {
            name: normalizedName,
            unit: unit,
          },
          include: ingredientInclude,
        });

        // Crear variante por defecto "Crudo"
        await prisma.ingredientVariant.create({
          data: {
            name: "Crudo",
            isDefault: true,
            ingredientId: ingredient.id,
          },
        });

        const defaultConversion =
          unit === "g"
            ? { unitName: "kg", gramsPerUnit: 1000 }
            : { unitName: "l", gramsPerUnit: 1000 };

        await prisma.unitConversion.upsert({
          where: {
            ingredientId_unitName: {
              ingredientId: ingredient.id,
              unitName: defaultConversion.unitName,
            },
          },
          update: { gramsPerUnit: defaultConversion.gramsPerUnit },
          create: {
            ingredientId: ingredient.id,
            unitName: defaultConversion.unitName,
            gramsPerUnit: defaultConversion.gramsPerUnit,
          },
        });

        ingredient = (await prisma.ingredient.findUnique({
          where: { id: ingredient.id },
          include: ingredientInclude,
        })) as Ingredient;
      }

      results.push(ingredient);
    }

    return results;
  }

  async update(
    id: number,
    data: UpdateIngredientDto,
    userId?: number,
    userRole?: string,
  ): Promise<Ingredient | null> {
    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) return null;

    // Usuario no-admin editando un ingrediente GLOBAL → guardar en override personal
    if (userId && userRole !== "ADMIN" && ingredient.status === "GLOBAL") {
      const overrideData: {
        imageUrl?: string | null;
        defaultLocation?: string | null;
        preferredUnit?: string | null;
      } = {};
      if (data.imageUrl !== undefined) overrideData.imageUrl = data.imageUrl;
      if (data.defaultLocation !== undefined)
        overrideData.defaultLocation = data.defaultLocation;
      if (data.preferredUnit !== undefined)
        overrideData.preferredUnit = data.preferredUnit;

      if (Object.keys(overrideData).length > 0) {
        await prisma.ingredientUserOverride.upsert({
          where: { userId_ingredientId: { userId, ingredientId: id } },
          create: { userId, ingredientId: id, ...overrideData },
          update: overrideData,
        });
      }

      // Devolver el ingrediente con el override aplicado
      const full = await prisma.ingredient.findUnique({
        where: { id },
        include: ingredientInclude,
      });
      if (!full) return null;
      const override = await prisma.ingredientUserOverride.findUnique({
        where: { userId_ingredientId: { userId, ingredientId: id } },
      });
      if (override) {
        return {
          ...full,
          imageUrl:
            override.imageUrl !== null && override.imageUrl !== undefined
              ? override.imageUrl
              : full.imageUrl,
          defaultLocation:
            override.defaultLocation !== null &&
            override.defaultLocation !== undefined
              ? override.defaultLocation
              : full.defaultLocation,
          preferredUnit:
            override.preferredUnit !== null &&
            override.preferredUnit !== undefined
              ? override.preferredUnit
              : full.preferredUnit,
        } as unknown as Ingredient;
      }
      return full as unknown as Ingredient;
    }

    // Admin editando un ingrediente PENDING → preservar valores originales del
    // creador como UserOverride para que no los pierda al convertirse en GLOBAL
    if (
      userRole === "ADMIN" &&
      ingredient.status === "PENDING" &&
      ingredient.createdByUserId
    ) {
      const creatorId = ingredient.createdByUserId;
      const preserve: {
        imageUrl?: string | null;
        defaultLocation?: string | null;
        preferredUnit?: string | null;
      } = {};

      if (
        data.imageUrl !== undefined &&
        data.imageUrl !== ingredient.imageUrl &&
        ingredient.imageUrl
      ) {
        preserve.imageUrl = ingredient.imageUrl;
      }
      if (
        data.defaultLocation !== undefined &&
        data.defaultLocation !== ingredient.defaultLocation &&
        ingredient.defaultLocation
      ) {
        preserve.defaultLocation = ingredient.defaultLocation;
      }
      if (
        data.preferredUnit !== undefined &&
        data.preferredUnit !== ingredient.preferredUnit &&
        ingredient.preferredUnit
      ) {
        preserve.preferredUnit = ingredient.preferredUnit;
      }

      if (Object.keys(preserve).length > 0) {
        await prisma.ingredientUserOverride.upsert({
          where: {
            userId_ingredientId: { userId: creatorId, ingredientId: id },
          },
          create: { userId: creatorId, ingredientId: id, ...preserve },
          update: preserve,
        });
      }
    }

    return prisma.ingredient.update({
      where: { id },
      data: {
        name: data.name
          ? data.name.charAt(0).toUpperCase() +
            data.name.slice(1).toLowerCase().trim()
          : undefined,
        unit: data.unit,
        preferredUnit: data.preferredUnit,
        imageUrl: data.imageUrl,
        defaultLocation: data.defaultLocation,
      },
      include: ingredientInclude,
    });
  }

  async delete(
    id: number,
    userId?: number,
    userRole?: string,
  ): Promise<boolean> {
    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) return false;

    const isAdmin = userRole === "ADMIN";
    if (!isAdmin && ingredient.status === "GLOBAL") {
      throw {
        httpCode: 403,
        message: "Los ingredientes públicos solo pueden ser eliminados por un administrador",
      };
    }
    if (!isAdmin && ingredient.createdByUserId !== userId) {
      throw {
        httpCode: 403,
        message: "Solo puedes eliminar tus propios ingredientes privados",
      };
    }

    await prisma.ingredient.delete({ where: { id } });
    return true;
  }

  async getById(id: number, userId?: number): Promise<Ingredient | null> {
    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
      include: ingredientInclude,
    });
    if (!ingredient || !userId) return ingredient;
    const [result] = await this.applyUserOverrides([ingredient], userId);
    return result ?? null;
  }

  async setStatus(id: number, status: string): Promise<Ingredient | null> {
    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) return null;
    return prisma.ingredient.update({
      where: { id },
      data: { status },
      include: ingredientInclude,
    });
  }

  // Proponer un ingrediente PRIVATE al admin (cambia estado a PENDING)
  // Solo el creador puede proponerlo
  async propose(id: number, userId: number): Promise<Ingredient | null> {
    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) return null;
    if (ingredient.createdByUserId !== userId) return null; // no es el creador
    if (ingredient.status !== "PRIVATE") return null; // ya está pendiente o global
    return prisma.ingredient.update({
      where: { id },
      data: { status: "PENDING" },
      include: ingredientInclude,
    });
  }

  // --- Override methods ---
  async upsertOverride(
    ingredientId: number,
    userId: number,
    data: {
      preferredUnit?: string | null;
      imageUrl?: string | null;
      defaultLocation?: string | null;
      preferredPurchaseVariantId?: number | null;
      purchaseIsIndifferent?: boolean;
    },
  ) {
    return prisma.ingredientUserOverride.upsert({
      where: { userId_ingredientId: { userId, ingredientId } },
      create: { userId, ingredientId, ...data },
      update: data,
    });
  }

  async getOverride(ingredientId: number, userId: number) {
    return prisma.ingredientUserOverride.findUnique({
      where: { userId_ingredientId: { userId, ingredientId } },
    });
  }

  async deleteOverride(ingredientId: number, userId: number) {
    const existing = await prisma.ingredientUserOverride.findUnique({
      where: { userId_ingredientId: { userId, ingredientId } },
    });
    if (!existing) return;
    await prisma.ingredientUserOverride.delete({
      where: { userId_ingredientId: { userId, ingredientId } },
    });
  }

  async addVariant(
    ingredientId: number,
    data: CreateVariantDto,
  ): Promise<IngredientVariant> {
    // Si esta variante es default, quitar default de las demás
    if (data.isDefault) {
      await prisma.ingredientVariant.updateMany({
        where: { ingredientId },
        data: { isDefault: false },
      });
    }

    const created = await prisma.ingredientVariant.create({
      data: {
        name: data.name,
        isDefault: data.isDefault ?? false,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        fiber: data.fiber,
        weightFactor: data.weightFactor ?? 1.0,
        ingredientId,
      },
    });
    await this.touchIngredient(ingredientId);
    return created;
  }

  async updateVariant(
    variantId: number,
    data: UpdateVariantDto,
  ): Promise<IngredientVariant | null> {
    const variant = await prisma.ingredientVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) return null;

    // Si esta variante se convierte en default, quitar default de las demás
    if (data.isDefault === true) {
      await prisma.ingredientVariant.updateMany({
        where: { ingredientId: variant.ingredientId, id: { not: variantId } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.ingredientVariant.update({
      where: { id: variantId },
      data: {
        name: data.name,
        isDefault: data.isDefault,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        fiber: data.fiber,
        weightFactor: data.weightFactor,
      },
    });
    await this.touchIngredient(variant.ingredientId);
    return updated;
  }

  async deleteVariant(variantId: number): Promise<boolean> {
    const variant = await prisma.ingredientVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) return false;

    // No permitir borrar si es la única variante
    const count = await prisma.ingredientVariant.count({
      where: { ingredientId: variant.ingredientId },
    });
    if (count <= 1) return false;

    await prisma.ingredientVariant.delete({ where: { id: variantId } });

    // Si era la default, hacer default a la primera que quede
    if (variant.isDefault) {
      const firstVariant = await prisma.ingredientVariant.findFirst({
        where: { ingredientId: variant.ingredientId },
      });
      if (firstVariant) {
        await prisma.ingredientVariant.update({
          where: { id: firstVariant.id },
          data: { isDefault: true },
        });
      }
    }

    await this.touchIngredient(variant.ingredientId);

    return true;
  }

  async getVariants(ingredientId: number): Promise<IngredientVariant[]> {
    return prisma.ingredientVariant.findMany({
      where: { ingredientId },
      orderBy: { isDefault: "desc" },
    });
  }

  // --- Conversion methods ---
  async addConversion(
    ingredientId: number,
    data: CreateUnitConversionDto,
    userId?: number,
    userRole?: string,
  ): Promise<UnitConversion> {
    // Usuario no-admin añadiendo a ingrediente GLOBAL → override personal
    if (userId && userRole !== "ADMIN") {
      const ingredient = await prisma.ingredient.findUnique({
        where: { id: ingredientId },
      });
      if (ingredient && ingredient.status === "GLOBAL") {
        const override = await prisma.ingredientConversionUserOverride.upsert({
          where: {
            userId_ingredientId_unitName: {
              userId,
              ingredientId,
              unitName: data.unitName.toLowerCase(),
            },
          },
          create: {
            userId,
            ingredientId,
            unitName: data.unitName.toLowerCase(),
            gramsPerUnit: data.gramsPerUnit,
          },
          update: { gramsPerUnit: data.gramsPerUnit },
        });
        return {
          id: override.id,
          unitName: override.unitName,
          gramsPerUnit: override.gramsPerUnit,
          ingredientId: override.ingredientId,
          isUserOverride: true,
        };
      }
    }

    const existing = await prisma.unitConversion.findUnique({
      where: {
        ingredientId_unitName: {
          ingredientId,
          unitName: data.unitName.toLowerCase(),
        },
      },
    });

    if (existing) {
      const updated = await prisma.unitConversion.update({
        where: { id: existing.id },
        data: { gramsPerUnit: data.gramsPerUnit },
      });
      await this.touchIngredient(ingredientId);
      return updated;
    }

    const created = await prisma.unitConversion.create({
      data: {
        unitName: data.unitName.toLowerCase(),
        gramsPerUnit: data.gramsPerUnit,
        ingredientId,
      },
    });
    await this.touchIngredient(ingredientId);
    return created;
  }

  async deleteConversionOverride(
    overrideId: number,
    userId: number,
  ): Promise<boolean> {
    const existing = await prisma.ingredientConversionUserOverride.findFirst({
      where: { id: overrideId, userId },
    });
    if (!existing) return false;
    await prisma.ingredientConversionUserOverride.delete({
      where: { id: overrideId },
    });
    return true;
  }

  async updateConversion(
    conversionId: number,
    gramsPerUnit: number,
  ): Promise<UnitConversion | null> {
    const conversion = await prisma.unitConversion.findUnique({
      where: { id: conversionId },
    });
    if (!conversion) return null;

    const updated = await prisma.unitConversion.update({
      where: { id: conversionId },
      data: { gramsPerUnit },
    });
    await this.touchIngredient(conversion.ingredientId);
    return updated;
  }

  async deleteConversion(conversionId: number): Promise<boolean> {
    const conversion = await prisma.unitConversion.findUnique({
      where: { id: conversionId },
      include: {
        ingredient: { select: { status: true, createdByUserId: true } },
      },
    });
    if (!conversion) return false;

    // Si el ingrediente es PENDING y tiene creador, preservar la conversión
    // como ConversionUserOverride para que el creador no la pierda al aprobar
    const ing = (
      conversion as typeof conversion & {
        ingredient: { status: string; createdByUserId: number | null };
      }
    ).ingredient;
    if (ing.status === "PENDING" && ing.createdByUserId) {
      const existing = await prisma.ingredientConversionUserOverride.findFirst({
        where: {
          ingredientId: conversion.ingredientId,
          userId: ing.createdByUserId,
          unitName: conversion.unitName,
        },
      });
      if (!existing) {
        await prisma.ingredientConversionUserOverride.create({
          data: {
            ingredientId: conversion.ingredientId,
            userId: ing.createdByUserId,
            unitName: conversion.unitName,
            gramsPerUnit: conversion.gramsPerUnit,
          },
        });
      }
    }

    await prisma.unitConversion.delete({ where: { id: conversionId } });
    await this.touchIngredient(conversion.ingredientId);
    return true;
  }

  async getConversions(ingredientId: number): Promise<UnitConversion[]> {
    return prisma.unitConversion.findMany({
      where: { ingredientId },
    });
  }

  // Devuelve conversiones globales + overrides personales del usuario (con isUserOverride=true)
  async getConversionsForUser(
    ingredientId: number,
    userId: number,
  ): Promise<UnitConversion[]> {
    const [global, userOverrides] = await Promise.all([
      prisma.unitConversion.findMany({ where: { ingredientId } }),
      prisma.ingredientConversionUserOverride.findMany({
        where: { ingredientId, userId },
      }),
    ]);
    const globalUnitNames = new Set(
      global.map((c) => c.unitName.toLowerCase()),
    );
    const userConversions = userOverrides
      .filter((co) => !globalUnitNames.has(co.unitName.toLowerCase()))
      .map((co) => ({
        id: co.id,
        unitName: co.unitName,
        gramsPerUnit: co.gramsPerUnit,
        ingredientId: co.ingredientId,
        isUserOverride: true as const,
      }));
    return [...global, ...userConversions];
  }

  // --- Nutrition calculation ---
  async getDailyNutrition(userId: number, date: Date): Promise<DailyNutrition> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const plans = await prisma.weekPlan.findMany({
      where: {
        userId,
        type: "meal",
        plannedDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: {
                  include: {
                    conversions: true,
                    variants: true,
                  },
                },
                variant: true,
              },
            },
            components: {
              include: {
                options: {
                  include: {
                    recipe: {
                      include: {
                        ingredients: {
                          include: {
                            ingredient: {
                              include: {
                                conversions: true,
                                variants: true,
                              },
                            },
                            variant: true,
                          },
                        },
                      },
                    },
                    ingredient: {
                      include: {
                        conversions: true,
                        variants: true,
                      },
                    },
                    variant: true,
                  },
                },
              },
            },
          },
        },
        selections: {
          include: {
            option: {
              include: {
                recipe: {
                  include: {
                    ingredients: {
                      include: {
                        ingredient: {
                          include: {
                            conversions: true,
                            variants: true,
                          },
                        },
                        variant: true,
                      },
                    },
                  },
                },
                ingredient: {
                  include: {
                    conversions: true,
                    variants: true,
                  },
                },
                variant: true,
              },
            },
          },
        },
      },
    });

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;

    for (const plan of plans) {
      if (plan.recipe) {
        const servingRatio = plan.servings / plan.recipe.servings;
        const nutrition = this.calculateRecipeNutrition(
          plan.recipe,
          servingRatio,
          plan.selections || [],
        );
        totalCalories += nutrition.calories;
        totalProtein += nutrition.protein;
        totalCarbs += nutrition.carbs;
        totalFat += nutrition.fat;
        totalFiber += nutrition.fiber;
      }
    }

    return {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      fiber: Math.round(totalFiber * 10) / 10,
    };
  }

  private getQuantityInGrams(
    quantity: number,
    usedUnit: string,
    baseUnit: string,
    conversions: any[],
  ): number {
    const u = usedUnit.toLowerCase();
    const base = baseUnit.toLowerCase();

    if (u === base || u === "g" || u === "ml") {
      return quantity;
    }

    if (u === "kg" || u === "l") {
      return quantity * 1000;
    }

    if (conversions && conversions.length > 0) {
      const conversion = conversions.find(
        (c: any) => c.unitName.toLowerCase() === u,
      );
      if (conversion) {
        return quantity * conversion.gramsPerUnit;
      }
    }

    return quantity;
  }

  private getVariantMacros(
    ingredient: any,
    variant: any,
  ): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  } {
    // Si hay variante específica, usar sus macros
    if (variant) {
      return {
        calories: variant.calories || 0,
        protein: variant.protein || 0,
        carbs: variant.carbs || 0,
        fat: variant.fat || 0,
        fiber: variant.fiber || 0,
      };
    }

    // Si no, buscar la variante por defecto del ingrediente
    if (ingredient.variants && ingredient.variants.length > 0) {
      const defaultVariant =
        ingredient.variants.find((v: any) => v.isDefault) ||
        ingredient.variants[0];
      return {
        calories: defaultVariant.calories || 0,
        protein: defaultVariant.protein || 0,
        carbs: defaultVariant.carbs || 0,
        fat: defaultVariant.fat || 0,
        fiber: defaultVariant.fiber || 0,
      };
    }

    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }

  private calculateRecipeNutrition(
    recipe: any,
    ratio: number,
    selections: any[] = [],
  ): DailyNutrition {
    let calories = 0,
      protein = 0,
      carbs = 0,
      fat = 0,
      fiber = 0;

    for (const ri of recipe.ingredients || []) {
      const ing = ri.ingredient;
      const usedUnit = ri.unit || ing.unit;
      const gramsUsed = this.getQuantityInGrams(
        ri.quantity,
        usedUnit,
        ing.unit,
        ing.conversions || [],
      );
      const factor = (gramsUsed / 100) * ratio;

      const macros = this.getVariantMacros(ing, ri.variant);
      calories += macros.calories * factor;
      protein += macros.protein * factor;
      carbs += macros.carbs * factor;
      fat += macros.fat * factor;
      fiber += macros.fiber * factor;
    }

    for (const comp of recipe.components || []) {
      const selectedOption = selections.find((s: any) =>
        comp.options.some((o: any) => o.id === s.optionId),
      );

      const option = selectedOption
        ? comp.options.find((o: any) => o.id === selectedOption.optionId)
        : comp.options.find((o: any) => o.isDefault) || comp.options[0];

      if (!option && comp.isOptional) continue;
      if (!option) continue;

      const optNutrition = this.calculateOptionNutrition(option, ratio);
      calories += optNutrition.calories;
      protein += optNutrition.protein;
      carbs += optNutrition.carbs;
      fat += optNutrition.fat;
      fiber += optNutrition.fiber;
    }

    return { calories, protein, carbs, fat, fiber };
  }

  private calculateOptionNutrition(option: any, ratio: number): DailyNutrition {
    if (option.recipe) {
      const recipeServings = option.recipe.servings || 1;
      const usedServings = option.recipeServings || recipeServings;
      const recipeRatio = ratio * (usedServings / recipeServings);
      return this.calculateRecipeNutrition(option.recipe, recipeRatio, []);
    } else if (option.ingredient) {
      const ing = option.ingredient;
      const usedUnit = option.unit || ing.unit;
      const gramsUsed = this.getQuantityInGrams(
        option.quantity || 1,
        usedUnit,
        ing.unit,
        ing.conversions || [],
      );
      const factor = (gramsUsed / 100) * ratio;

      const macros = this.getVariantMacros(ing, option.variant);
      return {
        calories: macros.calories * factor,
        protein: macros.protein * factor,
        carbs: macros.carbs * factor,
        fat: macros.fat * factor,
        fiber: macros.fiber * factor,
      };
    }
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }
}

export const ingredientService = new IngredientService();
