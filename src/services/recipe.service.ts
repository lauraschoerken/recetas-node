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
          tagAssignments: {
            include: { tag: true },
          },
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
      difficulty?: string;
      minCookTime?: number;
      maxCookTime?: number;
      tagIds?: number[];
      excludeTagIds?: number[];
      sortBy?: string;
      sortOrder?: string;
      authorId?: number;
    } = {},
  ): Promise<{ data: RecipeWithComponents[]; total: number }> {
    const {
      page,
      pageSize,
      search = "",
      visibility = "all",
      ingredient = "",
      difficulty = "",
      minCookTime,
      maxCookTime,
      tagIds = [],
      excludeTagIds = [],
      sortBy = "createdAt",
      sortOrder = "desc",
      authorId,
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

    // Ordenación
    const allowedSortFields = [
      "createdAt",
      "title",
      "cookTimeMinutes",
      "difficulty",
    ];
    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";
    const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

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
        ...(difficulty
          ? [
              {
                difficulty: {
                  equals: difficulty,
                  mode: "insensitive" as const,
                },
              },
            ]
          : []),
        ...(minCookTime != null
          ? [{ cookTimeMinutes: { gte: minCookTime } }]
          : []),
        ...(maxCookTime != null
          ? [{ cookTimeMinutes: { lte: maxCookTime } }]
          : []),
        ...(tagIds.length > 0
          ? [
              {
                ingredients: {
                  some: {
                    ingredient: {
                      tagAssignments: {
                        some: {
                          tagId: { in: tagIds },
                        },
                      },
                    },
                  },
                },
              },
            ]
          : []),
        ...(excludeTagIds.length > 0
          ? [
              {
                NOT: {
                  ingredients: {
                    some: {
                      ingredient: {
                        tagAssignments: {
                          some: {
                            tagId: { in: excludeTagIds },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ]
          : []),
        ...(authorId != null ? [{ userId: authorId }] : []),
      ],
    };
    const [recipes, total] = await prisma.$transaction([
      prisma.recipe.findMany({
        where,
        include: recipeInclude,
        orderBy: { [safeSortBy]: safeSortOrder },
        ...(page && pageSize
          ? { skip: (page - 1) * pageSize, take: pageSize }
          : {}),
      }),
      prisma.recipe.count({ where }),
    ]);

    const mapped = recipes.map((r) => this.mapRecipe(r, r.user.name));

    // Aplicar preferencias de usuario sobre tags (color override y ocultas)
    const allTagIds = Array.from(
      new Set(mapped.flatMap((r) => (r.tags || []).map((t: any) => t.id))),
    );
    if (allTagIds.length > 0) {
      const userPrefs = await prisma.ingredientTagUserPreference.findMany({
        where: { userId, tagId: { in: allTagIds } },
      });
      const prefMap = new Map(userPrefs.map((p) => [p.tagId, p]));
      for (const r of mapped) {
        if (r.tags) {
          r.tags = r.tags
            .filter((t: any) => !prefMap.get(t.id)?.isHiddenGlobally)
            .map((t: any) => {
              const pref = prefMap.get(t.id);
              return pref?.colorOverride
                ? { ...t, color: pref.colorOverride }
                : t;
            });
        }
      }
    }

    return { data: mapped, total };
  }

  async getAuthors(userId: number): Promise<{ id: number; name: string }[]> {
    const users = await prisma.user.findMany({
      where: {
        recipes: {
          some: { OR: [{ userId }, { isPublic: true }] },
        },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return users;
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

    // Aplicar preferencias de usuario sobre tags: color override y filtrar ocultas
    if (mapped.tags && mapped.tags.length > 0) {
      const tagIds = mapped.tags.map((t: any) => t.id);
      const userPrefs = await prisma.ingredientTagUserPreference.findMany({
        where: { userId, tagId: { in: tagIds } },
      });
      const prefMap = new Map(userPrefs.map((p) => [p.tagId, p]));
      mapped.tags = mapped.tags
        .filter((t: any) => !prefMap.get(t.id)?.isHiddenGlobally)
        .map((t: any) => {
          const pref = prefMap.get(t.id);
          return pref?.colorOverride ? { ...t, color: pref.colorOverride } : t;
        });
    }

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
      tags: (() => {
        const tagMap = new Map<
          number,
          { id: number; name: string; color: string | null }
        >();
        for (const ri of recipe.ingredients || []) {
          for (const ta of ri.ingredient.tagAssignments || []) {
            if (!tagMap.has(ta.tag.id)) {
              tagMap.set(ta.tag.id, {
                id: ta.tag.id,
                name: ta.tag.name,
                color: ta.tag.color ?? null,
              });
            }
          }
        }
        return Array.from(tagMap.values());
      })(),
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

  // ──────── CSV Export / Import ────────

  private csvField(v: string | null | undefined): string {
    const s = v == null ? "" : String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  }

  async exportCsv(ids: number[], userId: number): Promise<string> {
    const headers = [
      "title",
      "description",
      "instructions",
      "servings",
      "cookTimeMinutes",
      "difficulty",
      "isPublic",
      "defaultLocation",
      "customCalories",
      "customProtein",
      "customCarbs",
      "customFat",
      "customFiber",
      "ingredients",
      "components",
    ].join(",");

    const rows: string[] = [headers];

    for (const id of ids) {
      const recipe = await this.getById(id, userId);
      if (!recipe) continue;

      const ing = (recipe.ingredients || []).map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
      }));

      const comps = (recipe.components || []).map((c: any) => ({
        name: c.name,
        sortOrder: c.sortOrder,
        isOptional: c.isOptional,
        defaultEnabled: c.defaultEnabled,
        options: c.options.map((o: any) => ({
          name: o.name,
          isDefault: o.isDefault,
          ingredientName: o.ingredient?.name ?? null,
          recipeId: o.recipeId ?? null,
          quantity: o.quantity ?? null,
          unit: o.unit ?? null,
          recipeServings: o.recipeServings ?? null,
        })),
      }));

      const fields = [
        this.csvField(recipe.title),
        this.csvField(recipe.description),
        this.csvField(recipe.instructions),
        String(recipe.servings ?? 4),
        String(recipe.cookTimeMinutes ?? ""),
        this.csvField(recipe.difficulty),
        String(recipe.isPublic),
        this.csvField(recipe.defaultLocation),
        String(recipe.customCalories ?? ""),
        String(recipe.customProtein ?? ""),
        String(recipe.customCarbs ?? ""),
        String(recipe.customFat ?? ""),
        String(recipe.customFiber ?? ""),
        this.csvField(JSON.stringify(ing)),
        this.csvField(JSON.stringify(comps)),
      ];

      rows.push(fields.join(","));
    }

    return rows.join("\n");
  }

  private parseCsv(content: string): string[][] {
    const rows: string[][] = [];
    let i = 0;
    const n = content.length;

    while (i < n) {
      const row: string[] = [];

      while (i < n) {
        if (content[i] === '"') {
          i++; // skip opening quote
          let value = "";
          while (i < n) {
            if (content[i] === '"') {
              if (content[i + 1] === '"') {
                value += '"';
                i += 2;
              } else {
                i++; // skip closing quote
                break;
              }
            } else {
              value += content[i];
              i++;
            }
          }
          row.push(value);
        } else {
          let value = "";
          while (
            i < n &&
            content[i] !== "," &&
            content[i] !== "\n" &&
            content[i] !== "\r"
          ) {
            value += content[i];
            i++;
          }
          row.push(value);
        }

        if (i < n && content[i] === ",") {
          i++;
        } else {
          break;
        }
      }

      if (i < n && content[i] === "\r") i++;
      if (i < n && content[i] === "\n") i++;

      if (row.length > 0) rows.push(row);
    }

    return rows;
  }

  async importFromCsv(
    csvContent: string,
    userId: number,
  ): Promise<{
    importedCount: number;
    skipped: { title: string; id: number }[];
  }> {
    const rows = this.parseCsv(csvContent);
    if (rows.length < 2) return { importedCount: 0, skipped: [] };

    // Fila 0 = cabeceras, saltar
    const dataRows = rows.slice(1);
    let importedCount = 0;
    const skipped: { title: string; id: number }[] = [];

    for (const row of dataRows) {
      if (row.length < 15) continue;
      const [
        title,
        description,
        instructions,
        servingsStr,
        cookTimeStr,
        difficulty,
        isPublicStr,
        defaultLocation,
        customCalStr,
        customProtStr,
        customCarbsStr,
        customFatStr,
        customFiberStr,
        ingredientsJson,
        componentsJson,
      ] = row;

      if (!title) continue;

      // Comprobar duplicado por título
      const existing = await prisma.recipe.findFirst({
        where: { title, userId },
        select: { id: true },
      });
      if (existing) {
        skipped.push({ title, id: existing.id });
        continue;
      }

      let ingredients: any[] = [];
      let components: any[] = [];
      try {
        ingredients = ingredientsJson ? JSON.parse(ingredientsJson) : [];
        components = componentsJson ? JSON.parse(componentsJson) : [];
      } catch {
        ingredients = [];
        components = [];
      }

      const dto: CreateRecipeDto = {
        title,
        description: description || undefined,
        instructions: instructions || undefined,
        servings: parseInt(servingsStr) || 4,
        cookTimeMinutes: cookTimeStr ? parseInt(cookTimeStr) : undefined,
        difficulty: difficulty || undefined,
        isPublic: isPublicStr === "true",
        defaultLocation: defaultLocation || null,
        ingredients: ingredients.map((i: any) => ({
          name: i.name,
          quantity: Number(i.quantity) || 0,
          unit: i.unit || "g",
        })),
        components: components.map((c: any) => ({
          name: c.name,
          sortOrder: c.sortOrder,
          isOptional: c.isOptional,
          defaultEnabled: c.defaultEnabled,
          options: (c.options || []).map((o: any) => ({
            name: o.name,
            isDefault: o.isDefault,
            ingredientName: o.ingredientName || undefined,
            recipeId: o.recipeId || undefined,
            quantity: o.quantity || undefined,
            unit: o.unit || undefined,
            recipeServings: o.recipeServings || undefined,
          })),
        })),
        ...(customCalStr ? { customCalories: parseFloat(customCalStr) } : {}),
        ...(customProtStr ? { customProtein: parseFloat(customProtStr) } : {}),
        ...(customCarbsStr ? { customCarbs: parseFloat(customCarbsStr) } : {}),
        ...(customFatStr ? { customFat: parseFloat(customFatStr) } : {}),
        ...(customFiberStr ? { customFiber: parseFloat(customFiberStr) } : {}),
      } as any;

      await this.create(dto, userId);
      importedCount++;
    }

    return { importedCount, skipped };
  }
}

export const recipeService = new RecipeService();
