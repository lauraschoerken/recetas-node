import { Prisma, PrismaClient } from "@prisma/client";
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

    // Búsqueda por título insensible a tildes
    let searchIds: number[] | null = null;
    if (search) {
      const pattern = `%${search}%`;
      const rows = await prisma.$queryRaw<{ id: number }[]>(
        Prisma.sql`SELECT id FROM "Recipe" WHERE unaccent(lower(title)) LIKE unaccent(lower(${pattern}))`,
      );
      searchIds = rows.map((r) => r.id);
    }

    // Búsqueda por ingrediente insensible a tildes
    let ingredientIds: number[] | null = null;
    if (ingredient) {
      const pattern = `%${ingredient}%`;
      const rows = await prisma.$queryRaw<{ id: number }[]>(
        Prisma.sql`SELECT id FROM "Ingredient" WHERE unaccent(lower(name)) LIKE unaccent(lower(${pattern}))`,
      );
      ingredientIds = rows.map((r) => r.id);
    }

    const where = {
      AND: [
        visibilityFilter,
        ...(searchIds !== null ? [{ id: { in: searchIds } }] : []),
        ...(ingredientIds !== null
          ? ingredientIds.length > 0
            ? [
                {
                  ingredients: {
                    some: { ingredientId: { in: ingredientIds } },
                  },
                },
              ]
            : [{ id: -1 }] // sin coincidencias → sin resultados
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

    return {
      data: await this.applyUserConversionOverridesToRecipes(mapped, userId),
      total,
    };
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

    return (
      await this.applyUserConversionOverridesToRecipes([mapped], userId)
    )[0];
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
      const ingredient = ing.ingredientId
        ? await prisma.ingredient.findUnique({
            where: { id: ing.ingredientId },
            include: { variants: true, conversions: true },
          })
        : await this.getOrCreateIngredient(ing.name, ing.unit);

      if (!ingredient) {
        throw new Error(
          `No se encontró el ingrediente con id ${ing.ingredientId}`,
        );
      }

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

            if (opt.ingredientId) {
              const ingredient = await prisma.ingredient.findUnique({
                where: { id: opt.ingredientId },
                include: { variants: true },
              });
              if (!ingredient) {
                throw new Error(
                  `No se encontró el ingrediente con id ${opt.ingredientId}`,
                );
              }
              ingredientId = ingredient.id;

              const variants = await prisma.ingredientVariant.findMany({
                where: { ingredientId: ingredient.id },
              });
              const defaultVariant =
                variants.find((v) => v.isDefault) || variants[0];
              variantId = defaultVariant?.id || null;
            } else if (opt.ingredientName) {
              const ingredient = await this.getOrCreateIngredient(
                opt.ingredientName,
                opt.unit || "g",
              );
              ingredientId = ingredient.id;

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

    const mappedCreate = this.mapRecipe(fullRecipe!, fullRecipe!.user.name);
    return (
      await this.applyUserConversionOverridesToRecipes([mappedCreate], userId)
    )[0];
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
        const ingredient = ing.ingredientId
          ? await prisma.ingredient.findUnique({
              where: { id: ing.ingredientId },
              include: { variants: true, conversions: true },
            })
          : await this.getOrCreateIngredient(ing.name, ing.unit);

        if (!ingredient) {
          throw new Error(
            `No se encontró el ingrediente con id ${ing.ingredientId}`,
          );
        }

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

            if (opt.ingredientId) {
              const ingredient = await prisma.ingredient.findUnique({
                where: { id: opt.ingredientId },
                include: { variants: true },
              });
              if (!ingredient) {
                throw new Error(
                  `No se encontró el ingrediente con id ${opt.ingredientId}`,
                );
              }
              ingredientId = ingredient.id;

              const variants = await prisma.ingredientVariant.findMany({
                where: { ingredientId: ingredient.id },
              });
              const defaultVariant =
                variants.find((v) => v.isDefault) || variants[0];
              variantId = defaultVariant?.id || null;
            } else if (opt.ingredientName) {
              const ingredient = await this.getOrCreateIngredient(
                opt.ingredientName,
                opt.unit || "g",
              );
              ingredientId = ingredient.id;

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

    const mappedUpdate = this.mapRecipe(fullRecipe!, fullRecipe!.user.name);
    return (
      await this.applyUserConversionOverridesToRecipes([mappedUpdate], userId)
    )[0];
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

  // Merges user-specific conversion overrides into already-mapped recipe ingredients
  private async applyUserConversionOverridesToRecipes(
    recipes: RecipeWithComponents[],
    userId: number,
  ): Promise<RecipeWithComponents[]> {
    const ingredientIds = new Set<number>();
    for (const r of recipes) {
      for (const ing of r.ingredients || []) {
        ingredientIds.add(ing.id);
      }
    }
    if (ingredientIds.size === 0) return recipes;

    const overrides = await prisma.ingredientConversionUserOverride.findMany({
      where: { userId, ingredientId: { in: Array.from(ingredientIds) } },
    });
    if (overrides.length === 0) return recipes;

    const overrideMap = new Map<number, typeof overrides>();
    for (const o of overrides) {
      if (!overrideMap.has(o.ingredientId)) overrideMap.set(o.ingredientId, []);
      overrideMap.get(o.ingredientId)!.push(o);
    }

    return recipes.map((r) => ({
      ...r,
      ingredients: (r.ingredients || []).map((ing) => {
        const userConvs = overrideMap.get(ing.id);
        if (!userConvs || userConvs.length === 0) return ing;
        const globalUnitNames = new Set(
          (ing.conversions || []).map((c) => c.unitName.toLowerCase()),
        );
        const extraConversions = userConvs
          .filter((co) => !globalUnitNames.has(co.unitName.toLowerCase()))
          .map((co) => ({
            id: co.id,
            unitName: co.unitName,
            gramsPerUnit: co.gramsPerUnit,
            ingredientId: co.ingredientId,
            isUserOverride: true as const,
          }));
        return {
          ...ing,
          conversions: [...(ing.conversions || []), ...extraConversions],
        };
      }),
    }));
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

  async exportJson(ids: number[], userId: number): Promise<any[]> {
    const recipes: any[] = [];
    for (const id of ids) {
      const recipe = await this.getById(id, userId);
      if (recipe) recipes.push(recipe);
    }
    return recipes;
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

  private normalizeIngredientName(name: string | null | undefined): string {
    return (name || "").trim();
  }

  private normalizeImportResolutionKey(
    value: string | null | undefined,
  ): string {
    return this.normalizeIngredientName(value)
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  private async findVisibleIngredientByName(name: string, userId: number) {
    return prisma.ingredient.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        OR: [{ status: "GLOBAL" }, { createdByUserId: userId }],
      },
      select: { id: true, name: true, status: true, createdByUserId: true },
    });
  }

  private findIngredientResolution(
    ingredientResolutions: Record<
      string,
      { ingredientId?: number | null; name?: string; createNew?: boolean }
    >,
    recipeTitle: string,
    index: number,
    importedIngredientName: string,
    importedId: number | null | undefined,
  ) {
    const normalizedImportedName = this.normalizeImportResolutionKey(
      importedIngredientName,
    );
    const normalizedImportedId =
      Number.isFinite(Number(importedId)) && Number(importedId) > 0
        ? String(Number(importedId))
        : "new";
    const normalizedTitle = this.normalizeImportResolutionKey(recipeTitle);

    for (const [candidateKey, candidateResolution] of Object.entries(
      ingredientResolutions,
    )) {
      if (!candidateKey) continue;

      const normalizedKey = this.normalizeImportResolutionKey(candidateKey);
      const startsWithTitle = normalizedKey.startsWith(`${normalizedTitle}|`);
      const hasIndex = normalizedKey.includes(`|${String(index)}|`);
      const hasName = normalizedKey.includes(`|${normalizedImportedName}|`);
      const hasIdMatch =
        normalizedKey.endsWith(`|${normalizedImportedId}`) ||
        normalizedKey.endsWith(`|new`) ||
        normalizedImportedId === "new";

      if (startsWithTitle && hasIndex && hasName && hasIdMatch) {
        return candidateResolution;
      }
    }

    return undefined;
  }

  private async ensureIngredientVariantState(
    ingredientId: number,
    variantName: string | null | undefined,
    weightFactor: number | null | undefined,
    calories: number | null | undefined,
    protein: number | null | undefined,
    carbs: number | null | undefined,
    fat: number | null | undefined,
    fiber: number | null | undefined,
  ): Promise<number | null> {
    const safeName = this.normalizeIngredientName(variantName) || "Crudo";
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: { variants: true },
    });
    if (!ingredient) return null;

    let variant = ingredient.variants.find(
      (v) => v.name.toLowerCase() === safeName.toLowerCase(),
    );

    if (!variant) {
      variant = await prisma.ingredientVariant.create({
        data: {
          ingredientId,
          name: safeName,
          isDefault: ingredient.variants.length === 0,
          weightFactor: weightFactor ?? 1,
          calories: calories ?? null,
          protein: protein ?? null,
          carbs: carbs ?? null,
          fat: fat ?? null,
          fiber: fiber ?? null,
        },
      });
    } else {
      variant = await prisma.ingredientVariant.update({
        where: { id: variant.id },
        data: {
          weightFactor: weightFactor ?? variant.weightFactor,
          calories: calories ?? variant.calories,
          protein: protein ?? variant.protein,
          carbs: carbs ?? variant.carbs,
          fat: fat ?? variant.fat,
          fiber: fiber ?? variant.fiber,
        },
      });
    }

    if (ingredient.variants.length === 0) {
      await prisma.ingredientVariant.updateMany({
        where: { ingredientId },
        data: { isDefault: false },
      });
      await prisma.ingredientVariant.update({
        where: { id: variant.id },
        data: { isDefault: true },
      });
    }

    return variant.id;
  }

  private async ensureIngredientImportData(
    ingredientInput: any,
    userId: number,
    options: {
      ingredientId?: number | null;
      createNew?: boolean;
      preferredName?: string;
    } = {},
  ): Promise<{
    ingredientId: number;
    variantId: number | null;
    cookedVariantId: number | null;
    unit: string;
  }> {
    const rawName =
      options?.preferredName ??
      ingredientInput?.ingredientName ??
      ingredientInput?.name ??
      ingredientInput?.ingredient?.name ??
      "";
    const name = this.normalizeIngredientName(rawName);
    if (!name) {
      throw new Error("El ingrediente importado no tiene nombre");
    }

    const ingredientUnit =
      ingredientInput?.unit ??
      ingredientInput?.ingredientBaseUnit ??
      ingredientInput?.ingredient?.unit ??
      "g";

    const explicitIngredientId =
      options.ingredientId ??
      ingredientInput?.id ??
      ingredientInput?.ingredientId ??
      ingredientInput?.ingredient?.id ??
      null;

    let ingredient = explicitIngredientId
      ? await prisma.ingredient.findUnique({
          where: { id: explicitIngredientId },
          include: { variants: true, conversions: true },
        })
      : null;

    if (
      ingredient &&
      ingredient.status === "PRIVATE" &&
      ingredient.createdByUserId !== null &&
      ingredient.createdByUserId !== userId
    ) {
      ingredient = null;
    }

    if (!ingredient && options.createNew) {
      ingredient = await prisma.ingredient.create({
        data: {
          name,
          unit: ingredientUnit,
          status: "PRIVATE",
          createdByUserId: userId,
          variants: {
            create: [{ name: "Crudo", isDefault: true, weightFactor: 1 }],
          },
        },
        include: { variants: true, conversions: true },
      });
    }

    if (!ingredient) {
      ingredient = await prisma.ingredient.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          OR: [{ status: "GLOBAL" }, { createdByUserId: userId }],
        },
        include: { variants: true, conversions: true },
      });
    }

    if (!ingredient) {
      throw new Error(
        `El ingrediente "${name}" no existe y no se ha marcado como nuevo para crearlo durante la importación.`,
      );
    }

    if (!ingredient.variants || ingredient.variants.length === 0) {
      await prisma.ingredientVariant.create({
        data: {
          ingredientId: ingredient.id,
          name: "Crudo",
          isDefault: true,
          weightFactor: 1,
        },
      });
    }

    const availableConversions = Array.isArray(ingredientInput?.conversions)
      ? ingredientInput.conversions
      : Array.isArray(ingredientInput?.ingredient?.conversions)
        ? ingredientInput.ingredient.conversions
        : [];

    for (const conversion of availableConversions) {
      if (!conversion || !conversion.unitName) continue;
      const unitName = String(conversion.unitName).trim();
      const gramsPerUnit = Number(conversion.gramsPerUnit ?? 0);
      if (!unitName || !Number.isFinite(gramsPerUnit) || gramsPerUnit <= 0)
        continue;

      const existingConversion = ingredient.conversions.find(
        (c) => c.unitName.toLowerCase() === unitName.toLowerCase(),
      );
      if (existingConversion) {
        await prisma.unitConversion.update({
          where: { id: existingConversion.id },
          data: { gramsPerUnit },
        });
      } else {
        await prisma.unitConversion.create({
          data: {
            ingredientId: ingredient.id,
            unitName,
            gramsPerUnit,
          },
        });
      }
    }

    const purchaseVariantName =
      ingredientInput?.variantName ??
      ingredientInput?.variant?.name ??
      ingredientInput?.state ??
      (ingredientInput?.cookedVariantName ? "Crudo" : null) ??
      ingredientInput?.ingredient?.variantName ??
      null;
    const cookedVariantName =
      ingredientInput?.cookedVariantName ??
      ingredientInput?.cookedVariant?.name ??
      ingredientInput?.ingredient?.cookedVariantName ??
      null;

    let variantId: number | null = null;
    if (purchaseVariantName) {
      variantId = await this.ensureIngredientVariantState(
        ingredient.id,
        purchaseVariantName,
        ingredientInput?.variant?.weightFactor ??
          ingredientInput?.weightFactor ??
          1,
        ingredientInput?.variant?.calories ?? ingredientInput?.calories ?? null,
        ingredientInput?.variant?.protein ?? ingredientInput?.protein ?? null,
        ingredientInput?.variant?.carbs ?? ingredientInput?.carbs ?? null,
        ingredientInput?.variant?.fat ?? ingredientInput?.fat ?? null,
        ingredientInput?.variant?.fiber ?? ingredientInput?.fiber ?? null,
      );
    } else {
      const defaultVariant =
        ingredient.variants.find((v) => v.isDefault) || ingredient.variants[0];
      variantId = defaultVariant?.id ?? null;
    }

    let cookedVariantId: number | null = null;
    if (cookedVariantName) {
      cookedVariantId = await this.ensureIngredientVariantState(
        ingredient.id,
        cookedVariantName,
        ingredientInput?.cookedVariant?.weightFactor ??
          ingredientInput?.weightFactor ??
          1,
        ingredientInput?.cookedVariant?.calories ?? null,
        ingredientInput?.cookedVariant?.protein ?? null,
        ingredientInput?.cookedVariant?.carbs ?? null,
        ingredientInput?.cookedVariant?.fat ?? null,
        ingredientInput?.cookedVariant?.fiber ?? null,
      );
    }

    if (!variantId && ingredient.variants.length > 0) {
      variantId =
        ingredient.variants.find((v) => v.isDefault)?.id ??
        ingredient.variants[0].id;
    }

    return {
      ingredientId: ingredient.id,
      variantId,
      cookedVariantId,
      unit: ingredient.unit || ingredientUnit,
    };
  }

  private normalizeRecipeImportPayload(recipesInput: any[] | any): any[] {
    return Array.isArray(recipesInput)
      ? recipesInput
      : Array.isArray(recipesInput?.recipes)
        ? recipesInput.recipes
        : Array.isArray(recipesInput?.data)
          ? recipesInput.data
          : recipesInput &&
              typeof recipesInput === "object" &&
              (recipesInput.title || recipesInput.id)
            ? [recipesInput]
            : [];
  }

  private collectRecipeIngredientEntries(
    recipe: any,
  ): Array<{ recipeTitle: string; index: number; ingredientInput: any }> {
    const entries: Array<{
      recipeTitle: string;
      index: number;
      ingredientInput: any;
    }> = [];
    const seen = new Set<object>();
    const seenEntries = new Set<string>();

    const visitRecipe = (node: any, fallbackTitle?: string) => {
      if (!node || typeof node !== "object" || seen.has(node)) return;
      seen.add(node);

      const recipeTitle =
        this.normalizeIngredientName(
          String(node.title ?? fallbackTitle ?? "Receta sin título").trim(),
        ) || "Receta sin título";

      let localIndex = 0;
      for (const ingredientInput of Array.isArray(node.ingredients)
        ? node.ingredients
        : []) {
        const key = `${recipeTitle}|ingredients|${localIndex}|${this.normalizeIngredientName(
          ingredientInput?.ingredientName ??
            ingredientInput?.name ??
            ingredientInput?.ingredient?.name ??
            "",
        )}`;
        if (!seenEntries.has(key)) {
          seenEntries.add(key);
          entries.push({ recipeTitle, index: localIndex, ingredientInput });
        }
        localIndex += 1;
      }

      for (const component of Array.isArray(node.components)
        ? node.components
        : []) {
        for (const option of Array.isArray(component?.options)
          ? component.options
          : []) {
          const ingredientName = this.normalizeIngredientName(
            option?.ingredientName ??
              option?.name ??
              option?.ingredient?.name ??
              option?.ingredient?.ingredientName,
          );

          if (ingredientName) {
            const key = `${recipeTitle}|component|${localIndex}|${ingredientName}`;
            if (!seenEntries.has(key)) {
              seenEntries.add(key);
              entries.push({
                recipeTitle,
                index: localIndex,
                ingredientInput: option,
              });
            }
            localIndex += 1;
          }

          if (option && typeof option === "object") {
            if (
              typeof option.recipe === "object" &&
              (option.recipe?.title || option.recipe?.id)
            ) {
              visitRecipe(option.recipe, option.recipe.title ?? recipeTitle);
            }
            if (
              typeof option.ingredient === "object" &&
              (option.ingredient?.name || option.ingredient?.id)
            ) {
              const nestedIngredient = option.ingredient;
              const nestedKey = `${recipeTitle}|nested|${localIndex}|${this.normalizeIngredientName(
                nestedIngredient?.name ?? "",
              )}`;
              if (!seenEntries.has(nestedKey)) {
                seenEntries.add(nestedKey);
                entries.push({
                  recipeTitle,
                  index: localIndex,
                  ingredientInput: {
                    ...nestedIngredient,
                    ingredientName: nestedIngredient.name,
                    name: nestedIngredient.name,
                  },
                });
              }
              localIndex += 1;
            }
          }
        }
      }

      for (const value of Object.values(node)) {
        if (!value || typeof value !== "object") continue;
        if (Array.isArray(value)) {
          for (const item of value) {
            const candidateItem = item as any;
            if (!candidateItem || typeof candidateItem !== "object") continue;
            if (
              this.normalizeIngredientName(
                candidateItem?.ingredientName ??
                  candidateItem?.name ??
                  candidateItem?.ingredient?.name ??
                  "",
              )
            ) {
              continue;
            }
            if (
              candidateItem?.title ||
              candidateItem?.ingredients ||
              candidateItem?.components ||
              candidateItem?.recipe
            ) {
              visitRecipe(
                candidateItem,
                candidateItem.title ?? fallbackTitle ?? recipeTitle,
              );
            }
          }
          continue;
        }

        const candidateValue = value as any;
        if (
          candidateValue?.title ||
          candidateValue?.ingredients ||
          candidateValue?.components ||
          candidateValue?.recipe
        ) {
          visitRecipe(
            candidateValue,
            candidateValue.title ?? fallbackTitle ?? recipeTitle,
          );
        }
      }
    };

    visitRecipe(recipe);
    return entries;
  }

  private collectRootRecipeIngredientEntries(
    recipe: any,
  ): Array<{ recipeTitle: string; index: number; ingredientInput: any }> {
    const entries: Array<{
      recipeTitle: string;
      index: number;
      ingredientInput: any;
    }> = [];
    const recipeTitle =
      this.normalizeIngredientName(
        String(recipe?.title ?? "Receta sin título").trim(),
      ) || "Receta sin título";

    for (const [index, ingredientInput] of Array.isArray(recipe?.ingredients)
      ? recipe.ingredients.entries()
      : []) {
      entries.push({ recipeTitle, index, ingredientInput });
    }

    for (const component of Array.isArray(recipe?.components)
      ? recipe.components
      : []) {
      for (const option of Array.isArray(component?.options)
        ? component.options
        : []) {
        const ingredientName = this.normalizeIngredientName(
          option?.ingredientName ??
            option?.name ??
            option?.ingredient?.name ??
            option?.ingredient?.ingredientName,
        );
        if (ingredientName) {
          entries.push({
            recipeTitle,
            index: entries.length,
            ingredientInput: option,
          });
        }
      }
    }

    return entries;
  }

  async reviewImportJson(
    recipesInput: any[] | any,
    userId: number,
  ): Promise<{
    needsReview: boolean;
    conflicts: Array<{
      key: string;
      recipeTitle: string;
      ingredientName: string;
      importedId: number | null;
      importedName: string;
      candidates: Array<{ id: number; name: string }>;
    }>;
  }> {
    const recipes = this.normalizeRecipeImportPayload(recipesInput);
    const conflicts: Array<{
      key: string;
      recipeTitle: string;
      ingredientName: string;
      importedId: number | null;
      importedName: string;
      candidates: Array<{ id: number; name: string }>;
    }> = [];
    const seenConflictValues = new Set<string>();

    for (const recipe of recipes) {
      if (!recipe || !recipe.title) continue;

      for (const {
        recipeTitle,
        index,
        ingredientInput,
      } of this.collectRecipeIngredientEntries(recipe)) {
        const importedName = this.normalizeIngredientName(
          ingredientInput?.ingredientName ??
            ingredientInput?.name ??
            ingredientInput?.ingredient?.name,
        );
        if (!importedName) continue;

        const importedId = Number(
          ingredientInput?.id ??
            ingredientInput?.ingredientId ??
            ingredientInput?.ingredient?.id ??
            ingredientInput?.ingredient_base_id ??
            NaN,
        );

        const key = `${this.normalizeImportResolutionKey(recipeTitle)}|${index}|${this.normalizeImportResolutionKey(importedName)}|${Number.isFinite(importedId) && importedId > 0 ? importedId : "new"}`;
        const dedupeKey = `${this.normalizeImportResolutionKey(recipeTitle)}|${this.normalizeImportResolutionKey(importedName)}`;

        let ingredientById: {
          id: number;
          name: string;
          status: string;
          createdByUserId: number | null;
        } | null = null;
        if (Number.isFinite(importedId) && importedId > 0) {
          ingredientById = await prisma.ingredient.findUnique({
            where: { id: importedId },
            select: {
              id: true,
              name: true,
              status: true,
              createdByUserId: true,
            },
          });
        }

        if (
          ingredientById &&
          ingredientById.status === "PRIVATE" &&
          ingredientById.createdByUserId !== null &&
          ingredientById.createdByUserId !== userId
        ) {
          if (seenConflictValues.has(dedupeKey)) continue;
          seenConflictValues.add(dedupeKey);
          conflicts.push({
            key,
            recipeTitle,
            ingredientName: importedName,
            importedId: ingredientById.id,
            importedName: ingredientById.name,
            candidates: [],
          });
          continue;
        }

        if (
          ingredientById &&
          this.normalizeIngredientName(ingredientById.name) !== importedName
        ) {
          const candidates = await prisma.ingredient.findMany({
            where: {
              OR: [
                { name: { contains: importedName, mode: "insensitive" } },
                {
                  name: {
                    contains: this.normalizeIngredientName(ingredientById.name),
                    mode: "insensitive",
                  },
                },
              ],
            },
            select: { id: true, name: true },
            take: 10,
          });

          if (seenConflictValues.has(dedupeKey)) continue;
          seenConflictValues.add(dedupeKey);
          conflicts.push({
            key,
            recipeTitle,
            ingredientName: importedName,
            importedId: ingredientById.id,
            importedName: ingredientById.name,
            candidates: candidates.map((c) => ({ id: c.id, name: c.name })),
          });
          continue;
        }

        if (!ingredientById) {
          const candidates = await prisma.ingredient.findMany({
            where: {
              OR: [
                {
                  AND: [
                    { name: { contains: importedName, mode: "insensitive" } },
                    { OR: [{ status: "GLOBAL" }, { createdByUserId: userId }] },
                  ],
                },
                {
                  AND: [
                    {
                      name: {
                        contains: importedName
                          .split(/\s+/)
                          .slice(0, 2)
                          .join(" "),
                        mode: "insensitive",
                      },
                    },
                    { OR: [{ status: "GLOBAL" }, { createdByUserId: userId }] },
                  ],
                },
              ],
            },
            select: { id: true, name: true },
            take: 10,
          });

          const matchingPrivateIngredient = await prisma.ingredient.findFirst({
            where: {
              name: { equals: importedName, mode: "insensitive" },
              status: "PRIVATE",
              createdByUserId: { not: userId },
            },
            select: { id: true, name: true, createdByUserId: true },
          });

          const safeCandidate = candidates.find(
            (c) => this.normalizeIngredientName(c.name) === importedName,
          );

          if (!safeCandidate || matchingPrivateIngredient) {
            if (seenConflictValues.has(dedupeKey)) continue;
            seenConflictValues.add(dedupeKey);
            conflicts.push({
              key,
              recipeTitle,
              ingredientName: importedName,
              importedId: matchingPrivateIngredient?.id ?? null,
              importedName: matchingPrivateIngredient?.name ?? importedName,
              candidates: candidates.map((c) => ({ id: c.id, name: c.name })),
            });
          }
        }
      }
    }

    return { needsReview: conflicts.length > 0, conflicts };
  }

  async importFromJson(
    recipesInput: any[] | any,
    userId: number,
    ingredientResolutions: Record<
      string,
      { ingredientId?: number | null; name?: string; createNew?: boolean }
    > = {},
  ): Promise<{
    importedCount: number;
    skipped: { title: string; id: number }[];
  }> {
    const recipes = this.normalizeRecipeImportPayload(recipesInput);

    let importedCount = 0;
    const skipped: { title: string; id: number }[] = [];

    for (const recipe of recipes) {
      if (!recipe || !recipe.title) continue;
      const title = String(recipe.title).trim();
      const existing = await prisma.recipe.findFirst({
        where: { title: { equals: title, mode: "insensitive" }, userId },
        select: { id: true },
      });
      if (existing) {
        skipped.push({ title, id: existing.id });
        continue;
      }

      const dtoIngredients: any[] = [];
      for (const {
        recipeTitle,
        index,
        ingredientInput,
      } of this.collectRootRecipeIngredientEntries(recipe)) {
        const importedIngredientName = this.normalizeIngredientName(
          ingredientInput?.ingredientName ??
            ingredientInput?.name ??
            ingredientInput?.ingredient?.name,
        );
        const resolution = this.findIngredientResolution(
          ingredientResolutions,
          recipeTitle,
          index,
          importedIngredientName,
          Number(
            ingredientInput?.id ??
              ingredientInput?.ingredientId ??
              ingredientInput?.ingredient?.id ??
              0,
          ) || null,
        );

        const normalizedIngredientInput = {
          ...ingredientInput,
          ingredientName:
            resolution?.name ??
            ingredientInput?.ingredientName ??
            ingredientInput?.name ??
            ingredientInput?.ingredient?.name,
          name:
            resolution?.name ??
            ingredientInput?.name ??
            ingredientInput?.ingredient?.name,
          ingredient: {
            ...(ingredientInput?.ingredient ?? {}),
            ...(resolution?.ingredientId
              ? { id: resolution.ingredientId }
              : {}),
            ...(resolution?.name ? { name: resolution.name } : {}),
          },
          ...(resolution?.ingredientId
            ? {
                id: resolution.ingredientId,
                ingredientId: resolution.ingredientId,
              }
            : {}),
        };

        const resolved = await this.ensureIngredientImportData(
          normalizedIngredientInput,
          userId,
          {
            ingredientId: resolution?.ingredientId ?? null,
            createNew: Boolean(resolution?.createNew),
            preferredName: resolution?.name ?? importedIngredientName,
          },
        );
        dtoIngredients.push({
          ingredientId: resolution?.ingredientId ?? undefined,
          name: this.normalizeIngredientName(
            resolution?.name ??
              ingredientInput?.ingredientName ??
              ingredientInput?.name ??
              ingredientInput?.ingredient?.name,
          ),
          quantity: Number(ingredientInput?.quantity ?? 0) || 0,
          unit: ingredientInput?.unit || resolved.unit || "g",
          variantId: resolved.variantId ?? undefined,
          variantName:
            ingredientInput?.variantName ??
            ingredientInput?.variant?.name ??
            ingredientInput?.state ??
            undefined,
          cookedVariantId: resolved.cookedVariantId ?? undefined,
          cookedVariantName:
            ingredientInput?.cookedVariantName ??
            ingredientInput?.cookedVariant?.name ??
            undefined,
        });
      }

      const dtoComponents = (recipe.components || []).map((c: any) => ({
        name: c.name,
        sortOrder: c.sortOrder ?? 0,
        isOptional: Boolean(c.isOptional),
        defaultEnabled: Boolean(c.defaultEnabled),
        options: (c.options || []).map(async (o: any) => {
          const ingredientName =
            o?.ingredientName ??
            o?.ingredient?.name ??
            o?.ingredientName ??
            undefined;
          const resolved = ingredientName
            ? await this.ensureIngredientImportData(
                {
                  ...o,
                  ingredientName,
                  unit: o.unit ?? o.ingredient?.unit ?? "g",
                },
                userId,
              )
            : null;

          return {
            name: o.name,
            isDefault: Boolean(o.isDefault),
            recipeId: o.recipeId ?? undefined,
            ingredientName,
            quantity: o.quantity ?? undefined,
            unit: o.unit ?? undefined,
            recipeServings: o.recipeServings ?? undefined,
            ingredientId: resolved?.ingredientId ?? undefined,
            variantId: resolved?.variantId ?? undefined,
            cookedVariantId: resolved?.cookedVariantId ?? undefined,
          };
        }),
      }));

      const dto: CreateRecipeDto = {
        title,
        description: recipe.description || undefined,
        instructions: recipe.instructions || undefined,
        servings: recipe.servings ?? 4,
        cookTimeMinutes: recipe.cookTimeMinutes ?? undefined,
        difficulty: recipe.difficulty || undefined,
        isPublic: Boolean(recipe.isPublic),
        defaultLocation: recipe.defaultLocation || undefined,
        imageUrl: recipe.imageUrl || undefined,
        ingredients: dtoIngredients,
        components: await Promise.all(
          dtoComponents.map(async (c: any) => ({
            ...c,
            options: await Promise.all(c.options),
          })),
        ),
        ...(recipe.customCalories != null
          ? { customCalories: Number(recipe.customCalories) }
          : {}),
        ...(recipe.customProtein != null
          ? { customProtein: Number(recipe.customProtein) }
          : {}),
        ...(recipe.customCarbs != null
          ? { customCarbs: Number(recipe.customCarbs) }
          : {}),
        ...(recipe.customFat != null
          ? { customFat: Number(recipe.customFat) }
          : {}),
        ...(recipe.customFiber != null
          ? { customFiber: Number(recipe.customFiber) }
          : {}),
      } as any;

      await this.create(dto, userId);
      importedCount += 1;
    }

    return { importedCount, skipped };
  }
}

export const recipeService = new RecipeService();
