import { PrismaClient } from "@prisma/client";
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  RecipeWithComponents,
} from "../domain";

const prisma = new PrismaClient();

const recipeInclude = {
  ingredients: {
    include: {
      ingredient: {
        include: {
          conversions: true,
          variants: true,
        },
      },
      variant: true,
      cookedVariant: true,
    },
  },
  components: {
    orderBy: { sortOrder: "asc" as const },
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
                  cookedVariant: true,
                },
              },
              components: {
                orderBy: { sortOrder: "asc" as const },
                include: {
                  options: {
                    include: {
                      ingredient: {
                        include: {
                          conversions: true,
                          variants: true,
                        },
                      },
                      variant: true,
                      cookedVariant: true,
                    },
                  },
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
          cookedVariant: true,
        },
      },
    },
  },
  user: {
    select: { name: true },
  },
};

export class RecipeService {
  async getAll(
    userId: number,
    opts: {
      page?: number;
      pageSize?: number;
      search?: string;
      visibility?: string;
      ingredient?: string;
    } = {},
  ): Promise<{ data: RecipeWithComponents[]; total: number }> {
    const {
      page,
      pageSize,
      search = "",
      visibility = "all",
      ingredient = "",
    } = opts;

    // Filtro de visibilidad
    let visibilityFilter: object;
    if (visibility === "public") {
      visibilityFilter = { isPublic: true };
    } else if (visibility === "mine") {
      visibilityFilter = { userId };
    } else if (visibility === "private") {
      visibilityFilter = { userId, isPublic: false };
    } else {
      visibilityFilter = { OR: [{ userId }, { isPublic: true }] };
    }

    const where = {
      AND: [
        visibilityFilter,
        ...(search
          ? [{ title: { contains: search, mode: "insensitive" as const } }]
          : []),
        ...(ingredient
          ? [
              {
                ingredients: {
                  some: {
                    ingredient: {
                      name: {
                        contains: ingredient,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                },
              },
            ]
          : []),
      ],
    };
    const [recipes, total] = await prisma.$transaction([
      prisma.recipe.findMany({
        where,
        include: recipeInclude,
        orderBy: { createdAt: "desc" },
        ...(page && pageSize
          ? { skip: (page - 1) * pageSize, take: pageSize }
          : {}),
      }),
      prisma.recipe.count({ where }),
    ]);
    return { data: recipes.map((r) => this.mapRecipe(r, r.user.name)), total };
  }

  async getById(
    id: number,
    userId: number,
  ): Promise<RecipeWithComponents | null> {
    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        OR: [{ userId }, { isPublic: true }],
      },
      include: recipeInclude,
    });

    if (!recipe) return null;

    const mapped = this.mapRecipe(recipe, recipe.user.name);
    return mapped;
  }

  async create(
    data: CreateRecipeDto,
    userId: number,
  ): Promise<RecipeWithComponents> {
    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error(`User with id ${userId} does not exist`);
    }

    // Paso 1: Preparar ingredientes si existen
    const ingredientData: {
      quantity: number;
      unit: string;
      ingredientId: number;
      variantId: number | null;
      cookedVariantId: number | null;
    }[] = [];
    const validIngredients = (data.ingredients || []).filter(
      (ing) => ing.name && ing.name.trim() !== "",
    );

    for (const ing of validIngredients) {
      const ingredient = await this.getOrCreateIngredient(ing.name, ing.unit);
      let variantId = (ing as any).variantId || null;
      let cookedVariantId = (ing as any).cookedVariantId || null;

      // Si no se especifica variante, usar la por defecto
      if (!variantId) {
        const variants = await prisma.ingredientVariant.findMany({
          where: { ingredientId: ingredient.id },
        });
        const defaultVariant = variants.find((v) => v.isDefault) || variants[0];
        variantId = defaultVariant?.id || null;
      }

      ingredientData.push({
        quantity: ing.quantity,
        unit: ing.unit,
        ingredientId: ingredient.id,
        variantId,
        cookedVariantId,
      });
    }

    // Paso 2: Crear la receta base (sin relaciones anidadas)
    const recipeData: any = {
      title: data.title,
      description: data.description || null,
      instructions: data.instructions || null,
      imageUrl: data.imageUrl || null,
      cookTimeMinutes: data.cookTimeMinutes || null,
      difficulty: data.difficulty || null,
      servings: data.servings || 4,
      isPublic: data.isPublic || false,
      userId,
      // Macros manuales
      customCalories: (data as any).customCalories || null,
      customProtein: (data as any).customProtein || null,
      customCarbs: (data as any).customCarbs || null,
      customFat: (data as any).customFat || null,
      customFiber: (data as any).customFiber || null,
      defaultLocation: data.defaultLocation || null,
    };

    const recipe = await prisma.recipe.create({
      data: recipeData,
    });

    // Paso 2.5: Crear ingredientes por separado
    for (const ing of ingredientData) {
      await prisma.recipeIngredient.create({
        data: {
          recipeId: recipe.id,
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          variantId: ing.variantId,
          cookedVariantId: ing.cookedVariantId,
        },
      });
    }

    // Paso 3: Crear componentes si existen
    if (data.components && data.components.length > 0) {
      for (let i = 0; i < data.components.length; i++) {
        const comp = data.components[i];

        // Crear el componente
        const component = await prisma.recipeComponent.create({
          data: {
            name: comp.name,
            sortOrder: comp.sortOrder ?? i,
            isOptional: comp.isOptional || false,
            defaultEnabled: comp.defaultEnabled !== false,
            recipeId: recipe.id,
          },
        });

        // Crear las opciones del componente
        if (comp.options && comp.options.length > 0) {
          for (const opt of comp.options) {
            let ingredientId: number | null = null;
            let variantId: number | null = null;
            let cookedVariantId: number | null =
              (opt as any).cookedVariantId || null;

            if (opt.ingredientName) {
              const ingredient = await this.getOrCreateIngredient(
                opt.ingredientName,
                opt.unit || "g",
              );
              ingredientId = ingredient.id;

              // Obtener la variante por defecto
              const variants = await prisma.ingredientVariant.findMany({
                where: { ingredientId: ingredient.id },
              });
              const defaultVariant =
                variants.find((v) => v.isDefault) || variants[0];
              variantId = defaultVariant?.id || null;
            }

            await prisma.recipeComponentOption.create({
              data: {
                name: opt.name,
                isDefault: opt.isDefault || false,
                componentId: component.id,
                recipeId:
                  opt.recipeId && opt.recipeId !== recipe.id
                    ? opt.recipeId
                    : null,
                ingredientId,
                variantId,
                cookedVariantId,
                quantity: opt.quantity || null,
                unit: opt.unit || null,
                recipeServings: opt.recipeServings || null,
              },
            });
          }
        }
      }
    }

    // Paso 4: Recargar y devolver la receta completa
    const fullRecipe = await prisma.recipe.findUnique({
      where: { id: recipe.id },
      include: recipeInclude,
    });

    return this.mapRecipe(fullRecipe!, fullRecipe!.user.name);
  }

  async update(
    id: number,
    data: UpdateRecipeDto,
    userId: number,
  ): Promise<RecipeWithComponents | null> {
    const existing = await prisma.recipe.findFirst({
      where: { id, userId },
    });

    if (!existing) return null;

    // Eliminar ingredientes existentes si se envían nuevos
    if (data.ingredients) {
      await prisma.recipeIngredient.deleteMany({
        where: { recipeId: id },
      });
    }

    // Eliminar componentes existentes si se envían nuevos
    if (data.components) {
      await prisma.recipeComponent.deleteMany({
        where: { recipeId: id },
      });
    }

    // Preparar ingredientes si existen
    const ingredientData: {
      quantity: number;
      unit: string;
      ingredientId: number;
      variantId: number | null;
      cookedVariantId: number | null;
    }[] = [];
    if (data.ingredients && data.ingredients.length > 0) {
      for (const ing of data.ingredients) {
        const ingredient = await this.getOrCreateIngredient(ing.name, ing.unit);

        let variantId = (ing as any).variantId || null;
        let cookedVariantId = (ing as any).cookedVariantId || null;

        // Si no se especifica variante de compra, usar la por defecto
        if (!variantId) {
          const variants = await prisma.ingredientVariant.findMany({
            where: { ingredientId: ingredient.id },
          });
          const defaultVariant =
            variants.find((v) => v.isDefault) || variants[0];
          variantId = defaultVariant?.id || null;
        }

        ingredientData.push({
          quantity: ing.quantity,
          unit: ing.unit,
          ingredientId: ingredient.id,
          variantId,
          cookedVariantId,
        });
      }
    }

    // Actualizar receta base
    await prisma.recipe.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        imageUrl: data.imageUrl,
        cookTimeMinutes: data.cookTimeMinutes,
        difficulty: data.difficulty,
        servings: data.servings,
        isPublic: data.isPublic,
        // Macros manuales
        customCalories: (data as any).customCalories,
        customProtein: (data as any).customProtein,
        customCarbs: (data as any).customCarbs,
        customFat: (data as any).customFat,
        customFiber: (data as any).customFiber,
        defaultLocation: data.defaultLocation,
        ...(ingredientData.length > 0 && {
          ingredients: {
            create: ingredientData,
          },
        }),
      },
    });

    // Crear componentes si existen
    if (data.components && data.components.length > 0) {
      for (let i = 0; i < data.components.length; i++) {
        const comp = data.components[i];

        const component = await prisma.recipeComponent.create({
          data: {
            name: comp.name,
            sortOrder: comp.sortOrder ?? i,
            isOptional: comp.isOptional || false,
            defaultEnabled: comp.defaultEnabled !== false,
            recipeId: id,
          },
        });

        if (comp.options && comp.options.length > 0) {
          for (const opt of comp.options) {
            let ingredientId: number | null = null;
            let variantId: number | null = null;
            let cookedVariantId: number | null =
              (opt as any).cookedVariantId || null;

            if (opt.ingredientName) {
              const ingredient = await this.getOrCreateIngredient(
                opt.ingredientName,
                opt.unit || "g",
              );
              ingredientId = ingredient.id;

              // Obtener la variante por defecto
              const variants = await prisma.ingredientVariant.findMany({
                where: { ingredientId: ingredient.id },
              });
              const defaultVariant =
                variants.find((v) => v.isDefault) || variants[0];
              variantId = defaultVariant?.id || null;
            }

            await prisma.recipeComponentOption.create({
              data: {
                name: opt.name,
                isDefault: opt.isDefault || false,
                componentId: component.id,
                recipeId:
                  opt.recipeId && opt.recipeId !== id ? opt.recipeId : null,
                ingredientId,
                variantId,
                cookedVariantId,
                quantity: opt.quantity || null,
                unit: opt.unit || null,
                recipeServings: opt.recipeServings || null,
              },
            });
          }
        }
      }
    }

    // Recargar y devolver
    const fullRecipe = await prisma.recipe.findUnique({
      where: { id },
      include: recipeInclude,
    });

    return this.mapRecipe(fullRecipe!, fullRecipe!.user.name);
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const existing = await prisma.recipe.findFirst({
      where: { id, userId },
    });

    if (!existing) return false;

    await prisma.recipe.delete({
      where: { id },
    });

    return true;
  }

  private async getOrCreateIngredient(name: string, unit: string) {
    const trimmed = name.trim();
    const normalizedName =
      trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

    // Buscar primero de forma case-insensitive
    let ingredient = await prisma.ingredient.findFirst({
      where: {
        name: { equals: normalizedName, mode: "insensitive" },
      },
      include: { variants: true },
    });

    if (!ingredient) {
      const baseUnit = unit === "g" || unit === "ml" ? unit : "g";
      ingredient = await prisma.ingredient.create({
        data: {
          name: normalizedName,
          unit: baseUnit,
          variants: {
            create: {
              name: "Crudo",
              isDefault: true,
            },
          },
        },
        include: { variants: true },
      });
    } else if (!ingredient.variants || ingredient.variants.length === 0) {
      // Si existe pero no tiene variantes, crear la variante por defecto
      await prisma.ingredientVariant.create({
        data: {
          name: "Crudo",
          isDefault: true,
          ingredientId: ingredient.id,
        },
      });
    }

    return ingredient;
  }

  private getQuantityInGrams(
    quantity: number,
    usedUnit: string,
    baseUnit: string,
    conversions: any[],
  ): number {
    const u = usedUnit.toLowerCase().trim();
    const base = baseUnit.toLowerCase().trim();

    if (u === base || u === "g" || u === "ml") {
      return quantity;
    }

    if (u === "kg" || u === "l") {
      return quantity * 1000;
    }

    if (conversions && conversions.length > 0) {
      // Coincidencia exacta
      const exact = conversions.find(
        (c: any) => c.unitName.toLowerCase() === u,
      );
      if (exact) return quantity * exact.gramsPerUnit;

      // Normalizar plural→singular: "unidades"→"unidad", "cucharadas"→"cucharada"
      const singular = u.endsWith("es")
        ? u.slice(0, -2)
        : u.endsWith("s")
          ? u.slice(0, -1)
          : null;
      if (singular) {
        const fuzzy = conversions.find(
          (c: any) => c.unitName.toLowerCase() === singular,
        );
        if (fuzzy) return quantity * fuzzy.gramsPerUnit;
      }

      // Normalizar singular→plural
      const plural = u + "s";
      const fuzzy2 = conversions.find(
        (c: any) => c.unitName.toLowerCase() === plural,
      );
      if (fuzzy2) return quantity * fuzzy2.gramsPerUnit;
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
    if (variant) {
      return {
        calories: variant.calories || 0,
        protein: variant.protein || 0,
        carbs: variant.carbs || 0,
        fat: variant.fat || 0,
        fiber: variant.fiber || 0,
      };
    }

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

  private calculateNutrition(
    recipe: any,
    ratio: number = 1,
  ): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  } {
    // Si hay macros manuales, usarlos
    if (recipe.customCalories != null) {
      return {
        calories: recipe.customCalories * ratio,
        protein: (recipe.customProtein || 0) * ratio,
        carbs: (recipe.customCarbs || 0) * ratio,
        fat: (recipe.customFat || 0) * ratio,
        fiber: (recipe.customFiber || 0) * ratio,
      };
    }

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

      // Aplicar weightFactor: convertir gramos según el cambio de estado (crudo → cocinado)
      const originalVariant =
        ri.variant ||
        (ing.variants || []).find((v: any) => v.isDefault) ||
        (ing.variants || [])[0];
      const nutritionVariant = ri.cookedVariant || originalVariant;
      const originalFactor: number = originalVariant?.weightFactor ?? 1;
      const cookedFactor: number = nutritionVariant?.weightFactor ?? 1;
      const convertedGrams = (gramsUsed / originalFactor) * cookedFactor;
      const factor = (convertedGrams / 100) * ratio;

      const macros = this.getVariantMacros(ing, nutritionVariant);
      calories += macros.calories * factor;
      protein += macros.protein * factor;
      carbs += macros.carbs * factor;
      fat += macros.fat * factor;
      fiber += macros.fiber * factor;
    }

    for (const comp of recipe.components || []) {
      // Si es opcional y defaultEnabled es false, no sumar
      if (comp.isOptional && comp.defaultEnabled === false) {
        continue;
      }

      const defaultOption =
        comp.options.find((o: any) => o.isDefault) || comp.options[0];

      if (defaultOption) {
        if (defaultOption.recipe) {
          const recipeServings = defaultOption.recipe.servings || 1;
          // Default to 1 serving of sub-recipe per serving of main recipe
          const usedServings = defaultOption.recipeServings || 1;
          const recipeRatio = ratio * (usedServings / recipeServings);
          const subNutrition = this.calculateNutrition(
            defaultOption.recipe,
            recipeRatio,
          );
          calories += subNutrition.calories;
          protein += subNutrition.protein;
          carbs += subNutrition.carbs;
          fat += subNutrition.fat;
          fiber += subNutrition.fiber;
        } else if (defaultOption.ingredient) {
          const ing = defaultOption.ingredient;
          const qty = defaultOption.quantity || 100;
          const usedUnit = defaultOption.unit || ing.unit;
          const gramsUsed = this.getQuantityInGrams(
            qty,
            usedUnit,
            ing.unit,
            ing.conversions || [],
          );

          // Aplicar weightFactor igual que para ingredientes directos
          const originalVariant =
            defaultOption.variant ||
            (ing.variants || []).find((v: any) => v.isDefault) ||
            (ing.variants || [])[0];
          const nutritionVariant =
            defaultOption.cookedVariant || originalVariant;
          const originalFactor: number = originalVariant?.weightFactor ?? 1;
          const cookedFactor: number = nutritionVariant?.weightFactor ?? 1;
          const convertedGrams = (gramsUsed / originalFactor) * cookedFactor;
          const factor = (convertedGrams / 100) * ratio;

          const macros = this.getVariantMacros(ing, nutritionVariant);
          calories += macros.calories * factor;
          protein += macros.protein * factor;
          carbs += macros.carbs * factor;
          fat += macros.fat * factor;
          fiber += macros.fiber * factor;
        }
      }
    }

    return { calories, protein, carbs, fat, fiber };
  }

  private mapRecipe(recipe: any, authorName?: string): RecipeWithComponents {
    const nutrition = this.calculateNutrition(recipe);
    const hasNutrition =
      nutrition.calories > 0 ||
      nutrition.protein > 0 ||
      nutrition.carbs > 0 ||
      nutrition.fat > 0;
    const servings = recipe.servings || 1;

    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      instructions: recipe.instructions,
      imageUrl: recipe.imageUrl,
      cookTimeMinutes: recipe.cookTimeMinutes,
      difficulty: recipe.difficulty,
      servings: recipe.servings,
      isPublic: recipe.isPublic,
      userId: recipe.userId,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      authorName,
      // Macros manuales
      customCalories: recipe.customCalories,
      customProtein: recipe.customProtein,
      customCarbs: recipe.customCarbs,
      customFat: recipe.customFat,
      customFiber: recipe.customFiber,
      defaultLocation: recipe.defaultLocation || null,
      totalCalories: hasNutrition ? Math.round(nutrition.calories) : null,
      caloriesPerServing: hasNutrition
        ? Math.round(nutrition.calories / servings)
        : null,
      nutrition: hasNutrition
        ? {
            calories: Math.round(nutrition.calories),
            protein: Math.round(nutrition.protein * 10) / 10,
            carbs: Math.round(nutrition.carbs * 10) / 10,
            fat: Math.round(nutrition.fat * 10) / 10,
            fiber: Math.round(nutrition.fiber * 10) / 10,
          }
        : null,
      nutritionPerServing: hasNutrition
        ? {
            calories: Math.round(nutrition.calories / servings),
            protein: Math.round((nutrition.protein / servings) * 10) / 10,
            carbs: Math.round((nutrition.carbs / servings) * 10) / 10,
            fat: Math.round((nutrition.fat / servings) * 10) / 10,
            fiber: Math.round((nutrition.fiber / servings) * 10) / 10,
          }
        : null,
      ingredients: (recipe.ingredients || []).map((ri: any) => ({
        id: ri.ingredient.id,
        name: ri.ingredient.name,
        quantity: ri.quantity,
        unit: ri.unit || ri.ingredient.unit,
        ingredientBaseUnit: ri.ingredient.unit,
        variantId: ri.variantId,
        variantName: ri.variant?.name,
        cookedVariantId: ri.cookedVariantId,
        cookedVariantName: ri.cookedVariant?.name,
        variants: (ri.ingredient.variants || []).map((v: any) => ({
          id: v.id,
          name: v.name,
          isDefault: v.isDefault,
          calories: v.calories,
          protein: v.protein,
          carbs: v.carbs,
          fat: v.fat,
          fiber: v.fiber,
          weightFactor: v.weightFactor || 1,
        })),
        conversions: (ri.ingredient.conversions || []).map((c: any) => ({
          id: c.id,
          unitName: c.unitName,
          gramsPerUnit: c.gramsPerUnit,
        })),
      })),
      components: (recipe.components || []).map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        sortOrder: comp.sortOrder,
        isOptional: comp.isOptional,
        defaultEnabled: comp.defaultEnabled,
        options: comp.options.map((opt: any) => ({
          id: opt.id,
          name:
            opt.name ||
            (opt.recipe ? opt.recipe.title : null) ||
            (opt.ingredient ? opt.ingredient.name : null) ||
            "",
          isDefault: opt.isDefault,
          recipeId: opt.recipeId || null,
          quantity: opt.quantity,
          unit: opt.unit,
          recipeServings: opt.recipeServings,
          recipe: opt.recipe ? this.mapRecipe(opt.recipe) : null,
          ingredient: opt.ingredient
            ? {
                id: opt.ingredient.id,
                name: opt.ingredient.name,
                unit: opt.ingredient.unit,
                variantId: opt.variantId,
                variantName: opt.variant?.name,
                cookedVariantId: opt.cookedVariantId,
                cookedVariantName: opt.cookedVariant?.name,
                variants: (opt.ingredient.variants || []).map((v: any) => ({
                  id: v.id,
                  name: v.name,
                  isDefault: v.isDefault,
                  calories: v.calories,
                  protein: v.protein,
                  carbs: v.carbs,
                  fat: v.fat,
                  fiber: v.fiber,
                  weightFactor: v.weightFactor || 1,
                })),
                conversions: (opt.ingredient.conversions || []).map(
                  (c: any) => ({
                    id: c.id,
                    unitName: c.unitName,
                    gramsPerUnit: c.gramsPerUnit,
                  }),
                ),
              }
            : null,
        })),
      })),
    };
  }
}

export const recipeService = new RecipeService();
