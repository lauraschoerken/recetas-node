import { PrismaClient } from "@prisma/client";
import {
  ShoppingItem,
  WeekPlanWithDetails,
  CreateWeekPlanDto,
} from "../domain";
import { alertService } from "./alert.service";

const prisma = new PrismaClient();

export class ShoppingService {
  private weekPlanInclude = {
    ingredient: {
      include: {
        conversions: true,
        variants: true,
      },
    },
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
                    cookedVariant: true,
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
            cookedVariant: true,
          },
        },
      },
    },
  };

  private async getSharingContext(userId: number): Promise<{
    householdId: number | null;
    memberUserIds: number[];
    shareHome: boolean;
    shareShopping: boolean;
  }> {
    const member = await prisma.householdMember.findFirst({
      where: { userId },
      select: { householdId: true },
    });

    if (!member?.householdId) {
      return {
        householdId: null,
        memberUserIds: [userId],
        shareHome: false,
        shareShopping: false,
      };
    }

    const household = await prisma.household.findUnique({
      where: { id: member.householdId },
      select: { shareHome: true, shareShopping: true },
    });

    const members = await prisma.householdMember.findMany({
      where: { householdId: member.householdId },
      select: { userId: true },
    });

    return {
      householdId: member.householdId,
      memberUserIds: members.map((m) => m.userId),
      shareHome: !!household?.shareHome,
      shareShopping: !!household?.shareShopping,
    };
  }

  async getWeekPlan(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<WeekPlanWithDetails[]> {
    const plans = await prisma.weekPlan.findMany({
      where: {
        userId,
        plannedDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: this.weekPlanInclude,
      orderBy: { plannedDate: "asc" },
    });

    return plans.map((plan) => this.mapWeekPlanWithDetails(plan));
  }

  async addToWeekPlan(
    data: CreateWeekPlanDto,
    userId: number,
  ): Promise<
    WeekPlanWithDetails & {
      autoPrepsCreated?: {
        recipeId: number;
        title: string;
        servings: number;
      }[];
    }
  > {
    const plannedDate = new Date(data.plannedDate + "T12:00:00");

    // --- Ingredient-only entry (no recipe) ---
    if (data.ingredientId && !data.recipeId) {
      const ingredient = await prisma.ingredient.findUnique({
        where: { id: data.ingredientId },
      });
      if (!ingredient) {
        throw new Error("Ingrediente no encontrado");
      }

      const plan = await prisma.weekPlan.create({
        data: {
          plannedDate,
          servings: 1,
          type: "meal",
          userId,
          ingredientId: data.ingredientId,
          ingredientQty: data.ingredientQty ?? 1,
          ingredientUnit: data.ingredientUnit ?? ingredient.unit,
        },
        include: this.weekPlanInclude,
      });

      return this.mapWeekPlanWithDetails(plan);
    }

    if (!data.recipeId) {
      throw new Error("Debe especificar recipeId o ingredientId");
    }

    const recipe = await prisma.recipe.findFirst({
      where: {
        id: data.recipeId,
        OR: [{ userId }, { isPublic: true }],
      },
      include: {
        components: {
          include: {
            options: {
              include: {
                recipe: true,
              },
            },
          },
        },
      },
    });

    if (!recipe) {
      throw new Error("Receta no encontrada");
    }

    const requestedServings = data.servings || recipe.servings;
    const planType = data.type || "meal";

    const plan = await prisma.weekPlan.create({
      data: {
        plannedDate,
        servings: requestedServings,
        type: planType,
        userId,
        recipeId: data.recipeId,
        ...(data.selections &&
          data.selections.length > 0 && {
            selections: {
              create: data.selections.map((optionId) => ({
                optionId,
              })),
            },
          }),
      },
      include: this.weekPlanInclude,
    });

    const result = this.mapWeekPlanWithDetails(plan);
    const autoPrepsCreated: {
      recipeId: number;
      title: string;
      servings: number;
    }[] = [];

    // If adding as meal, check if we have enough of this recipe and sub-recipes
    if (planType === "meal") {
      const selections = data.selections || [];

      // Get all recipes the user has at home
      const homeRecipes = await prisma.homeItem.findMany({
        where: { userId, recipeId: { not: null } },
      });
      const homeRecipeServings = new Map<number, number>();
      for (const item of homeRecipes) {
        if (item.recipeId) {
          const current = homeRecipeServings.get(item.recipeId) || 0;
          homeRecipeServings.set(item.recipeId, current + item.quantity);
        }
      }

      // Get all planned meals that will consume recipes BEFORE or ON this date (not yet consumed)
      // EXCLUDE the meal we just added - we'll account for it when checking if we need preps
      const plannedMeals = await prisma.weekPlan.findMany({
        where: {
          userId,
          type: "meal",
          consumed: false,
          plannedDate: { lte: plannedDate },
          id: { not: plan.id },
        },
        include: {
          recipe: {
            include: {
              components: {
                include: {
                  options: { include: { recipe: true } },
                },
              },
            },
          },
          selections: true,
        },
      });

      // Get all planned preps that will produce recipes BEFORE this date (already cooked)
      const plannedPreps = await prisma.weekPlan.findMany({
        where: {
          userId,
          type: "prep",
          cooked: true,
          plannedDate: { lt: plannedDate },
        },
      });

      // Calculate net available servings per recipe
      // Start with what's at home + what will be produced by cooked preps
      const availableServings = new Map<number, number>(homeRecipeServings);

      // Add servings from cooked preps (they added to home inventory)
      // Actually, cooked preps already added to homeRecipes, so skip this

      // Subtract servings of SUB-RECIPES that will be consumed by planned meals before/on this date
      for (const meal of plannedMeals) {
        if (!meal.recipe) continue;

        const mealRatio = meal.servings / meal.recipe.servings;

        for (const comp of meal.recipe.components || []) {
          const mealSelections = meal.selections || [];
          let selectedOption;

          if (mealSelections.length > 0) {
            const selectedSel = mealSelections.find((s: any) =>
              comp.options.some((o: any) => o.id === s.optionId),
            );
            if (selectedSel) {
              selectedOption = comp.options.find(
                (o: any) => o.id === selectedSel.optionId,
              );
            } else if (comp.isOptional) {
              continue;
            } else {
              selectedOption =
                comp.options.find((o: any) => o.isDefault) || comp.options[0];
            }
          } else {
            selectedOption =
              comp.options.find((o: any) => o.isDefault) || comp.options[0];
            if (comp.isOptional && !comp.defaultEnabled) continue;
          }

          if (selectedOption?.recipe) {
            const subRecipeId = selectedOption.recipe.id;
            // Default to 1 serving of sub-recipe per serving of main recipe
            const usedServings =
              (selectedOption.recipeServings || 1) * mealRatio;
            const current = availableServings.get(subRecipeId) || 0;
            availableServings.set(subRecipeId, current - usedServings);
          }
        }
      }

      // Get pending preps (not cooked) that will add servings
      const pendingPreps = await prisma.weekPlan.findMany({
        where: {
          userId,
          type: "prep",
          cooked: false,
          plannedDate: { lte: plannedDate },
        },
      });

      for (const prep of pendingPreps) {
        if (prep.recipeId) {
          const current = availableServings.get(prep.recipeId) || 0;
          availableServings.set(prep.recipeId, current + prep.servings);
        }
      }

      const ratio = requestedServings / recipe.servings;

      // Check if the MAIN recipe needs a prep (not enough prepared at home)
      const mainRecipeAvailable = availableServings.get(data.recipeId!) || 0;
      if (mainRecipeAvailable < requestedServings) {
        const shortage = requestedServings - Math.max(0, mainRecipeAvailable);
        const batchesNeeded = Math.ceil(shortage / recipe.servings);

        for (let i = 0; i < batchesNeeded; i++) {
          await prisma.weekPlan.create({
            data: {
              plannedDate,
              servings: recipe.servings,
              type: "prep",
              userId,
              recipeId: data.recipeId!,
            },
          });
        }

        autoPrepsCreated.push({
          recipeId: data.recipeId!,
          title: recipe.title,
          servings: recipe.servings * batchesNeeded,
        });

        availableServings.set(
          data.recipeId!,
          (mainRecipeAvailable || 0) +
            recipe.servings * batchesNeeded -
            requestedServings,
        );
      }

      // Check SUB-RECIPES in components
      for (const comp of recipe.components || []) {
        // Find the selected option for this component
        let selectedOption;

        if (selections.length > 0) {
          const selectedOptId = selections.find((optId) =>
            comp.options.some((o: any) => o.id === optId),
          );
          if (selectedOptId) {
            selectedOption = comp.options.find(
              (o: any) => o.id === selectedOptId,
            );
          } else if (comp.isOptional) {
            continue;
          } else {
            selectedOption =
              comp.options.find((o: any) => o.isDefault) || comp.options[0];
          }
        } else {
          selectedOption =
            comp.options.find((o: any) => o.isDefault) || comp.options[0];
          if (comp.isOptional && !comp.defaultEnabled) continue;
        }

        if (!selectedOption) continue;

        // If the selected option is a recipe, check if user has enough (considering future consumption)
        if (selectedOption.recipe) {
          const subRecipe = selectedOption.recipe;
          const subRecipeServings = subRecipe.servings || 1;
          // recipeServings = how many servings of the sub-recipe are used PER serving of the main recipe
          // Default to 1 if not specified (1 serving of sub-recipe per serving of main recipe)
          const usedServingsPerServing = selectedOption.recipeServings || 1;
          const neededServings = usedServingsPerServing * ratio;

          // Get available servings (already accounts for planned consumption)
          const available = availableServings.get(subRecipe.id) || 0;

          if (available < neededServings) {
            // Calculate how many servings we're short
            const shortage = neededServings - Math.max(0, available);

            // Calculate how many batches we need (each batch produces subRecipeServings)
            const batchesNeeded = Math.ceil(shortage / subRecipeServings);

            // Create multiple preps if needed
            for (let i = 0; i < batchesNeeded; i++) {
              await prisma.weekPlan.create({
                data: {
                  plannedDate,
                  servings: subRecipeServings,
                  type: "prep",
                  userId,
                  recipeId: subRecipe.id,
                },
              });
            }

            autoPrepsCreated.push({
              recipeId: subRecipe.id,
              title: subRecipe.title,
              servings: subRecipeServings * batchesNeeded,
            });

            // Update available servings for next iterations
            availableServings.set(
              subRecipe.id,
              (available || 0) +
                subRecipeServings * batchesNeeded -
                neededServings,
            );
          }
        }
      }
    }

    // Add ingredients to shopping list
    await this.addIngredientsToShoppingList(plan.id, userId);

    if (autoPrepsCreated.length > 0) {
      // Also add ingredients for auto-created preps
      const newPreps = await prisma.weekPlan.findMany({
        where: {
          userId,
          plannedDate,
          type: "prep",
          recipeId: { in: autoPrepsCreated.map((p) => p.recipeId) },
        },
      });
      for (const prep of newPreps) {
        await this.addIngredientsToShoppingList(prep.id, userId);
      }

      // Check alerts for planned recipe
      if (data.recipeId && planType === "meal") {
        const homeItems = await prisma.homeItem.findMany({
          where: { userId, recipeId: data.recipeId },
        });
        const totalStock = homeItems.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );
        await alertService.checkAndCreateAlerts({
          userId,
          recipeId: data.recipeId,
          triggerType: "PLANNING",
          beforeQty: totalStock,
          afterQty: Math.max(0, totalStock - requestedServings),
        });
      }

      return { ...result, autoPrepsCreated };
    }

    // Check alerts for planned recipe
    if (data.recipeId && planType === "meal") {
      const homeItems = await prisma.homeItem.findMany({
        where: { userId, recipeId: data.recipeId },
      });
      const totalStock = homeItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      await alertService.checkAndCreateAlerts({
        userId,
        recipeId: data.recipeId,
        triggerType: "PLANNING",
        beforeQty: totalStock,
        afterQty: Math.max(0, totalStock - requestedServings),
      });
    }

    return result;
  }

  private async addIngredientsToShoppingList(
    weekPlanId: number,
    userId: number,
  ) {
    const plan = await prisma.weekPlan.findUnique({
      where: { id: weekPlanId },
      include: this.weekPlanInclude,
    });

    if (!plan || !plan.recipe) return;

    const ratio = plan.servings / plan.recipe.servings;
    const ingredientMap = new Map<number, { quantity: number; unit: string }>();

    // Collect direct ingredients
    // La cantidad en la receta siempre es CRUDA
    for (const ri of plan.recipe.ingredients || []) {
      // La cantidad en la receta ya es cruda, no necesitamos convertir
      const rawQuantity = ri.quantity * ratio;
      const unit = ri.unit || ri.ingredient.unit;

      const existing = ingredientMap.get(ri.ingredient.id);
      if (existing) {
        existing.quantity += rawQuantity;
      } else {
        ingredientMap.set(ri.ingredient.id, { quantity: rawQuantity, unit });
      }
    }

    // Collect component ingredients
    const selections = plan.selections || [];
    for (const comp of plan.recipe.components || []) {
      let selectedOption;

      if (selections.length > 0) {
        const selectedSel = selections.find((s: any) =>
          comp.options.some((o: any) => o.id === s.optionId),
        );
        if (selectedSel) {
          selectedOption = comp.options.find(
            (o: any) => o.id === selectedSel.optionId,
          );
        } else if (comp.isOptional) {
          continue;
        } else {
          selectedOption =
            comp.options.find((o: any) => o.isDefault) || comp.options[0];
        }
      } else {
        selectedOption =
          comp.options.find((o: any) => o.isDefault) || comp.options[0];
        if (comp.isOptional && !comp.defaultEnabled) continue;
      }

      if (!selectedOption) continue;

      if (selectedOption.ingredient) {
        const ing = selectedOption.ingredient;
        // La cantidad en la receta ya es cruda
        const rawQuantity = (selectedOption.quantity || 100) * ratio;
        const unit = selectedOption.unit || ing.unit;

        const existing = ingredientMap.get(ing.id);
        if (existing) {
          existing.quantity += rawQuantity;
        } else {
          ingredientMap.set(ing.id, { quantity: rawQuantity, unit });
        }
      }
      // Note: sub-recipes handled by their own prep plans
    }

    // Get what user already has at home (considering weight factor for cooked items)
    const homeItems = await prisma.homeItem.findMany({
      where: { userId, ingredientId: { not: null } },
      include: {
        variant: true,
      },
    });
    const homeQuantities = new Map<number, number>();
    for (const item of homeItems) {
      if (item.ingredientId) {
        // Convert to "raw equivalent" using the weight factor
        // If item has a variant with weightFactor > 1, it means the item is cooked
        // and we need to convert back to raw quantity for comparison
        const weightFactor = (item as any).variant?.weightFactor || 1;
        const rawEquivalent = item.quantity / weightFactor;

        const current = homeQuantities.get(item.ingredientId) || 0;
        homeQuantities.set(item.ingredientId, current + rawEquivalent);
      }
    }

    // Add to shopping list only what's needed
    for (const [ingredientId, { quantity, unit }] of ingredientMap) {
      const atHome = homeQuantities.get(ingredientId) || 0;
      const toBuy = Math.max(0, quantity - atHome);

      if (toBuy > 0) {
        // Check if already exists for this weekPlan
        const existing = await prisma.shoppingItem.findFirst({
          where: { userId, ingredientId, weekPlanId },
        });

        if (existing) {
          await prisma.shoppingItem.update({
            where: { id: existing.id },
            data: { quantity: toBuy, unit },
          });
        } else {
          await prisma.shoppingItem.create({
            data: {
              userId,
              ingredientId,
              weekPlanId,
              quantity: toBuy,
              unit,
            },
          });
        }
      }

      // Update home quantities for next ingredients
      homeQuantities.set(ingredientId, Math.max(0, atHome - quantity));
    }
  }

  async removeFromWeekPlan(id: number, userId: number): Promise<boolean> {
    const plan = await prisma.weekPlan.findFirst({
      where: { id, userId },
    });

    if (!plan) return false;

    await prisma.weekPlan.delete({
      where: { id },
    });

    return true;
  }

  async updatePlanDate(
    id: number,
    newDate: Date,
    userId: number,
  ): Promise<WeekPlanWithDetails | null> {
    const plan = await prisma.weekPlan.findFirst({
      where: { id, userId },
    });

    if (!plan) return null;

    const updatedPlan = await prisma.weekPlan.update({
      where: { id },
      data: { plannedDate: newDate },
      include: this.weekPlanInclude,
    });

    return this.mapWeekPlanWithDetails(updatedPlan);
  }

  async generateShoppingList(
    userId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ShoppingItem[]> {
    const sharing = await this.getSharingContext(userId);
    const planUserIds = sharing.shareShopping
      ? sharing.memberUserIds
      : [userId];
    const homeWhere =
      sharing.shareHome && sharing.householdId
        ? { householdId: sharing.householdId, ingredientId: { not: null } }
        : { userId, ingredientId: { not: null } };

    // Si no se pasan fechas, mostrar todo desde hoy en adelante (sin lÃ­mite)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateFilter =
      startDate && endDate ? { gte: startDate, lte: endDate } : { gte: today };

    // Los ingredientes se necesitan para los PREP pendientes (preparaciones sin cocinar)
    // Los MEAL consumen recetas ya preparadas del inventario, no ingredientes directos
    const preps = await prisma.weekPlan.findMany({
      where: {
        userId: { in: planUserIds },
        plannedDate: dateFilter,
        type: "prep",
        cooked: false,
      },
      include: this.weekPlanInclude,
    });

    // TambiÃ©n incluir meals que NO tienen receta preparada en casa
    const meals = await prisma.weekPlan.findMany({
      where: {
        userId: { in: planUserIds },
        plannedDate: dateFilter,
        type: "meal",
        cooked: false,
      },
      include: this.weekPlanInclude,
    });

    // Obtener recetas preparadas en casa para saber cuÃ¡les meals no necesitan ingredientes
    const homeRecipes = await prisma.homeItem.findMany({
      where:
        sharing.shareHome && sharing.householdId
          ? { householdId: sharing.householdId, recipeId: { not: null } }
          : { userId, recipeId: { not: null } },
    });
    const homeRecipeServings = new Map<number, number>();
    for (const item of homeRecipes) {
      if (item.recipeId) {
        const current = homeRecipeServings.get(item.recipeId) || 0;
        homeRecipeServings.set(item.recipeId, current + item.quantity);
      }
    }

    // Calcular servings de meals por receta
    const mealServingsByRecipe = new Map<number, number>();
    for (const meal of meals) {
      if (meal.recipeId) {
        const current = mealServingsByRecipe.get(meal.recipeId) || 0;
        mealServingsByRecipe.set(meal.recipeId, current + meal.servings);
      }
    }

    // Los meals que necesitan mÃ¡s raciones de las que hay preparadas, necesitan ingredientes
    // para las raciones faltantes (si no hay un prep que las cubra)
    const mealsNeedingIngredients: typeof meals = [];
    for (const meal of meals) {
      if (!meal.recipeId) continue;
      const homeServings = homeRecipeServings.get(meal.recipeId) || 0;
      const totalMealServings = mealServingsByRecipe.get(meal.recipeId) || 0;

      // Si no hay suficientes raciones preparadas y no hay prep pendiente para esta receta
      const hasPrep = preps.some((p) => p.recipeId === meal.recipeId);
      if (homeServings < totalMealServings && !hasPrep) {
        // Calcular solo las raciones faltantes
        const shortfall = totalMealServings - homeServings;
        if (shortfall > 0) {
          mealsNeedingIngredients.push({
            ...meal,
            servings: shortfall, // Solo calcular ingredientes para las raciones faltantes
          } as typeof meal);
        }
      }
    }

    // AÃ±adir tambiÃ©n entradas directas de ingrediente (sin receta)
    const ingredientOnlyPlans = meals.filter(
      (m) => !!m.ingredientId && !m.recipeId,
    );

    // Combinar preps pendientes + meals que necesitan ingredientes + ingredientes directos
    const plans = [
      ...preps,
      ...mealsNeedingIngredients,
      ...ingredientOnlyPlans,
    ];

    // Calcular ingredientes necesarios EN EQUIVALENTE CRUDO (raw equivalent)
    // Esto permite comparar correctamente con el inventario
    const ingredientNeeds = new Map<
      number,
      { rawEquivalent: number; name: string; ingredientData: any }
    >();

    for (const plan of plans) {
      // Plan de ingrediente directo (sin receta)
      if (plan.ingredientId && !plan.recipeId && plan.ingredient) {
        const usedUnit = plan.ingredientUnit || plan.ingredient.unit;
        const quantity = plan.ingredientQty || 0;
        const rawEquivalent = this.convertToBaseUnit(
          quantity,
          usedUnit,
          plan.ingredient,
        );

        const existing = ingredientNeeds.get(plan.ingredientId);
        if (existing) {
          existing.rawEquivalent += rawEquivalent;
        } else {
          ingredientNeeds.set(plan.ingredientId, {
            rawEquivalent,
            name: plan.ingredient.name,
            ingredientData: plan.ingredient,
          });
        }
        continue;
      }

      if (!plan.recipe) continue;
      const ratio = plan.servings / plan.recipe.servings;

      // Ingredientes directos
      for (const ri of plan.recipe.ingredients || []) {
        // 1. Convertir a unidad base (gramos)
        const usedUnit = ri.unit || ri.ingredient.unit;
        const quantityInGrams = this.convertToBaseUnit(
          ri.quantity * ratio,
          usedUnit,
          ri.ingredient,
        );

        // 2. Obtener el weightFactor del estado del ingrediente en la receta
        // Usar 'variant' (estado especificado en receta) - si estÃ¡ "Cocinado" (wf=3), 100g cocinado = 33g crudo
        const variantWeightFactor = (ri as any).variant?.weightFactor || 1;
        const rawEquivalent = quantityInGrams / variantWeightFactor;

        console.log(
          `[SHOPPING] ${ri.ingredient.name}: qty=${ri.quantity}, ratio=${ratio}, inGrams=${quantityInGrams}, variant=${(ri as any).variant?.name}, wf=${variantWeightFactor}, rawEq=${rawEquivalent}`,
        );

        const existing = ingredientNeeds.get(ri.ingredient.id);
        if (existing) {
          existing.rawEquivalent += rawEquivalent;
        } else {
          ingredientNeeds.set(ri.ingredient.id, {
            rawEquivalent,
            name: ri.ingredient.name,
            ingredientData: ri.ingredient,
          });
        }
      }

      // Componentes
      const selections = plan.selections || [];
      for (const comp of plan.recipe.components || []) {
        let selectedOption;
        if (selections.length > 0) {
          const sel = selections.find((s: any) =>
            comp.options.some((o: any) => o.id === s.optionId),
          );
          if (sel) {
            selectedOption = comp.options.find(
              (o: any) => o.id === sel.optionId,
            );
          } else if (comp.isOptional) {
            continue;
          } else {
            selectedOption =
              comp.options.find((o: any) => o.isDefault) || comp.options[0];
          }
        } else {
          selectedOption =
            comp.options.find((o: any) => o.isDefault) || comp.options[0];
          if (comp.isOptional && !comp.defaultEnabled) continue;
        }

        if (selectedOption?.ingredient) {
          const usedUnit =
            selectedOption.unit || selectedOption.ingredient.unit;
          const quantityInGrams = this.convertToBaseUnit(
            (selectedOption.quantity || 100) * ratio,
            usedUnit,
            selectedOption.ingredient,
          );

          // Obtener weightFactor del estado de la opciÃ³n
          const variantWeightFactor =
            (selectedOption as any).variant?.weightFactor || 1;
          const rawEquivalent = quantityInGrams / variantWeightFactor;

          const existing = ingredientNeeds.get(selectedOption.ingredient.id);
          if (existing) {
            existing.rawEquivalent += rawEquivalent;
          } else {
            ingredientNeeds.set(selectedOption.ingredient.id, {
              rawEquivalent,
              name: selectedOption.ingredient.name,
              ingredientData: selectedOption.ingredient,
            });
          }
        }
      }
    }

    // Obtener inventario actual (convertido a equivalente crudo)
    const homeItems = await prisma.homeItem.findMany({
      where: homeWhere,
      include: { variant: true },
    });
    const homeQuantities = new Map<number, number>();
    for (const item of homeItems) {
      if (item.ingredientId) {
        // Convertir inventario a equivalente crudo
        // 300g cocinado (wf=2.5) = 120g crudo equivalente
        const weightFactor = item.variant?.weightFactor || 1;
        const rawEquivalent = item.quantity / weightFactor;
        const current = homeQuantities.get(item.ingredientId) || 0;
        homeQuantities.set(item.ingredientId, current + rawEquivalent);
      }
    }

    // Calcular quÃ© comprar (en equivalente crudo - lo que realmente compras)
    const result: ShoppingItem[] = [];
    for (const [
      ingredientId,
      { rawEquivalent, name, ingredientData },
    ] of ingredientNeeds) {
      const atHomeRaw = homeQuantities.get(ingredientId) || 0;
      const toBuyRaw = Math.max(0, rawEquivalent - atHomeRaw);
      const baseUnit = ingredientData.unit; // g o ml

      // Calcular cantidad en unidad preferida si existe
      let preferredUnit: string | null = null;
      let preferredQuantity: number | null = null;

      if (ingredientData.preferredUnit && toBuyRaw > 0) {
        const conversions = ingredientData.conversions || [];
        const conversion = conversions.find(
          (c: any) =>
            c.unitName.toLowerCase() ===
            ingredientData.preferredUnit.toLowerCase(),
        );

        if (conversion && conversion.gramsPerUnit > 0) {
          preferredUnit = ingredientData.preferredUnit;
          preferredQuantity =
            Math.round((toBuyRaw / conversion.gramsPerUnit) * 10) / 10;
        }
      }

      result.push({
        ingredientId,
        name,
        unit: baseUnit,
        totalQuantity: Math.round(rawEquivalent * 10) / 10,
        quantityAtHome: Math.round(atHomeRaw * 10) / 10,
        quantityToBuy: Math.round(toBuyRaw * 10) / 10,
        preferredUnit,
        preferredQuantity,
      });
    }

    const resultList = result
      .filter((item) => item.quantityToBuy > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    // TambiÃ©n incluir items manuales de la lista de compra (aÃ±adidos desde alertas, etc.)
    const manualItems = await prisma.shoppingItem.findMany({
      where: {
        ...(sharing.shareShopping && sharing.householdId
          ? { householdId: sharing.householdId }
          : { userId }),
        weekPlanId: null,
        purchased: false,
      },
      include: {
        ingredient: true,
      },
    });

    for (const item of manualItems) {
      const existing = resultList.find(
        (r) => r.ingredientId === item.ingredientId,
      );
      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.quantityToBuy += item.quantity;
      } else if (item.ingredientId && item.ingredient) {
        resultList.push({
          ingredientId: item.ingredientId,
          name: item.ingredient.name,
          unit: item.unit,
          totalQuantity: item.quantity,
          quantityAtHome: 0,
          quantityToBuy: item.quantity,
          preferredUnit: null,
          preferredQuantity: null,
        });
      }
    }

    return resultList.sort((a, b) => a.name.localeCompare(b.name));
  }

  async addManualItems(
    items: { ingredientId: number; quantity: number; unit: string }[],
    userId: number,
  ): Promise<{ added: number }> {
    const sharing = await this.getSharingContext(userId);
    const shoppingOwnerFilter =
      sharing.shareShopping && sharing.householdId
        ? { householdId: sharing.householdId }
        : { userId };
    let added = 0;

    for (const item of items) {
      const existing = await prisma.shoppingItem.findFirst({
        where: {
          ...shoppingOwnerFilter,
          ingredientId: item.ingredientId,
          weekPlanId: null,
          purchased: false,
        },
      });

      if (existing) {
        await prisma.shoppingItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await prisma.shoppingItem.create({
          data: {
            userId,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
            ...(sharing.shareShopping && sharing.householdId
              ? { householdId: sharing.householdId }
              : {}),
          },
        });
      }
      added++;
    }

    return { added };
  }

  // Convertir cantidad a unidad base (g o ml)
  private convertToBaseUnit(
    quantity: number,
    usedUnit: string,
    ingredient: any,
  ): number {
    const baseUnit = ingredient.unit; // 'g' o 'ml'
    const u = usedUnit.toLowerCase();

    // Ya estÃ¡ en unidad base
    if (u === baseUnit || u === "g" || u === "ml") {
      return quantity;
    }

    // Conversiones estÃ¡ndar
    if (u === "kg" || u === "l") {
      return quantity * 1000;
    }

    // Buscar en conversiones del ingrediente
    const conversions = ingredient.conversions || [];
    const conversion = conversions.find(
      (c: any) => c.unitName.toLowerCase() === u,
    );
    if (conversion) {
      return quantity * conversion.gramsPerUnit;
    }

    // Si no hay conversiÃ³n, asumir que ya estÃ¡ en unidad base
    return quantity;
  }

  async markShoppingItemPurchased(
    ingredientId: number,
    userId: number,
  ): Promise<void> {
    const sharing = await this.getSharingContext(userId);
    await prisma.shoppingItem.updateMany({
      where: {
        ...(sharing.shareShopping && sharing.householdId
          ? { householdId: sharing.householdId }
          : { userId }),
        ingredientId,
        purchased: false,
      },
      data: { purchased: true },
    });
  }

  async clearPurchasedItems(userId: number): Promise<void> {
    const sharing = await this.getSharingContext(userId);
    await prisma.shoppingItem.deleteMany({
      where: {
        ...(sharing.shareShopping && sharing.householdId
          ? { householdId: sharing.householdId }
          : { userId }),
        purchased: true,
      },
    });
  }

  private getQuantityInBaseUnit(
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

    if (u === "kg") return quantity * 1000;
    if (u === "l") return quantity * 1000;

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

  private addRecipeIngredients(
    recipe: any,
    ratio: number,
    map: Map<number, ShoppingItem>,
    selections: any[] = [],
    homeRecipeServings: Map<number, number> = new Map(),
  ) {
    for (const ri of recipe.ingredients || []) {
      const usedUnit = ri.unit || ri.ingredient.unit;
      const baseUnit = ri.ingredient.unit;
      const conversions = ri.ingredient.conversions || [];

      const quantityInBase = this.getQuantityInBaseUnit(
        ri.quantity,
        usedUnit,
        baseUnit,
        conversions,
      );
      const adjustedQuantity = quantityInBase * ratio;

      const existing = map.get(ri.ingredient.id);
      if (existing) {
        existing.totalQuantity += adjustedQuantity;
      } else {
        map.set(ri.ingredient.id, {
          ingredientId: ri.ingredient.id,
          name: ri.ingredient.name,
          unit: baseUnit,
          totalQuantity: adjustedQuantity,
          quantityAtHome: 0,
          quantityToBuy: 0,
        });
      }
    }

    for (const comp of recipe.components || []) {
      const selectedOption = selections.find((s: any) =>
        comp.options.some((o: any) => o.id === s.optionId),
      );

      let option;
      if (selections.length > 0) {
        // User made explicit selections - only use what they selected
        if (selectedOption) {
          option = comp.options.find(
            (o: any) => o.id === selectedOption.optionId,
          );
        } else if (comp.isOptional) {
          // Optional component not in selections = user disabled it
          continue;
        } else {
          // Required component not in selections - use default
          option =
            comp.options.find((o: any) => o.isDefault) || comp.options[0];
        }
      } else {
        // No selections provided - use defaults
        option = comp.options.find((o: any) => o.isDefault) || comp.options[0];
        // Skip optional components that are disabled by default
        if (comp.isOptional && !comp.defaultEnabled) continue;
      }

      if (!option) continue;

      if (option.recipe) {
        const recipeServings = option.recipe.servings || 1;
        const usedServings = option.recipeServings || recipeServings;
        const recipeRatio = ratio * (usedServings / recipeServings);

        // Check if user has this sub-recipe at home
        const homeServings = homeRecipeServings.get(option.recipe.id) || 0;
        if (homeServings >= usedServings * ratio) {
          // User has enough of this recipe at home, skip its ingredients
          continue;
        }

        // Calculate how much we need to make
        const servingsNeeded = Math.max(0, usedServings * ratio - homeServings);
        const adjustedRatio = servingsNeeded / recipeServings;

        if (adjustedRatio > 0) {
          this.addRecipeIngredients(
            option.recipe,
            adjustedRatio,
            map,
            [],
            homeRecipeServings,
          );
        }
      } else if (option.ingredient) {
        const usedUnit = option.unit || option.ingredient.unit;
        const baseUnit = option.ingredient.unit;
        const conversions = option.ingredient.conversions || [];

        const quantityInBase = this.getQuantityInBaseUnit(
          option.quantity || 1,
          usedUnit,
          baseUnit,
          conversions,
        );
        const adjustedQuantity = quantityInBase * ratio;

        const existing = map.get(option.ingredient.id);
        if (existing) {
          existing.totalQuantity += adjustedQuantity;
        } else {
          map.set(option.ingredient.id, {
            ingredientId: option.ingredient.id,
            name: option.ingredient.name,
            unit: baseUnit,
            totalQuantity: adjustedQuantity,
            quantityAtHome: 0,
            quantityToBuy: 0,
          });
        }
      }
    }
  }

  async markAsCooked(
    planId: number,
    userId: number,
    leftoverServings: number,
    leftoverLocation: string = "nevera",
  ): Promise<{
    success: boolean;
    ingredientsDeducted: number;
    leftoversSaved: boolean;
  }> {
    const plan = await prisma.weekPlan.findFirst({
      where: { id: planId, userId },
      include: this.weekPlanInclude,
    });

    if (!plan) {
      throw new Error("Plan no encontrado");
    }

    const sharing = await this.getSharingContext(userId);
    const homeWhereBase =
      sharing.shareHome && sharing.householdId
        ? { householdId: sharing.householdId }
        : { userId };

    let ingredientsDeducted = 0;
    const ingredientsNeeded = new Map<
      number,
      { quantity: number; unit: string }
    >();

    if (plan.recipe) {
      const ratio = plan.servings / plan.recipe.servings;
      this.collectIngredients(
        plan.recipe,
        ratio,
        ingredientsNeeded,
        plan.selections || [],
      );
    }

    for (const [ingredientId, needed] of ingredientsNeeded) {
      let remainingToDeduct = needed.quantity;

      const homeItems = await prisma.homeItem.findMany({
        where: { ...homeWhereBase, ingredientId },
        include: { ingredient: { include: { conversions: true } } },
        orderBy: { addedAt: "asc" },
      });

      for (const item of homeItems) {
        if (remainingToDeduct <= 0) break;

        const baseUnit = item.ingredient?.unit || "g";
        const conversions = item.ingredient?.conversions || [];
        const itemQuantityInBase = this.getQuantityInBaseUnit(
          item.quantity,
          item.unit,
          baseUnit,
          conversions,
        );

        if (itemQuantityInBase <= remainingToDeduct) {
          remainingToDeduct -= itemQuantityInBase;
          await prisma.homeItem.delete({ where: { id: item.id } });
          ingredientsDeducted++;
        } else {
          const newQuantityInBase = itemQuantityInBase - remainingToDeduct;
          await prisma.homeItem.update({
            where: { id: item.id },
            data: { quantity: newQuantityInBase, unit: baseUnit },
          });
          ingredientsDeducted++;
          remainingToDeduct = 0;
        }
      }
    }

    let leftoversSaved = false;
    if (leftoverServings > 0 && plan.recipeId) {
      await prisma.homeItem.create({
        data: {
          userId,
          ...(sharing.shareHome && sharing.householdId
            ? { householdId: sharing.householdId }
            : {}),
          recipeId: plan.recipeId,
          location: leftoverLocation,
          quantity: leftoverServings,
          unit: "raciones",
        },
      });
      leftoversSaved = true;
    }

    await prisma.weekPlan.update({
      where: { id: planId },
      data: { cooked: true },
    });

    // Check alerts for deducted ingredients
    for (const [ingredientId, needed] of ingredientsNeeded) {
      const remainingItems = await prisma.homeItem.findMany({
        where: { ...homeWhereBase, ingredientId },
      });
      const totalRemaining = remainingItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      await alertService.checkAndCreateAlerts({
        userId,
        ingredientId,
        triggerType: "COOK",
        beforeQty: totalRemaining + needed.quantity,
        afterQty: totalRemaining,
      });
    }

    return { success: true, ingredientsDeducted, leftoversSaved };
  }

  private collectIngredients(
    recipe: any,
    ratio: number,
    map: Map<number, { quantity: number; unit: string }>,
    selections: any[] = [],
  ) {
    for (const ri of recipe.ingredients || []) {
      const usedUnit = ri.unit || ri.ingredient.unit;
      const baseUnit = ri.ingredient.unit;
      const conversions = ri.ingredient.conversions || [];

      const quantityInBase = this.getQuantityInBaseUnit(
        ri.quantity,
        usedUnit,
        baseUnit,
        conversions,
      );

      const current = map.get(ri.ingredient.id);
      if (current) {
        current.quantity += quantityInBase * ratio;
      } else {
        map.set(ri.ingredient.id, {
          quantity: quantityInBase * ratio,
          unit: baseUnit,
        });
      }
    }

    for (const comp of recipe.components || []) {
      const selectedOption = selections.find((s: any) =>
        comp.options.some((o: any) => o.id === s.optionId),
      );

      let option;
      if (selections.length > 0) {
        if (selectedOption) {
          option = comp.options.find(
            (o: any) => o.id === selectedOption.optionId,
          );
        } else if (comp.isOptional) {
          continue;
        } else {
          option =
            comp.options.find((o: any) => o.isDefault) || comp.options[0];
        }
      } else {
        option = comp.options.find((o: any) => o.isDefault) || comp.options[0];
        if (comp.isOptional && !comp.defaultEnabled) continue;
      }

      if (!option) continue;

      if (option.recipe) {
        const recipeServings = option.recipe.servings || 1;
        const usedServings = option.recipeServings || recipeServings;
        const recipeRatio = ratio * (usedServings / recipeServings);
        this.collectIngredients(option.recipe, recipeRatio, map, []);
      } else if (option.ingredient) {
        const usedUnit = option.unit || option.ingredient.unit;
        const baseUnit = option.ingredient.unit;
        const conversions = option.ingredient.conversions || [];

        const quantityInBase = this.getQuantityInBaseUnit(
          option.quantity || 1,
          usedUnit,
          baseUnit,
          conversions,
        );

        const current = map.get(option.ingredient.id);
        if (current) {
          current.quantity += quantityInBase * ratio;
        } else {
          map.set(option.ingredient.id, {
            quantity: quantityInBase * ratio,
            unit: baseUnit,
          });
        }
      }
    }
  }

  async markAsConsumed(
    planId: number,
    userId: number,
  ): Promise<{ success: boolean; servingsDeducted: number }> {
    const plan = await prisma.weekPlan.findFirst({
      where: { id: planId, userId, type: "meal" },
      include: this.weekPlanInclude,
    });

    if (!plan) {
      throw new Error("Plan no encontrado o no es de tipo comida");
    }

    if (plan.consumed) {
      throw new Error("Esta comida ya fue consumida");
    }

    const sharing = await this.getSharingContext(userId);
    const homeWhereBase =
      sharing.shareHome && sharing.householdId
        ? { householdId: sharing.householdId }
        : { userId };

    let servingsDeducted = 0;

    if (plan.recipeId) {
      let remainingServings = plan.servings;

      const homeItems = await prisma.homeItem.findMany({
        where: { ...homeWhereBase, recipeId: plan.recipeId },
        orderBy: { addedAt: "asc" },
      });

      for (const item of homeItems) {
        if (remainingServings <= 0) break;

        if (item.quantity <= remainingServings) {
          remainingServings -= item.quantity;
          servingsDeducted += item.quantity;
          await prisma.homeItem.delete({ where: { id: item.id } });
        } else {
          const newQuantity = item.quantity - remainingServings;
          servingsDeducted += remainingServings;
          await prisma.homeItem.update({
            where: { id: item.id },
            data: { quantity: newQuantity },
          });
          remainingServings = 0;
        }
      }
    }

    await prisma.weekPlan.update({
      where: { id: planId },
      data: { consumed: true },
    });

    // Check alerts for consumed recipe
    if (plan.recipeId) {
      const remainingItems = await prisma.homeItem.findMany({
        where: { ...homeWhereBase, recipeId: plan.recipeId },
      });
      const totalRemaining = remainingItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      await alertService.checkAndCreateAlerts({
        userId,
        recipeId: plan.recipeId,
        triggerType: "CONSUME",
        beforeQty: totalRemaining + servingsDeducted,
        afterQty: totalRemaining,
      });
    }

    return { success: true, servingsDeducted };
  }

  private mapWeekPlanWithDetails(plan: any): WeekPlanWithDetails {
    return {
      id: plan.id,
      plannedDate: plan.plannedDate,
      servings: plan.servings,
      type: plan.type || "meal",
      cooked: plan.cooked || false,
      consumed: plan.consumed || false,
      userId: plan.userId,
      recipeId: plan.recipeId,
      ingredientId: plan.ingredientId || null,
      ingredientQty: plan.ingredientQty || null,
      ingredientUnit: plan.ingredientUnit || null,
      createdAt: plan.createdAt,
      recipe: plan.recipe
        ? {
            id: plan.recipe.id,
            title: plan.recipe.title,
            description: plan.recipe.description,
            instructions: plan.recipe.instructions,
            imageUrl: plan.recipe.imageUrl,
            servings: plan.recipe.servings,
            isPublic: plan.recipe.isPublic,
            userId: plan.recipe.userId,
            createdAt: plan.recipe.createdAt,
            updatedAt: plan.recipe.updatedAt,
            ingredients: (plan.recipe.ingredients || []).map((ri: any) => ({
              id: ri.ingredient.id,
              name: ri.ingredient.name,
              unit: ri.ingredient.unit,
              quantity: ri.quantity,
            })),
            components: (plan.recipe.components || []).map((comp: any) => ({
              id: comp.id,
              name: comp.name,
              sortOrder: comp.sortOrder,
              isOptional: comp.isOptional,
              options: comp.options.map((opt: any) => ({
                id: opt.id,
                name: opt.name,
                isDefault: opt.isDefault,
                recipeId: opt.recipeId,
                ingredientId: opt.ingredientId,
                quantity: opt.quantity,
                unit: opt.unit,
                recipeServings: opt.recipeServings,
              })),
            })),
          }
        : null,
      ingredient: plan.ingredient
        ? {
            id: plan.ingredient.id,
            name: plan.ingredient.name,
            unit: plan.ingredient.unit,
            imageUrl: plan.ingredient.imageUrl || null,
          }
        : null,
      selections: plan.selections
        ? plan.selections.map((s: any) => ({
            optionId: s.optionId,
            option: {
              id: s.option.id,
              name: s.option.name,
              isDefault: s.option.isDefault,
              recipeId: s.option.recipeId,
              ingredientId: s.option.ingredientId,
              quantity: s.option.quantity,
              unit: s.option.unit,
            },
          }))
        : [],
    };
  }
}

export const shoppingService = new ShoppingService();
