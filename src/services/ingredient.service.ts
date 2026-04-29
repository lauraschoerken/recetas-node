import { PrismaClient } from "@prisma/client";
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
};

export interface DailyNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export class IngredientService {
  async getAll(
    opts: {
      page?: number;
      pageSize?: number;
      search?: string;
      userId?: number;
    } = {},
  ): Promise<{ data: Ingredient[]; total: number }> {
    const { page, pageSize, search = "", userId } = opts;
    // Mostrar ingredientes GLOBAL + los propios (PRIVATE/PENDING) del usuario
    const statusFilter = userId
      ? { OR: [{ status: "GLOBAL" }, { createdByUserId: userId }] }
      : { status: "GLOBAL" };
    const searchFilter = search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {};
    const where = { ...statusFilter, ...searchFilter };
    const [data, total] = await prisma.$transaction([
      prisma.ingredient.findMany({
        where,
        orderBy: { name: "asc" },
        include: ingredientInclude,
        ...(page && pageSize
          ? { skip: (page - 1) * pageSize, take: pageSize }
          : {}),
      }),
      prisma.ingredient.count({ where }),
    ]);
    return { data, total };
  }

  async search(query: string, userId?: number): Promise<Ingredient[]> {
    const statusFilter = userId
      ? { OR: [{ status: "GLOBAL" }, { createdByUserId: userId }] }
      : { status: "GLOBAL" };
    return prisma.ingredient.findMany({
      where: {
        ...statusFilter,
        name: {
          contains: query.toLowerCase(),
          mode: "insensitive",
        },
      },
      take: 10,
      orderBy: { name: "asc" },
      include: ingredientInclude,
    });
  }

  async create(
    data: CreateIngredientDto,
    userId?: number,
  ): Promise<Ingredient> {
    const trimmed = data.name.trim();
    const normalizedName =
      trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    const unit = data.unit === "ml" ? "ml" : "g";

    // Buscar ingrediente GLOBAL existente con el mismo nombre
    const existing = await prisma.ingredient.findFirst({
      where: {
        name: { equals: normalizedName, mode: "insensitive" },
        status: "GLOBAL",
      },
      include: ingredientInclude,
    });

    if (existing) {
      return prisma.ingredient.update({
        where: { id: existing.id },
        data: {
          name: normalizedName, // Update to capitalized version
          unit: unit,
          imageUrl: data.imageUrl ?? existing.imageUrl,
          defaultLocation: data.defaultLocation ?? existing.defaultLocation,
        },
        include: ingredientInclude,
      });
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name: normalizedName,
        unit: unit,
        imageUrl: data.imageUrl,
        defaultLocation: data.defaultLocation || null,
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
          ingredientId: ingredient.id,
        },
      });
    }

    return prisma.ingredient.findUnique({
      where: { id: ingredient.id },
      include: ingredientInclude,
    }) as Promise<Ingredient>;
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
  ): Promise<Ingredient | null> {
    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) return null;

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

  async delete(id: number): Promise<boolean> {
    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) return false;

    await prisma.ingredient.delete({ where: { id } });
    return true;
  }

  async getById(id: number): Promise<Ingredient | null> {
    return prisma.ingredient.findUnique({
      where: { id },
      include: ingredientInclude,
    });
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

    return prisma.ingredientVariant.create({
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

    return prisma.ingredientVariant.update({
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
  ): Promise<UnitConversion> {
    const existing = await prisma.unitConversion.findUnique({
      where: {
        ingredientId_unitName: {
          ingredientId,
          unitName: data.unitName.toLowerCase(),
        },
      },
    });

    if (existing) {
      return prisma.unitConversion.update({
        where: { id: existing.id },
        data: { gramsPerUnit: data.gramsPerUnit },
      });
    }

    return prisma.unitConversion.create({
      data: {
        unitName: data.unitName.toLowerCase(),
        gramsPerUnit: data.gramsPerUnit,
        ingredientId,
      },
    });
  }

  async updateConversion(
    conversionId: number,
    gramsPerUnit: number,
  ): Promise<UnitConversion | null> {
    const conversion = await prisma.unitConversion.findUnique({
      where: { id: conversionId },
    });
    if (!conversion) return null;

    return prisma.unitConversion.update({
      where: { id: conversionId },
      data: { gramsPerUnit },
    });
  }

  async deleteConversion(conversionId: number): Promise<boolean> {
    const conversion = await prisma.unitConversion.findUnique({
      where: { id: conversionId },
    });
    if (!conversion) return false;

    await prisma.unitConversion.delete({ where: { id: conversionId } });
    return true;
  }

  async getConversions(ingredientId: number): Promise<UnitConversion[]> {
    return prisma.unitConversion.findMany({
      where: { ingredientId },
    });
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
