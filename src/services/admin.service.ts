import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const similarity = (left: string, right: string) => {
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;
  const pairs = (value: string) => {
    const result = new Map<string, number>();
    for (let i = 0; i < value.length - 1; i += 1) {
      const pair = value.slice(i, i + 2);
      result.set(pair, (result.get(pair) ?? 0) + 1);
    }
    return result;
  };
  const a = pairs(left);
  const b = pairs(right);
  let overlap = 0;
  for (const [pair, count] of a) overlap += Math.min(count, b.get(pair) ?? 0);
  return (2 * overlap) / ([...a.values()].reduce((x, y) => x + y, 0) + [...b.values()].reduce((x, y) => x + y, 0));
};

const editableIngredientSelect = {
  id: true,
  name: true,
  status: true,
  unit: true,
  preferredUnit: true,
  imageUrl: true,
  defaultLocation: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  reviewedByUserId: true,
  variants: {
    orderBy: { id: "asc" as const },
    select: {
      id: true,
      name: true,
      isDefault: true,
      isGlobal: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      fiber: true,
      weightFactor: true,
    },
  },
  conversions: {
    orderBy: { id: "asc" as const },
    select: { id: true, unitName: true, gramsPerUnit: true },
  },
  tagAssignments: {
    where: { userId: null },
    orderBy: { id: "asc" as const },
    select: { tag: { select: { id: true, name: true, color: true, isGlobal: true } } },
  },
};

export class AdminService {
  async getAllUsers(
    opts: { page?: number; pageSize?: number; search?: string } = {},
  ) {
    const { page = 1, pageSize = 20, search = "" } = opts;

    // Búsqueda insensible a tildes usando unaccent (extensión PostgreSQL)
    let where: object | undefined;
    if (search) {
      const pattern = `%${search}%`;
      const rows = await prisma.$queryRaw<{ id: number }[]>(
        Prisma.sql`SELECT id FROM "User"
          WHERE unaccent(lower(name)) LIKE unaccent(lower(${pattern}))
             OR unaccent(lower(email)) LIKE unaccent(lower(${pattern}))`
      );
      const ids = rows.map((r) => r.id);
      where = { id: { in: ids } };
    }

    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          imageUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    return { data, total };
  }

  async setRole(userId: number, role: "USER" | "ADMIN") {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async deleteUser(userId: number) {
    await prisma.user.delete({ where: { id: userId } });
  }

  async getPendingIngredients() {
    return prisma.ingredient.findMany({
      where: { status: "PENDING" },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        variants: {
          select: {
            id: true,
            name: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true,
            fiber: true,
            weightFactor: true,
            isDefault: true,
          },
        },
        conversions: {
          select: { id: true, unitName: true, gramsPerUnit: true },
        },
      },
      orderBy: { id: "desc" },
    });
  }

  async getPendingProposals() {
    return prisma.ingredientProposal.findMany({
      where: { status: "PENDING" },
      include: {
        proposedBy: { select: { id: true, name: true, email: true } },
        ingredient: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async getIngredientAudit() {
    const ingredients = await prisma.ingredient.findMany({
      where: { status: { in: ["GLOBAL", "PENDING"] } },
      select: {
        ...editableIngredientSelect,
        createdBy: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            recipes: true,
            componentOptions: true,
            homeItems: true,
            shoppingItems: true,
            weekPlans: true,
            storeItems: true,
            conversions: true,
            minThresholds: true,
            overrides: true,
            conversionOverrides: true,
            tagAssignments: true,
            hiddenTags: true,
            proposals: true,
            shoppingOverrides: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const normalized = ingredients.map((item) => normalizeName(item.name));
    return ingredients.map((ingredient, index) => {
      const duplicateCandidates = ingredients
        .map((candidate, candidateIndex) => ({
          id: candidate.id,
          name: candidate.name,
          score: similarity(normalized[index], normalized[candidateIndex]),
        }))
        .filter((candidate) => candidate.id !== ingredient.id && candidate.score >= 0.82)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      const missingMacros =
        ingredient.variants.length === 0 ||
        ingredient.variants.some((variant) =>
          [variant.calories, variant.protein, variant.carbs, variant.fat, variant.fiber].some(
            (value) => value === null,
          ),
        );
      const issues = [
        ...(!ingredient.imageUrl?.trim() ? ["MISSING_IMAGE"] : []),
        ...(missingMacros ? ["MISSING_MACROS"] : []),
        ...(duplicateCandidates.length ? ["POSSIBLE_DUPLICATE"] : []),
        ...(!ingredient.reviewedAt ? ["UNREVIEWED"] : []),
      ];
      return {
        ...ingredient,
        issues,
        duplicateCandidates,
        usage: {
          recipes: ingredient._count.recipes + ingredient._count.componentOptions,
          home: ingredient._count.homeItems,
          shopping: ingredient._count.shoppingItems,
          weekPlans: ingredient._count.weekPlans,
          stores: ingredient._count.storeItems,
          settings:
            ingredient._count.conversions +
            ingredient._count.minThresholds +
            ingredient._count.overrides +
            ingredient._count.conversionOverrides +
            ingredient._count.tagAssignments +
            ingredient._count.hiddenTags +
            ingredient._count.proposals +
            ingredient._count.shoppingOverrides,
          total: Object.values(ingredient._count).reduce((sum, count) => sum + count, 0),
        },
        _count: undefined,
      };
    });
  }

  async exportIngredients(ids: number[]) {
    const uniqueIds = [...new Set(ids)].filter(Number.isInteger);
    if (!uniqueIds.length || uniqueIds.length > 500) {
      throw { httpCode: 400, message: "Selecciona entre 1 y 500 ingredientes" };
    }
    const ingredients = await prisma.ingredient.findMany({
      where: { id: { in: uniqueIds } },
      select: editableIngredientSelect,
      orderBy: { id: "asc" },
    });
    return {
      format: "ingredient-audit-v1",
      exportedAt: new Date().toISOString(),
      instructions:
        "Edita los valores conservando los id y updatedAt. Para crear variantes, conversiones o tags añade objetos sin id. Omitir elementos nunca los elimina.",
      creationExamples: {
        variant: { name: "Nuevo estado", isDefault: false, calories: null, protein: null, carbs: null, fat: null, fiber: null, weightFactor: 1 },
        conversion: { unitName: "unidad", gramsPerUnit: 100 },
        tag: { name: "Nuevo tag", color: "#64748b" },
      },
      ingredients: ingredients.map(({ tagAssignments, ...ingredient }) => ({
        ...ingredient,
        tags: tagAssignments.map((assignment) => assignment.tag),
      })),
    };
  }

  private async buildIngredientImportPreview(input: any) {
    if (input?.format !== "ingredient-audit-v1" || !Array.isArray(input?.ingredients)) {
      throw { httpCode: 400, message: "Formato no válido; se esperaba ingredient-audit-v1" };
    }
    if (!input.ingredients.length || input.ingredients.length > 500) {
      throw { httpCode: 400, message: "El archivo debe contener entre 1 y 500 ingredientes" };
    }
    const ids = input.ingredients.map((item: any) => Number(item?.id));
    if (ids.some((id: number) => !Number.isInteger(id)) || new Set(ids).size !== ids.length) {
      throw { httpCode: 400, message: "Todos los ingredientes necesitan un id único" };
    }
    const existing = await prisma.ingredient.findMany({
      where: { id: { in: ids } },
      select: {
        ...editableIngredientSelect,
        _count: {
          select: {
            recipes: true,
            componentOptions: true,
            homeItems: true,
            shoppingItems: true,
            weekPlans: true,
            storeItems: true,
            minThresholds: true,
            overrides: true,
            conversionOverrides: true,
            tagAssignments: true,
            hiddenTags: true,
            proposals: true,
            shoppingOverrides: true,
          },
        },
      },
    });
    if (existing.length !== ids.length) {
      const found = new Set(existing.map((item) => item.id));
      throw { httpCode: 404, message: `No existen los ingredientes: ${ids.filter((id: number) => !found.has(id)).join(", ")}` };
    }
    const requestedTagIds = [
      ...new Set(
        input.ingredients.flatMap((item: any) =>
          (item.tags ?? [])
            .filter((tag: any) => tag.id != null)
            .map((tag: any) => Number(tag.id)),
        ),
      ),
    ] as number[];
    const knownTagIds = new Set(
      (await prisma.ingredientTag.findMany({
        where: { id: { in: requestedTagIds } },
        select: { id: true },
      })).map((tag) => tag.id),
    );

    const [recipeRefs, optionRefs, homeRefs, shoppingRefs, shoppingOverrideRefs, thresholdRefs, weekPlanRefs] =
      await Promise.all([
        prisma.recipeIngredient.findMany({
          where: { ingredientId: { in: ids } },
          select: { ingredientId: true, variantId: true, cookedVariantId: true, unit: true },
        }),
        prisma.recipeComponentOption.findMany({
          where: { ingredientId: { in: ids } },
          select: { ingredientId: true, variantId: true, cookedVariantId: true, unit: true },
        }),
        prisma.homeItem.findMany({
          where: { ingredientId: { in: ids } },
          select: { ingredientId: true, variantId: true, unit: true },
        }),
        prisma.shoppingItem.findMany({
          where: { ingredientId: { in: ids } },
          select: { ingredientId: true, unit: true },
        }),
        prisma.shoppingOverride.findMany({
          where: { ingredientId: { in: ids } },
          select: { ingredientId: true, unit: true },
        }),
        prisma.ingredientMinThreshold.findMany({
          where: { ingredientId: { in: ids } },
          select: { ingredientId: true, unit: true },
        }),
        prisma.weekPlan.findMany({
          where: { ingredientId: { in: ids } },
          select: { ingredientId: true, ingredientUnit: true },
        }),
      ]);

    const allowedStatuses = new Set(["GLOBAL", "PENDING", "PRIVATE", "REJECTED"]);
    const normalizeValue = (value: unknown) => value === undefined || value === "" ? null : value;
    const sameValue = (left: unknown, right: unknown) =>
      JSON.stringify(normalizeValue(left)) === JSON.stringify(normalizeValue(right));
    const referencesForUnit = (ingredientId: number, unit: string | null) => {
      if (!unit) return 0;
      return (
        recipeRefs.filter((row) => row.ingredientId === ingredientId && row.unit === unit).length +
        optionRefs.filter((row) => row.ingredientId === ingredientId && row.unit === unit).length +
        homeRefs.filter((row) => row.ingredientId === ingredientId && row.unit === unit).length +
        shoppingRefs.filter((row) => row.ingredientId === ingredientId && row.unit === unit).length +
        shoppingOverrideRefs.filter((row) => row.ingredientId === ingredientId && row.unit === unit).length +
        thresholdRefs.filter((row) => row.ingredientId === ingredientId && row.unit === unit).length +
        weekPlanRefs.filter((row) => row.ingredientId === ingredientId && row.ingredientUnit === unit).length
      );
    };
    const referencesForVariant = (ingredientId: number, variantId: number) =>
      recipeRefs.filter(
        (row) => row.ingredientId === ingredientId &&
          (row.variantId === variantId || row.cookedVariantId === variantId),
      ).length +
      optionRefs.filter(
        (row) => row.ingredientId === ingredientId &&
          (row.variantId === variantId || row.cookedVariantId === variantId),
      ).length +
      homeRefs.filter((row) => row.ingredientId === ingredientId && row.variantId === variantId).length;

    const ingredientPreviews = input.ingredients.map((item: any) => {
      const current = existing.find((candidate) => candidate.id === Number(item.id))!;
      if (!String(item.name ?? "").trim() || !String(item.unit ?? "").trim()) {
        throw { httpCode: 400, message: `El ingrediente ${item.id} necesita nombre y unidad` };
      }
      if (!allowedStatuses.has(item.status)) {
        throw { httpCode: 400, message: `Estado no válido en el ingrediente ${item.id}` };
      }
      if (item.imageUrl && !/^https:\/\//i.test(String(item.imageUrl))) {
        throw { httpCode: 400, message: `La imagen del ingrediente ${item.id} debe usar HTTPS` };
      }
      if (!item.updatedAt || new Date(item.updatedAt).getTime() !== current.updatedAt.getTime()) {
        throw {
          httpCode: 409,
          message: `El ingrediente ${current.name} cambió después de exportarlo. Vuelve a exportarlo antes de importar.`,
        };
      }

      const changes: Array<{
        path: string;
        before: unknown;
        after: unknown;
        impactedReferences: number;
        risk: "normal" | "structural";
      }> = [];
      const addChange = (
        path: string,
        before: unknown,
        after: unknown,
        impactedReferences = 0,
        risk: "normal" | "structural" = "normal",
      ) => {
        if (!sameValue(before, after)) changes.push({ path, before, after, impactedReferences, risk });
      };
      addChange("name", current.name, String(item.name).trim());
      addChange("status", current.status, item.status);
      addChange(
        "unit",
        current.unit,
        String(item.unit).trim(),
        referencesForUnit(current.id, current.unit),
        "structural",
      );
      addChange("preferredUnit", current.preferredUnit, item.preferredUnit || null);
      addChange("imageUrl", current.imageUrl, item.imageUrl || null);
      addChange("defaultLocation", current.defaultLocation, item.defaultLocation || null);

      const currentVariantIds = new Set(current.variants.map((variant) => variant.id));
      const requestedDefaultVariants = (item.variants ?? []).filter((variant: any) => Boolean(variant.isDefault));
      if (requestedDefaultVariants.length > 1) {
        throw { httpCode: 400, message: `${current.name} contiene más de una variante predeterminada en el JSON` };
      }
      for (const [variantIndex, variant] of (item.variants ?? []).entries()) {
        const variantId = variant.id == null ? null : Number(variant.id);
        if (variantId === null) {
          const name = String(variant.name ?? "").trim();
          if (!name) throw { httpCode: 400, message: `Nueva variante sin nombre en ${current.name}` };
          for (const field of ["calories", "protein", "carbs", "fat", "fiber", "weightFactor"] as const) {
            const value = variant[field] ?? (field === "weightFactor" ? 1 : null);
            if (value !== null && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
              throw { httpCode: 400, message: `Valor no válido en la nueva variante ${name}: ${field}` };
            }
          }
          addChange(`variants.new${variantIndex}`, null, {
            name,
            isDefault: Boolean(variant.isDefault),
            calories: variant.calories ?? null,
            protein: variant.protein ?? null,
            carbs: variant.carbs ?? null,
            fat: variant.fat ?? null,
            fiber: variant.fiber ?? null,
            weightFactor: Number(variant.weightFactor ?? 1),
          }, 0, "structural");
          continue;
        }
        if (!currentVariantIds.has(variantId)) {
          throw { httpCode: 400, message: `El ingrediente ${item.id} contiene una variante ajena o nueva` };
        }
        const before = current.variants.find((candidate) => candidate.id === variantId)!;
        const impact = referencesForVariant(current.id, variantId);
        addChange(`variants.${variantId}.name`, before.name, String(variant.name).trim(), impact, "structural");
        addChange(`variants.${variantId}.isDefault`, before.isDefault, Boolean(variant.isDefault), impact, "structural");
        for (const field of ["calories", "protein", "carbs", "fat", "fiber", "weightFactor"] as const) {
          const after = variant[field] ?? (field === "weightFactor" ? 1 : null);
          if (after !== null && (!Number.isFinite(Number(after)) || Number(after) < 0)) {
            throw { httpCode: 400, message: `Valor no válido en ${current.name}, variante ${before.name}: ${field}` };
          }
          addChange(`variants.${variantId}.${field}`, before[field], after, impact, "structural");
        }
      }
      const resultingVariants = [
        ...current.variants.map((variant) => {
          const edited = (item.variants ?? []).find((candidate: any) => Number(candidate.id) === variant.id);
          return edited
            ? { name: String(edited.name).trim(), isDefault: Boolean(edited.isDefault) }
            : { name: variant.name, isDefault: variant.isDefault };
        }),
        ...(item.variants ?? [])
          .filter((variant: any) => variant.id == null)
          .map((variant: any) => ({ name: String(variant.name).trim(), isDefault: Boolean(variant.isDefault) })),
      ];
      if (new Set(resultingVariants.map((variant) => normalizeName(variant.name))).size !== resultingVariants.length) {
        throw { httpCode: 400, message: `${current.name} tendría variantes con nombres duplicados` };
      }
      if (resultingVariants.length > 0 && resultingVariants.filter((variant) => variant.isDefault).length !== 1) {
        throw { httpCode: 400, message: `${current.name} debe tener exactamente una variante predeterminada` };
      }

      const currentConversionIds = new Set(current.conversions.map((conversion) => conversion.id));
      for (const [conversionIndex, conversion] of (item.conversions ?? []).entries()) {
        const conversionId = conversion.id == null ? null : Number(conversion.id);
        const unitName = String(conversion.unitName ?? "").trim();
        const gramsPerUnit = Number(conversion.gramsPerUnit);
        if (!unitName || !Number.isFinite(gramsPerUnit) || gramsPerUnit <= 0) {
          throw { httpCode: 400, message: `Conversión no válida en ${current.name}: ${unitName || "sin nombre"}` };
        }
        if (conversionId === null) {
          addChange(
            `conversions.new${conversionIndex}`,
            null,
            { unitName, gramsPerUnit },
            0,
            "structural",
          );
          continue;
        }
        if (!currentConversionIds.has(conversionId)) {
          throw { httpCode: 400, message: `El ingrediente ${item.id} contiene una conversión ajena o nueva` };
        }
        const before = current.conversions.find((candidate) => candidate.id === conversionId)!;
        const impact = referencesForUnit(current.id, before.unitName);
        addChange(`conversions.${conversionId}.unitName`, before.unitName, unitName, impact, "structural");
        addChange(`conversions.${conversionId}.gramsPerUnit`, before.gramsPerUnit, gramsPerUnit, impact, "structural");
      }
      const resultingConversionNames = [
        ...current.conversions.map((conversion) => {
          const edited = (item.conversions ?? []).find((candidate: any) => Number(candidate.id) === conversion.id);
          return edited ? String(edited.unitName).trim() : conversion.unitName;
        }),
        ...(item.conversions ?? [])
          .filter((conversion: any) => conversion.id == null)
          .map((conversion: any) => String(conversion.unitName).trim()),
      ];
      if (new Set(resultingConversionNames.map(normalizeName)).size !== resultingConversionNames.length) {
        throw { httpCode: 400, message: `${current.name} tendría conversiones con nombres duplicados` };
      }

      const currentTags = current.tagAssignments.map((assignment) => assignment.tag);
      const currentTagIds = new Set(currentTags.map((tag) => tag.id));
      for (const [tagIndex, tag] of (item.tags ?? []).entries()) {
        const tagId = tag.id == null ? null : Number(tag.id);
        const tagName = String(tag.name ?? "").trim();
        if (!tagName) throw { httpCode: 400, message: `Tag sin nombre en ${current.name}` };
        if (tagId !== null && !currentTagIds.has(tagId)) {
          if (!knownTagIds.has(tagId)) throw { httpCode: 400, message: `El tag ${tagId} no existe` };
          addChange(`tags.assign${tagId}`, null, { id: tagId, name: tagName }, 0, "normal");
        } else if (tagId === null) {
          addChange(`tags.new${tagIndex}`, null, { name: tagName, color: tag.color || null }, 0, "normal");
        }
      }

      const omittedVariants = current.variants
        .filter((variant) => !(item.variants ?? []).some((candidate: any) => Number(candidate.id) === variant.id))
        .map((variant) => variant.name);
      const omittedConversions = current.conversions
        .filter((conversion) => !(item.conversions ?? []).some((candidate: any) => Number(candidate.id) === conversion.id))
        .map((conversion) => conversion.unitName);
      const omittedTags = currentTags
        .filter((tag) => !(item.tags ?? []).some((candidate: any) => Number(candidate.id) === tag.id))
        .map((tag) => tag.name);
      const usageTotal = Object.values(current._count).reduce((sum, count) => sum + count, 0);
      return {
        id: current.id,
        name: current.name,
        changes,
        usageTotal,
        omittedPreserved: { variants: omittedVariants, conversions: omittedConversions, tags: omittedTags },
        impactedReferences: Math.max(0, ...changes.map((change) => change.impactedReferences)),
      };
    });
    const changed = ingredientPreviews.filter((item: any) => item.changes.length > 0);
    return {
      valid: true,
      overview: {
        received: input.ingredients.length,
        changed: changed.length,
        unchanged: input.ingredients.length - changed.length,
        totalChanges: changed.reduce((sum: number, item: any) => sum + item.changes.length, 0),
        impactedReferences: changed.reduce(
          (sum: number, item: any) => sum + item.changes.reduce(
            (inner: number, change: any) => inner + change.impactedReferences,
            0,
          ),
          0,
        ),
        structuralChanges: changed.reduce(
          (sum: number, item: any) => sum + item.changes.filter((change: any) => change.risk === "structural").length,
          0,
        ),
      },
      ingredients: ingredientPreviews,
    };
  }

  async importIngredients(input: any, actorUserId: number, dryRun = false) {
    const preview = await this.buildIngredientImportPreview(input);
    if (dryRun) return preview;

    await prisma.$transaction(async (tx) => {
      for (const item of input.ingredients) {
        const itemPreview = preview.ingredients.find((candidate: any) => candidate.id === Number(item.id));
        if (!itemPreview?.changes.length) continue;
        const current = await tx.ingredient.findUnique({
          where: { id: Number(item.id) },
          select: { unit: true, conversions: { select: { id: true, unitName: true } } },
        });
        if (!current) throw { httpCode: 404, message: `Ingrediente ${item.id} no encontrado` };
        const newBaseUnit = String(item.unit).trim();
        if (current.unit !== newBaseUnit) {
          await this.renameIngredientUnitReferences(tx, Number(item.id), current.unit, newBaseUnit);
        }
        await tx.ingredient.update({
          where: { id: item.id },
          data: {
            name: String(item.name).trim(),
            status: item.status,
            unit: String(item.unit).trim(),
            preferredUnit: item.preferredUnit || null,
            imageUrl: item.imageUrl || null,
            defaultLocation: item.defaultLocation || null,
            reviewedAt: new Date(),
            reviewedByUserId: actorUserId,
          },
        });
        const requestedDefault = (item.variants ?? []).find((variant: any) => Boolean(variant.isDefault));
        if (requestedDefault) {
          await tx.ingredientVariant.updateMany({
            where: { ingredientId: Number(item.id), isDefault: true },
            data: { isDefault: false },
          });
        }
        for (const variant of item.variants ?? []) {
          const data = {
            name: String(variant.name).trim(),
            isDefault: Boolean(variant.isDefault),
            calories: variant.calories ?? null,
            protein: variant.protein ?? null,
            carbs: variant.carbs ?? null,
            fat: variant.fat ?? null,
            fiber: variant.fiber ?? null,
            weightFactor: Number(variant.weightFactor ?? 1),
          };
          if (variant.id == null) {
            await tx.ingredientVariant.create({
              data: {
                ...data,
                ingredientId: Number(item.id),
                isGlobal: true,
                createdByUserId: actorUserId,
              },
            });
          } else {
            await tx.ingredientVariant.update({ where: { id: Number(variant.id) }, data });
          }
        }
        for (const conversion of item.conversions ?? []) {
          const before = conversion.id == null
            ? undefined
            : current.conversions.find((candidate) => candidate.id === Number(conversion.id));
          const nextUnitName = String(conversion.unitName).trim();
          if (before && before.unitName !== nextUnitName) {
            await this.renameIngredientUnitReferences(
              tx,
              Number(item.id),
              before.unitName,
              nextUnitName,
            );
          }
          const data = { unitName: nextUnitName, gramsPerUnit: Number(conversion.gramsPerUnit) };
          if (conversion.id == null) {
            await tx.unitConversion.create({ data: { ...data, ingredientId: Number(item.id) } });
          } else {
            await tx.unitConversion.update({ where: { id: Number(conversion.id) }, data });
          }
        }
        for (const tag of item.tags ?? []) {
          let tagId = tag.id == null ? null : Number(tag.id);
          if (tagId === null) {
            const name = String(tag.name).trim();
            const existingTag = await tx.ingredientTag.findFirst({
              where: { name: { equals: name, mode: "insensitive" }, isGlobal: true },
              select: { id: true },
            });
            tagId = existingTag?.id ?? (await tx.ingredientTag.create({
              data: {
                name,
                color: tag.color || null,
                isGlobal: true,
                createdByUserId: actorUserId,
              },
              select: { id: true },
            })).id;
          }
          const assigned = await tx.ingredientTagAssignment.findFirst({
            where: { ingredientId: Number(item.id), tagId, userId: null },
            select: { id: true },
          });
          if (!assigned) {
            await tx.ingredientTagAssignment.create({
              data: { ingredientId: Number(item.id), tagId, userId: null },
            });
          }
        }
        await tx.ingredientAuditLog.create({
          data: {
            ingredientId: item.id,
            actorUserId,
            action: "IMPORTED",
            details: { changes: itemPreview.changes },
          },
        });
      }
    });
    return { ...preview, updated: preview.overview.changed };
  }

  private async renameIngredientUnitReferences(
    tx: Prisma.TransactionClient,
    ingredientId: number,
    oldUnit: string,
    newUnit: string,
  ) {
    await tx.recipeIngredient.updateMany({
      where: { ingredientId, unit: oldUnit },
      data: { unit: newUnit },
    });
    await tx.recipeComponentOption.updateMany({
      where: { ingredientId, unit: oldUnit },
      data: { unit: newUnit },
    });
    await tx.homeItem.updateMany({ where: { ingredientId, unit: oldUnit }, data: { unit: newUnit } });
    await tx.shoppingItem.updateMany({ where: { ingredientId, unit: oldUnit }, data: { unit: newUnit } });
    await tx.shoppingOverride.updateMany({ where: { ingredientId, unit: oldUnit }, data: { unit: newUnit } });
    await tx.ingredientMinThreshold.updateMany({ where: { ingredientId, unit: oldUnit }, data: { unit: newUnit } });
    await tx.weekPlan.updateMany({
      where: { ingredientId, ingredientUnit: oldUnit },
      data: { ingredientUnit: newUnit },
    });
  }

  async markIngredientReviewed(id: number, actorUserId: number) {
    return prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.update({
        where: { id },
        data: { reviewedAt: new Date(), reviewedByUserId: actorUserId },
        select: { id: true, reviewedAt: true, reviewedByUserId: true },
      });
      await tx.ingredientAuditLog.create({
        data: { ingredientId: id, actorUserId, action: "REVIEWED" },
      });
      return ingredient;
    });
  }

  async mergeIngredients(targetId: number, sourceIds: number[], actorUserId: number) {
    const sources = [...new Set(sourceIds)].filter((id) => id !== targetId && Number.isInteger(id));
    if (!Number.isInteger(targetId) || !sources.length) {
      throw { httpCode: 400, message: "Indica un destino y al menos un origen distinto" };
    }
    const ids = [targetId, ...sources];
    const found = await prisma.ingredient.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    if (found.length !== ids.length) throw { httpCode: 404, message: "Algún ingrediente ya no existe" };
    const mergeSummary = {
      preservedVariants: [] as Array<{ id: number; from: string; as: string }>,
      preservedConversions: [] as Array<{ id: number; from: string; as: string; gramsPerUnit: number }>,
      collapsedVariants: 0,
      collapsedConversions: 0,
    };

    return prisma.$transaction(async (tx) => {
      for (const sourceId of sources) {
        const targetVariants = await tx.ingredientVariant.findMany({ where: { ingredientId: targetId } });
        const sourceVariants = await tx.ingredientVariant.findMany({ where: { ingredientId: sourceId } });
        const sourceIngredientName = found.find((item) => item.id === sourceId)?.name ?? String(sourceId);
        const usedVariantNames = new Set(targetVariants.map((variant) => normalizeName(variant.name)));
        for (const sourceVariant of sourceVariants) {
          const match = targetVariants.find((variant) => normalizeName(variant.name) === normalizeName(sourceVariant.name));
          const sameNutrition = match &&
            ["calories", "protein", "carbs", "fat", "fiber", "weightFactor"].every(
              (field) => (match as any)[field] === (sourceVariant as any)[field],
            );
          if (match && sameNutrition) {
            mergeSummary.collapsedVariants += 1;
            await tx.$executeRaw`UPDATE "RecipeIngredient" SET "variantId" = ${match.id} WHERE "variantId" = ${sourceVariant.id}`;
            await tx.$executeRaw`UPDATE "RecipeIngredient" SET "cookedVariantId" = ${match.id} WHERE "cookedVariantId" = ${sourceVariant.id}`;
            await tx.$executeRaw`UPDATE "RecipeComponentOption" SET "variantId" = ${match.id} WHERE "variantId" = ${sourceVariant.id}`;
            await tx.$executeRaw`UPDATE "RecipeComponentOption" SET "cookedVariantId" = ${match.id} WHERE "cookedVariantId" = ${sourceVariant.id}`;
            await tx.$executeRaw`UPDATE "HomeItem" SET "variantId" = ${match.id} WHERE "variantId" = ${sourceVariant.id}`;
            await tx.$executeRaw`UPDATE "IngredientProposal" SET "variantId" = ${match.id} WHERE "variantId" = ${sourceVariant.id}`;
            await tx.$executeRaw`
              DELETE FROM "IngredientVariantUserOverride" s
              WHERE s."variantId" = ${sourceVariant.id}
                AND EXISTS (SELECT 1 FROM "IngredientVariantUserOverride" t WHERE t."variantId" = ${match.id} AND t."userId" = s."userId")`;
            await tx.$executeRaw`UPDATE "IngredientVariantUserOverride" SET "variantId" = ${match.id} WHERE "variantId" = ${sourceVariant.id}`;
            await tx.ingredientVariant.delete({ where: { id: sourceVariant.id } });
          } else if (match) {
            const baseName = `${sourceVariant.name} (${sourceIngredientName})`;
            let preservedName = baseName;
            let suffix = 2;
            while (usedVariantNames.has(normalizeName(preservedName))) {
              preservedName = `${baseName} ${suffix}`;
              suffix += 1;
            }
            await tx.ingredientVariant.update({
              where: { id: sourceVariant.id },
              data: { ingredientId: targetId, name: preservedName, isDefault: false },
            });
            mergeSummary.preservedVariants.push({
              id: sourceVariant.id,
              from: sourceVariant.name,
              as: preservedName,
            });
            usedVariantNames.add(normalizeName(preservedName));
          } else {
            await tx.ingredientVariant.update({ where: { id: sourceVariant.id }, data: { ingredientId: targetId } });
            usedVariantNames.add(normalizeName(sourceVariant.name));
          }
        }

        const conflicts = await tx.$queryRaw<{ sourceId: number; targetId: number; recipeId: number }[]>`
          SELECT s.id AS "sourceId", t.id AS "targetId", s."recipeId"
          FROM "RecipeIngredient" s
          JOIN "RecipeIngredient" t ON t."recipeId" = s."recipeId" AND t."ingredientId" = ${targetId}
          WHERE s."ingredientId" = ${sourceId}
            AND (s.unit IS DISTINCT FROM t.unit OR s."variantId" IS DISTINCT FROM t."variantId" OR s."cookedVariantId" IS DISTINCT FROM t."cookedVariantId")`;
        if (conflicts.length) {
          throw {
            httpCode: 409,
            message: `No se puede unificar: ${conflicts.length} receta(s) usan ambos ingredientes con unidades o variantes distintas`,
            conflicts,
          };
        }
        await tx.$executeRaw`
          UPDATE "RecipeIngredient" t SET quantity = t.quantity + s.quantity
          FROM "RecipeIngredient" s
          WHERE s."ingredientId" = ${sourceId} AND t."ingredientId" = ${targetId} AND t."recipeId" = s."recipeId"`;
        await tx.$executeRaw`DELETE FROM "RecipeIngredient" s WHERE s."ingredientId" = ${sourceId} AND EXISTS (SELECT 1 FROM "RecipeIngredient" t WHERE t."ingredientId" = ${targetId} AND t."recipeId" = s."recipeId")`;

        // Resolver conversiones antes de cambiar ingredientId en sus usos. Así podemos
        // renombrar únicamente las referencias del origen cuando el destino tiene una
        // conversión homónima pero con una equivalencia distinta.
        const targetConversions = await tx.unitConversion.findMany({ where: { ingredientId: targetId } });
        const sourceConversions = await tx.unitConversion.findMany({ where: { ingredientId: sourceId } });
        const usedConversionNames = new Set(targetConversions.map((conversion) => normalizeName(conversion.unitName)));
        for (const sourceConversion of sourceConversions) {
          const match = targetConversions.find(
            (conversion) => normalizeName(conversion.unitName) === normalizeName(sourceConversion.unitName),
          );
          if (match && match.gramsPerUnit === sourceConversion.gramsPerUnit) {
            mergeSummary.collapsedConversions += 1;
            await tx.unitConversion.delete({ where: { id: sourceConversion.id } });
          } else if (match) {
            const baseName = `${sourceConversion.unitName} (${sourceIngredientName})`;
            let preservedName = baseName;
            let suffix = 2;
            while (usedConversionNames.has(normalizeName(preservedName))) {
              preservedName = `${baseName} ${suffix}`;
              suffix += 1;
            }
            await this.renameIngredientUnitReferences(
              tx,
              sourceId,
              sourceConversion.unitName,
              preservedName,
            );
            await tx.unitConversion.update({
              where: { id: sourceConversion.id },
              data: { ingredientId: targetId, unitName: preservedName },
            });
            mergeSummary.preservedConversions.push({
              id: sourceConversion.id,
              from: sourceConversion.unitName,
              as: preservedName,
              gramsPerUnit: sourceConversion.gramsPerUnit,
            });
            usedConversionNames.add(normalizeName(preservedName));
          } else {
            await tx.unitConversion.update({
              where: { id: sourceConversion.id },
              data: { ingredientId: targetId },
            });
            usedConversionNames.add(normalizeName(sourceConversion.unitName));
          }
        }

        const plainTables = ["RecipeIngredient", "RecipeComponentOption", "HomeItem", "ShoppingItem", "WeekPlan", "StockAlert", "IngredientProposal"];
        for (const table of plainTables) {
          await tx.$executeRawUnsafe(`UPDATE "${table}" SET "ingredientId" = $1 WHERE "ingredientId" = $2`, targetId, sourceId);
        }
        const dedupeTables: Array<[string, string]> = [
          ["ShoppingOverride", 's."userId" = t."userId"'],
          ["IngredientUserOverride", 's."userId" = t."userId"'],
          ["IngredientConversionUserOverride", 's."userId" = t."userId" AND s."unitName" = t."unitName"'],
          ["IngredientTagAssignment", 's."tagId" = t."tagId" AND s."userId" IS NOT DISTINCT FROM t."userId"'],
          ["IngredientTagHidden", 's."userId" = t."userId" AND s."tagId" = t."tagId"'],
          ["UserStoreIngredient", 's."storeId" = t."storeId" AND s."userId" = t."userId"'],
        ];
        for (const [table, match] of dedupeTables) {
          await tx.$executeRawUnsafe(`DELETE FROM "${table}" s WHERE s."ingredientId" = $1 AND EXISTS (SELECT 1 FROM "${table}" t WHERE t."ingredientId" = $2 AND ${match})`, sourceId, targetId);
          await tx.$executeRawUnsafe(`UPDATE "${table}" SET "ingredientId" = $1 WHERE "ingredientId" = $2`, targetId, sourceId);
        }
        await tx.$executeRawUnsafe(`DELETE FROM "IngredientMinThreshold" s WHERE s."ingredientId" = $1 AND EXISTS (SELECT 1 FROM "IngredientMinThreshold" t WHERE t."ingredientId" = $2 AND ((s."userId" IS NOT NULL AND s."userId" = t."userId") OR (s."householdId" IS NOT NULL AND s."householdId" = t."householdId")))`, sourceId, targetId);
        await tx.$executeRaw`UPDATE "IngredientMinThreshold" SET "ingredientId" = ${targetId} WHERE "ingredientId" = ${sourceId}`;
        await tx.ingredient.delete({ where: { id: sourceId } });
      }
      await tx.ingredient.update({
        where: { id: targetId },
        data: { reviewedAt: new Date(), reviewedByUserId: actorUserId },
      });
      await tx.ingredientAuditLog.create({
        data: {
          ingredientId: targetId,
          actorUserId,
          action: "MERGED",
          details: {
            sourceIds: sources,
            sourceNames: found.filter((item) => sources.includes(item.id)),
            ...mergeSummary,
          },
        },
      });
      return { targetId, mergedIds: sources, summary: mergeSummary };
    });
  }
}

export const adminService = new AdminService();
