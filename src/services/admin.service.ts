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
        "Edita los valores conservando los id. La importación actualiza únicamente estos ingredientes y sus variantes/conversiones incluidas; no crea ni elimina registros.",
      ingredients,
    };
  }

  async importIngredients(input: any, actorUserId: number, dryRun = false) {
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
      select: { id: true, variants: { select: { id: true } }, conversions: { select: { id: true } } },
    });
    if (existing.length !== ids.length) {
      const found = new Set(existing.map((item) => item.id));
      throw { httpCode: 404, message: `No existen los ingredientes: ${ids.filter((id: number) => !found.has(id)).join(", ")}` };
    }
    const allowedStatuses = new Set(["GLOBAL", "PENDING", "PRIVATE", "REJECTED"]);
    for (const item of input.ingredients) {
      if (!String(item.name ?? "").trim() || !String(item.unit ?? "").trim()) {
        throw { httpCode: 400, message: `El ingrediente ${item.id} necesita nombre y unidad` };
      }
      if (!allowedStatuses.has(item.status)) {
        throw { httpCode: 400, message: `Estado no válido en el ingrediente ${item.id}` };
      }
      if (item.imageUrl && !/^https:\/\//i.test(String(item.imageUrl))) {
        throw { httpCode: 400, message: `La imagen del ingrediente ${item.id} debe usar HTTPS` };
      }
      const row = existing.find((candidate) => candidate.id === item.id)!;
      const variantIds = new Set(row.variants.map((variant) => variant.id));
      if ((item.variants ?? []).some((variant: any) => !variantIds.has(Number(variant.id)))) {
        throw { httpCode: 400, message: `El ingrediente ${item.id} contiene una variante ajena o nueva` };
      }
      const conversionIds = new Set(row.conversions.map((conversion) => conversion.id));
      if ((item.conversions ?? []).some((conversion: any) => !conversionIds.has(Number(conversion.id)))) {
        throw { httpCode: 400, message: `El ingrediente ${item.id} contiene una conversión ajena o nueva` };
      }
    }
    if (dryRun) return { valid: true, updated: input.ingredients.length };

    await prisma.$transaction(async (tx) => {
      for (const item of input.ingredients) {
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
        for (const variant of item.variants ?? []) {
          await tx.ingredientVariant.update({
            where: { id: Number(variant.id) },
            data: {
              name: String(variant.name).trim(),
              isDefault: Boolean(variant.isDefault),
              calories: variant.calories ?? null,
              protein: variant.protein ?? null,
              carbs: variant.carbs ?? null,
              fat: variant.fat ?? null,
              fiber: variant.fiber ?? null,
              weightFactor: Number(variant.weightFactor ?? 1),
            },
          });
        }
        for (const conversion of item.conversions ?? []) {
          await tx.unitConversion.update({
            where: { id: Number(conversion.id) },
            data: {
              unitName: String(conversion.unitName).trim(),
              gramsPerUnit: Number(conversion.gramsPerUnit),
            },
          });
        }
        await tx.ingredientAuditLog.create({
          data: { ingredientId: item.id, actorUserId, action: "IMPORTED" },
        });
      }
    });
    return { valid: true, updated: input.ingredients.length };
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

    return prisma.$transaction(async (tx) => {
      for (const sourceId of sources) {
        const targetVariants = await tx.ingredientVariant.findMany({ where: { ingredientId: targetId } });
        const sourceVariants = await tx.ingredientVariant.findMany({ where: { ingredientId: sourceId } });
        for (const sourceVariant of sourceVariants) {
          const match = targetVariants.find((variant) => normalizeName(variant.name) === normalizeName(sourceVariant.name));
          if (match) {
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
          } else {
            await tx.ingredientVariant.update({ where: { id: sourceVariant.id }, data: { ingredientId: targetId } });
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
        await tx.unitConversion.deleteMany({ where: { ingredientId: sourceId, unitName: { in: (await tx.unitConversion.findMany({ where: { ingredientId: targetId }, select: { unitName: true } })).map((row) => row.unitName) } } });
        await tx.unitConversion.updateMany({ where: { ingredientId: sourceId }, data: { ingredientId: targetId } });
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
          details: { sourceIds: sources, sourceNames: found.filter((item) => sources.includes(item.id)) },
        },
      });
      return { targetId, mergedIds: sources };
    });
  }
}

export const adminService = new AdminService();
