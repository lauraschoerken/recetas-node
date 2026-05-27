import { Prisma, PrismaClient } from "@prisma/client";
import {
  HomeItem,
  CreateHomeItemDto,
  UpdateHomeItemDto,
  HomeLocation,
  CookIngredientDto,
} from "../domain";
import { householdService } from "./household.service";
import { alertService } from "./alert.service";

const prisma = new PrismaClient();

const homeItemInclude = {
  ingredient: {
    select: { id: true, name: true },
  },
  recipe: {
    select: { id: true, title: true },
  },
  variant: {
    select: { id: true, name: true, weightFactor: true },
  },
  product: {
    select: { id: true, name: true },
  },
};

export interface HomeItemWithPlanned {
  id: number;
  location: string;
  quantity: number;
  unit: string;
  addedAt: Date;
  expiresAt?: Date | null;
  ingredientId?: number | null;
  variantId?: number | null;
  productId?: number | null;
  ingredient?: { id: number; name: string } | null;
  recipe?: { id: number; title: string } | null;
  variant?: { id: number; name: string; weightFactor: number } | null;
  product?: { id: number; name: string } | null;
  plannedMealServings: number;
  pendingPrepServings: number;
  projectedTotal: number;
}

export class HomeItemService {
  private async getHomeContext(userId: number): Promise<{
    useShared: boolean;
    householdId: number | null;
    memberUserIds: number[];
  }> {
    const householdId = await householdService.getHouseholdId(userId);
    if (!householdId) {
      return { useShared: false, householdId: null, memberUserIds: [userId] };
    }

    const household = await prisma.household.findUnique({
      where: { id: householdId },
      select: { shareHome: true },
    });

    if (!household?.shareHome) {
      return { useShared: false, householdId: null, memberUserIds: [userId] };
    }

    const members = await prisma.householdMember.findMany({
      where: { householdId },
      select: { userId: true },
    });

    return {
      useShared: true,
      householdId,
      memberUserIds: members.map((m) => m.userId),
    };
  }

  async getAll(userId: number): Promise<HomeItemWithPlanned[]> {
    const ctx = await this.getHomeContext(userId);
    const whereClause =
      ctx.useShared && ctx.householdId
        ? { householdId: ctx.householdId }
        : { userId };

    const items = await prisma.homeItem.findMany({
      where: whereClause,
      include: homeItemInclude,
      orderBy: [{ location: "asc" }, { addedAt: "desc" }],
    });

    const { meals, preps, ingredients } =
      await this.getPlannedServingsMap(userId);

    // Calcular consumo por item de ingrediente
    const itemConsumption = this.calculateIngredientConsumption(
      items,
      ingredients,
    );

    return items.map((item) => {
      if (item.recipeId) {
        // Recipe logic (unchanged)
        const mealServings = meals.get(item.recipeId) || 0;
        const prepServings = preps.get(item.recipeId) || 0;
        const projectedTotal = item.quantity + prepServings - mealServings;

        return {
          ...item,
          plannedMealServings: mealServings,
          pendingPrepServings: prepServings,
          projectedTotal: Math.max(0, projectedTotal),
        };
      } else if (item.ingredientId) {
        const consumption = itemConsumption.get(item.id) || 0;
        const projectedTotal = Math.max(0, item.quantity - consumption);

        return {
          ...item,
          plannedMealServings: Math.round(consumption * 10) / 10,
          pendingPrepServings: 0,
          projectedTotal: Math.round(projectedTotal * 10) / 10,
        };
      } else {
        return {
          ...item,
          plannedMealServings: 0,
          pendingPrepServings: 0,
          projectedTotal: item.quantity,
        };
      }
    });
  }

  private calculateIngredientConsumption(
    items: any[],
    ingredients: Map<number, { rawNeeded: number; cookedWeightFactor: number }>,
  ): Map<number, number> {
    const consumption = new Map<number, number>(); // itemId -> cantidad a consumir

    // Agrupar items por ingredientId
    const itemsByIngredient = new Map<number, any[]>();
    for (const item of items) {
      if (item.ingredientId) {
        const list = itemsByIngredient.get(item.ingredientId) || [];
        list.push(item);
        itemsByIngredient.set(item.ingredientId, list);
      }
    }

    // Para cada ingrediente con necesidades
    for (const [ingredientId, needs] of ingredients) {
      const ingredientItems = itemsByIngredient.get(ingredientId) || [];
      if (ingredientItems.length === 0) continue;

      let rawNeeded = needs.rawNeeded;
      const cookedWF = needs.cookedWeightFactor;

      // Ordenar según lo que pide la receta:
      // - Si la receta pide COCINADO (cookedWF > 1): usar primero lo cocinado, luego lo crudo
      // - Si la receta pide CRUDO (cookedWF = 1): usar primero lo crudo, luego lo cocinado
      const sortedItems = [...ingredientItems].sort((a, b) => {
        const wfA = a.variant?.weightFactor || 1;
        const wfB = b.variant?.weightFactor || 1;

        if (cookedWF > 1) {
          // Receta pide cocinado: primero cocinado (wf>1), luego crudo (wf=1)
          return wfB - wfA;
        } else {
          // Receta pide crudo: primero crudo (wf=1), luego cocinado (wf>1)
          return wfA - wfB;
        }
      });

      console.log(
        `[DEBUG] Ingredient ${ingredientId}: rawNeeded=${rawNeeded}, cookedWF=${cookedWF}, items=${sortedItems.length}`,
      );

      for (const item of sortedItems) {
        if (rawNeeded <= 0) break;

        const itemWF = item.variant?.weightFactor || 1;
        const itemQty = item.quantity;

        // Convertir la cantidad del item a crudo equivalente
        const itemRawEquiv = itemQty / itemWF;

        // ¿Cuánto crudo podemos cubrir con este item?
        const rawFromThisItem = Math.min(rawNeeded, itemRawEquiv);

        // Convertir de vuelta a la unidad del item
        const consumeFromItem = rawFromThisItem * itemWF;

        consumption.set(item.id, consumeFromItem);
        rawNeeded -= rawFromThisItem;

        console.log(
          `[DEBUG] Item ${item.id} (${item.variant?.name || "crudo"}, wf=${itemWF}): qty=${itemQty}, rawEquiv=${itemRawEquiv}, consume=${consumeFromItem}, rawRemaining=${rawNeeded}`,
        );
      }
    }

    return consumption;
  }

  async getByLocation(
    userId: number,
    location: HomeLocation,
  ): Promise<HomeItemWithPlanned[]> {
    const ctx = await this.getHomeContext(userId);
    const baseWhere =
      ctx.useShared && ctx.householdId
        ? { householdId: ctx.householdId }
        : { userId };

    // Necesitamos TODOS los items para calcular el consumo correctamente
    const allItems = await prisma.homeItem.findMany({
      where: baseWhere,
      include: homeItemInclude,
    });

    const locationItems = await prisma.homeItem.findMany({
      where: { ...baseWhere, location },
      include: homeItemInclude,
      orderBy: { addedAt: "desc" },
    });

    const { meals, preps, ingredients } =
      await this.getPlannedServingsMap(userId);

    // Calcular consumo usando TODOS los items (para distribuir correctamente)
    const itemConsumption = this.calculateIngredientConsumption(
      allItems,
      ingredients,
    );

    return locationItems.map((item) => {
      if (item.recipeId) {
        const mealServings = meals.get(item.recipeId) || 0;
        const prepServings = preps.get(item.recipeId) || 0;
        const projectedTotal = item.quantity + prepServings - mealServings;

        return {
          ...item,
          plannedMealServings: mealServings,
          pendingPrepServings: prepServings,
          projectedTotal: Math.max(0, projectedTotal),
        };
      } else if (item.ingredientId) {
        const consumption = itemConsumption.get(item.id) || 0;
        const projectedTotal = Math.max(0, item.quantity - consumption);

        return {
          ...item,
          plannedMealServings: Math.round(consumption * 10) / 10,
          pendingPrepServings: 0,
          projectedTotal: Math.round(projectedTotal * 10) / 10,
        };
      } else {
        return {
          ...item,
          plannedMealServings: 0,
          pendingPrepServings: 0,
          projectedTotal: item.quantity,
        };
      }
    });
  }

  private async getPlannedServingsMap(userId: number): Promise<{
    meals: Map<number, number>;
    preps: Map<number, number>;
    ingredients: Map<number, { rawNeeded: number; cookedWeightFactor: number }>; // ingredientId -> { cantidad cruda necesaria, factor de conversión }
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ctx = await this.getHomeContext(userId);

    const futurePlans = await prisma.weekPlan.findMany({
      where: {
        userId: { in: ctx.memberUserIds },
        plannedDate: { gte: today },
        type: "meal",
        cooked: false,
      },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
                variant: true, // El estado en que se usa el ingrediente
                cookedVariant: true,
              },
            },
            components: {
              include: {
                options: {
                  include: {
                    ingredient: true,
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
                ingredient: true,
                variant: true,
                cookedVariant: true,
              },
            },
          },
        },
      },
    });

    const mealServings = new Map<number, number>();
    const prepServings = new Map<number, number>();
    const ingredientNeeds = new Map<
      number,
      { rawNeeded: number; cookedWeightFactor: number }
    >();

    for (const plan of futurePlans) {
      const isMeal = plan.type === "meal" && !plan.consumed;

      if (plan.recipeId) {
        if (isMeal) {
          const current = mealServings.get(plan.recipeId) || 0;
          mealServings.set(plan.recipeId, current + plan.servings);
        }
      }

      // Calculate ingredient needs from this meal
      if (isMeal && plan.recipe) {
        const ratio = plan.servings / plan.recipe.servings;
        console.log(
          `[DEBUG] Plan: ${plan.recipe.title}, servings: ${plan.servings}/${plan.recipe.servings}, ratio: ${ratio}`,
        );

        // Direct ingredients
        for (const ri of plan.recipe.ingredients || []) {
          if (ri.ingredientId) {
            // El variant indica en qué estado está la cantidad especificada
            const variantWF = (ri as any).variant?.weightFactor || 1;
            const specifiedQuantity = ri.quantity * ratio;

            // Convertir la cantidad a CRUDO equivalente
            // Si variant es cocinado (wf > 1), dividir para obtener el equivalente crudo
            const rawQuantity = specifiedQuantity / variantWF;

            console.log(
              `[DEBUG] Direct ing: ${ri.ingredientId}, specifiedQty: ${specifiedQuantity}, variantWF: ${variantWF}, rawEquiv: ${rawQuantity}`,
            );

            const current = ingredientNeeds.get(ri.ingredientId) || {
              rawNeeded: 0,
              cookedWeightFactor: variantWF,
            };
            ingredientNeeds.set(ri.ingredientId, {
              rawNeeded: current.rawNeeded + rawQuantity,
              cookedWeightFactor: variantWF,
            });
          }
        }

        // Component ingredients
        for (const comp of plan.recipe.components || []) {
          let selectedOption;

          if (plan.selections && plan.selections.length > 0) {
            const sel = plan.selections.find((s: any) =>
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

          if (selectedOption?.ingredientId) {
            // El variant indica en qué estado está la cantidad especificada
            const variantWF =
              (selectedOption as any).variant?.weightFactor || 1;
            const specifiedQuantity = (selectedOption.quantity || 100) * ratio;

            // Convertir a CRUDO equivalente
            const rawQuantity = specifiedQuantity / variantWF;

            console.log(
              `[DEBUG] Component ${comp.name}: ing ${selectedOption.ingredientId}, specifiedQty: ${specifiedQuantity}, variantWF: ${variantWF}, rawEquiv: ${rawQuantity}`,
            );

            const current = ingredientNeeds.get(
              selectedOption.ingredientId,
            ) || { rawNeeded: 0, cookedWeightFactor: variantWF };
            ingredientNeeds.set(selectedOption.ingredientId, {
              rawNeeded: current.rawNeeded + rawQuantity,
              cookedWeightFactor: variantWF,
            });
          }
        }
      }

      // Para platos, contar las recetas dentro de las opciones
      if (isMeal && plan.selections) {
        for (const selection of plan.selections) {
          if (selection.option.recipeId) {
            const current = mealServings.get(selection.option.recipeId) || 0;
            mealServings.set(
              selection.option.recipeId,
              current + plan.servings,
            );
          }
        }
      }
    }

    // Get pending preps
    const pendingPreps = await prisma.weekPlan.findMany({
      where: {
        userId: { in: ctx.memberUserIds },
        plannedDate: { gte: today },
        type: "prep",
        cooked: false,
      },
    });

    for (const prep of pendingPreps) {
      if (prep.recipeId) {
        const current = prepServings.get(prep.recipeId) || 0;
        prepServings.set(prep.recipeId, current + prep.servings);
      }
    }

    return {
      meals: mealServings,
      preps: prepServings,
      ingredients: ingredientNeeds,
    };
  }

  async create(userId: number, data: CreateHomeItemDto): Promise<HomeItem> {
    console.log("Create home item:", JSON.stringify(data, null, 2));

    // Si es un producto, crear directamente sin consolidación
    if (data.productId) {
      const householdId = await householdService.getHouseholdId(userId);
      const household = householdId
        ? await prisma.household.findUnique({ where: { id: householdId } })
        : null;

      const item = await prisma.homeItem.create({
        data: {
          location: data.location,
          quantity: data.quantity,
          unit: data.unit,
          expiresAt: data.expiresAt
            ? new Date(data.expiresAt + "T12:00:00")
            : null,
          userId,
          productId: data.productId,
          ...(household?.shareHome ? { householdId } : {}),
        },
        include: homeItemInclude,
      });

      await prisma.homeItemHistory.create({
        data: {
          action: "ADDED",
          quantity: data.quantity,
          unit: data.unit,
          origin: "MANUAL",
          userId,
          homeItemId: item.id,
        },
      });

      return item as unknown as HomeItem;
    }

    let ingredientId = data.ingredientId;

    if (!ingredientId && !data.recipeId && data.ingredientName) {
      const existingIngredient = await prisma.ingredient.findFirst({
        where: {
          name: data.ingredientName.toLowerCase().trim(),
          status: "GLOBAL",
        },
      });

      if (existingIngredient) {
        ingredientId = existingIngredient.id;
      } else {
        const newIngredient = await prisma.ingredient.create({
          data: {
            name: data.ingredientName.toLowerCase().trim(),
            unit: data.unit,
          },
        });
        ingredientId = newIngredient.id;
      }
    }

    const householdId = await householdService.getHouseholdId(userId);
    const household = householdId
      ? await prisma.household.findUnique({ where: { id: householdId } })
      : null;

    // Consolidation: if same ingredient/recipe + same location exists, merge quantities
    const ownerFilter = household?.shareHome ? { householdId } : { userId };

    if (ingredientId && !data.recipeId) {
      // Try exact match first (same variant), then fallback to null variant
      let existing = await prisma.homeItem.findFirst({
        where: {
          ...ownerFilter,
          ingredientId,
          location: data.location,
          variantId: data.variantId || null,
        },
      });
      if (!existing && data.variantId) {
        // If adding with a variant, also try to merge with an item that has no variant
        existing = await prisma.homeItem.findFirst({
          where: {
            ...ownerFilter,
            ingredientId,
            location: data.location,
            variantId: null,
          },
        });
      }
      if (!existing && !data.variantId) {
        // If adding without variant, try to merge with any existing item for this ingredient+location
        existing = await prisma.homeItem.findFirst({
          where: { ...ownerFilter, ingredientId, location: data.location },
        });
      }

      if (existing) {
        const converted = await this.convertToBaseUnit(
          ingredientId,
          data.quantity,
          data.unit,
        );
        const existingConverted = await this.convertToBaseUnit(
          ingredientId,
          existing.quantity,
          existing.unit,
        );
        const totalQty = existingConverted.quantity + converted.quantity;

        const updated = await prisma.homeItem.update({
          where: { id: existing.id },
          data: {
            quantity: totalQty,
            unit: converted.unit,
            ...(data.variantId ? { variantId: data.variantId } : {}),
          },
          include: homeItemInclude,
        });

        await prisma.homeItemHistory.create({
          data: {
            action: "ADDED",
            quantity: data.quantity,
            unit: data.unit,
            origin: "MANUAL",
            userId,
            homeItemId: existing.id,
          },
        });

        return updated as unknown as HomeItem;
      }
    }

    // Recipe consolidation: same recipe + same location → merge servings
    if (data.recipeId && !ingredientId) {
      const existing = await prisma.homeItem.findFirst({
        where: {
          ...ownerFilter,
          recipeId: data.recipeId,
          location: data.location,
        },
      });

      if (existing) {
        const totalQty = existing.quantity + data.quantity;

        const updated = await prisma.homeItem.update({
          where: { id: existing.id },
          data: { quantity: totalQty, unit: data.unit },
          include: homeItemInclude,
        });

        await prisma.homeItemHistory.create({
          data: {
            action: "ADDED",
            quantity: data.quantity,
            unit: data.unit,
            origin: "MANUAL",
            userId,
            homeItemId: existing.id,
          },
        });

        return updated as unknown as HomeItem;
      }
    }

    const item = await prisma.homeItem.create({
      data: {
        location: data.location,
        quantity: data.quantity,
        unit: data.unit,
        expiresAt: data.expiresAt
          ? new Date(data.expiresAt + "T12:00:00")
          : null,
        userId,
        ingredientId,
        recipeId: data.recipeId,
        variantId: data.variantId || null,
        ...(household?.shareHome ? { householdId } : {}),
      },
      include: homeItemInclude,
    });

    // Record history
    await prisma.homeItemHistory.create({
      data: {
        action: "ADDED",
        quantity: data.quantity,
        unit: data.unit,
        origin: "MANUAL",
        userId,
        homeItemId: item.id,
      },
    });

    return item as unknown as HomeItem;
  }

  private async convertToBaseUnit(
    ingredientId: number,
    quantity: number,
    unit: string,
  ): Promise<{ quantity: number; unit: string }> {
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: { conversions: true },
    });
    if (!ingredient) return { quantity, unit };

    const baseUnit = ingredient.preferredUnit || ingredient.unit;
    if (unit === baseUnit) return { quantity, unit };

    // Try to find conversion from current unit to base
    const conversion = ingredient.conversions.find((c) => c.unitName === unit);
    if (conversion) {
      // Convert to grams first, then to preferred unit
      const grams = quantity * conversion.gramsPerUnit;
      const preferredConversion = ingredient.conversions.find(
        (c) => c.unitName === baseUnit,
      );
      if (preferredConversion) {
        return {
          quantity: grams / preferredConversion.gramsPerUnit,
          unit: baseUnit,
        };
      }
      return { quantity: grams, unit: ingredient.unit };
    }
    return { quantity, unit };
  }

  async update(
    id: number,
    userId: number,
    data: UpdateHomeItemDto,
  ): Promise<HomeItem | null> {
    const ctx = await this.getHomeContext(userId);
    const ownerFilter =
      ctx.useShared && ctx.householdId
        ? { householdId: ctx.householdId }
        : { userId };

    const item = await prisma.homeItem.findFirst({
      where: { id, ...ownerFilter },
    });

    if (!item) return null;

    const updated = (await prisma.homeItem.update({
      where: { id },
      data: {
        location: data.location,
        quantity: data.quantity,
        unit: data.unit,
        expiresAt:
          data.expiresAt === null
            ? null
            : data.expiresAt
              ? new Date(data.expiresAt + "T12:00:00")
              : undefined,
      },
      include: homeItemInclude,
    })) as unknown as HomeItem;

    // Trigger recipe stock alert if servings decreased
    if (
      item.recipeId &&
      data.quantity !== undefined &&
      data.quantity < item.quantity
    ) {
      const beforeTotal = await this.getTotalRecipeServings(
        userId,
        item.recipeId,
      );
      const delta = item.quantity - data.quantity;
      await alertService.checkAndCreateAlerts({
        userId,
        recipeId: item.recipeId,
        triggerType: "MANUAL",
        beforeQty: beforeTotal + delta,
        afterQty: beforeTotal,
      });
    }

    return updated;
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const ctx = await this.getHomeContext(userId);
    const ownerFilter =
      ctx.useShared && ctx.householdId
        ? { householdId: ctx.householdId }
        : { userId };

    const item = await prisma.homeItem.findFirst({
      where: { id, ...ownerFilter },
    });

    if (!item) return false;

    await prisma.homeItem.delete({ where: { id } });

    // Trigger recipe stock alert after deletion
    if (item.recipeId) {
      const afterTotal = await this.getTotalRecipeServings(
        userId,
        item.recipeId,
      );
      await alertService.checkAndCreateAlerts({
        userId,
        recipeId: item.recipeId,
        triggerType: "MANUAL",
        beforeQty: afterTotal + item.quantity,
        afterQty: afterTotal,
      });
    }

    return true;
  }

  async deductRecipeServings(
    userId: number,
    recipeId: number,
    servings: number,
  ): Promise<void> {
    const ctx = await this.getHomeContext(userId);
    const whereBase =
      ctx.useShared && ctx.householdId
        ? { householdId: ctx.householdId }
        : { userId };

    const homeItems = await prisma.homeItem.findMany({
      where: { ...whereBase, recipeId },
      orderBy: { addedAt: "asc" },
    });

    let remainingToDeduct = servings;

    for (const item of homeItems) {
      if (remainingToDeduct <= 0) break;

      if (item.quantity <= remainingToDeduct) {
        remainingToDeduct -= item.quantity;
        await prisma.homeItem.delete({ where: { id: item.id } });
      } else {
        await prisma.homeItem.update({
          where: { id: item.id },
          data: { quantity: item.quantity - remainingToDeduct },
        });
        remainingToDeduct = 0;
      }
    }

    // Trigger recipe stock alert after deducting servings
    const afterTotal = await this.getTotalRecipeServings(userId, recipeId);
    await alertService.checkAndCreateAlerts({
      userId,
      recipeId,
      triggerType: "COOK",
      beforeQty: afterTotal + servings,
      afterQty: afterTotal,
    });
  }

  async processConsumedMeals(userId: number): Promise<{ processed: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const consumedPlans = await prisma.weekPlan.findMany({
      where: {
        userId,
        plannedDate: { lt: today },
        type: "meal",
        consumed: false,
        recipeId: { not: null },
      },
    });

    let processed = 0;

    for (const plan of consumedPlans) {
      if (plan.recipeId) {
        const homeItem = await prisma.homeItem.findFirst({
          where: { userId, recipeId: plan.recipeId },
        });

        if (homeItem) {
          await this.deductRecipeServings(userId, plan.recipeId, plan.servings);
        }

        // Mark past meal as processed so this endpoint is idempotent.
        await prisma.weekPlan.update({
          where: { id: plan.id },
          data: { consumed: true },
        });
        processed++;
      }
    }

    return { processed };
  }

  async cookIngredient(
    id: number,
    userId: number,
    data: CookIngredientDto,
  ): Promise<{ success: boolean; cookedItem: HomeItem; message: string }> {
    const ctx = await this.getHomeContext(userId);
    const ownerFilter =
      ctx.useShared && ctx.householdId
        ? { householdId: ctx.householdId }
        : { userId };

    const item = await prisma.homeItem.findFirst({
      where: { id, ...ownerFilter },
      include: {
        ingredient: {
          include: { variants: true },
        },
        variant: true,
      },
    });

    if (!item) {
      throw new Error("Item no encontrado");
    }

    if (!item.ingredientId) {
      throw new Error("Solo se pueden cocinar ingredientes, no recetas");
    }

    const targetVariant = await prisma.ingredientVariant.findUnique({
      where: { id: data.targetVariantId },
    });

    if (!targetVariant || targetVariant.ingredientId !== item.ingredientId) {
      throw new Error("Estado de destino no válido para este ingrediente");
    }

    const currentWeightFactor = item.variant?.weightFactor || 1;
    const targetWeightFactor = targetVariant.weightFactor;

    const quantityToCook = data.quantity || item.quantity;

    if (quantityToCook > item.quantity) {
      throw new Error("No hay suficiente cantidad para cocinar");
    }

    const cookedQuantity =
      (quantityToCook / currentWeightFactor) * targetWeightFactor;

    if (quantityToCook === item.quantity) {
      const updated = await prisma.homeItem.update({
        where: { id },
        data: {
          quantity: cookedQuantity,
          variantId: targetVariant.id,
          location: data.targetLocation || item.location,
        },
        include: homeItemInclude,
      });

      return {
        success: true,
        cookedItem: updated as unknown as HomeItem,
        message: `${quantityToCook}${item.unit} ${item.variant?.name || "crudo"} → ${Math.round(cookedQuantity)}${item.unit} ${targetVariant.name}`,
      };
    } else {
      await prisma.homeItem.update({
        where: { id },
        data: { quantity: item.quantity - quantityToCook },
      });

      const newItem = await prisma.homeItem.create({
        data: {
          userId,
          ...(ctx.useShared && ctx.householdId
            ? { householdId: ctx.householdId }
            : {}),
          ingredientId: item.ingredientId,
          variantId: targetVariant.id,
          quantity: cookedQuantity,
          unit: item.unit,
          location: data.targetLocation || item.location,
        },
        include: homeItemInclude,
      });

      return {
        success: true,
        cookedItem: newItem as unknown as HomeItem,
        message: `${quantityToCook}${item.unit} ${item.variant?.name || "crudo"} → ${Math.round(cookedQuantity)}${item.unit} ${targetVariant.name}`,
      };
    }
  }

  // ── Search ──

  async search(
    userId: number,
    filters: {
      query?: string;
      location?: HomeLocation;
      belowMinimum?: boolean;
      addedByUserId?: number;
    },
  ): Promise<HomeItemWithPlanned[]> {
    const householdId = await householdService.getHouseholdId(userId);
    const household = householdId
      ? await prisma.household.findUnique({ where: { id: householdId } })
      : null;
    const useShared = household?.shareHome;

    const where: any = useShared ? { householdId } : { userId };
    if (filters.location) where.location = filters.location;
    if (filters.addedByUserId) where.userId = filters.addedByUserId;
    if (filters.query) {
      const pattern = `%${filters.query}%`;
      // Búsqueda insensible a tildes usando unaccent (extensión PostgreSQL)
      const [matchingIngredients, matchingRecipes] = await Promise.all([
        prisma.$queryRaw<{ id: number }[]>(
          Prisma.sql`SELECT id FROM "Ingredient" WHERE unaccent(lower(name)) LIKE unaccent(lower(${pattern}))`
        ),
        prisma.$queryRaw<{ id: number }[]>(
          Prisma.sql`SELECT id FROM "Recipe" WHERE unaccent(lower(title)) LIKE unaccent(lower(${pattern}))`
        ),
      ]);
      const ingredientIds = matchingIngredients.map((r) => r.id);
      const recipeIds = matchingRecipes.map((r) => r.id);
      where.OR = [
        ...(ingredientIds.length > 0 ? [{ ingredientId: { in: ingredientIds } }] : []),
        ...(recipeIds.length > 0 ? [{ recipeId: { in: recipeIds } }] : []),
      ];
      // Si ninguno coincide, forzar sin resultados
      if (where.OR.length === 0) where.OR = [{ id: -1 }];
    }

    const items = await prisma.homeItem.findMany({
      where,
      include: homeItemInclude,
      orderBy: [{ location: "asc" }, { addedAt: "desc" }],
    });

    const { meals, preps, ingredients } =
      await this.getPlannedServingsMap(userId);
    const itemConsumption = this.calculateIngredientConsumption(
      items,
      ingredients,
    );

    let result: HomeItemWithPlanned[] = items.map((item) => {
      if (item.recipeId) {
        const mealServings = meals.get(item.recipeId) || 0;
        const prepServings = preps.get(item.recipeId) || 0;
        return {
          ...item,
          plannedMealServings: mealServings,
          pendingPrepServings: prepServings,
          projectedTotal: Math.max(
            0,
            item.quantity + prepServings - mealServings,
          ),
        };
      } else if (item.ingredientId) {
        const consumption = itemConsumption.get(item.id) || 0;
        return {
          ...item,
          plannedMealServings: Math.round(consumption * 10) / 10,
          pendingPrepServings: 0,
          projectedTotal:
            Math.round(Math.max(0, item.quantity - consumption) * 10) / 10,
        };
      }
      return {
        ...item,
        plannedMealServings: 0,
        pendingPrepServings: 0,
        projectedTotal: item.quantity,
      };
    });

    if (filters.belowMinimum) {
      const thresholds = await prisma.ingredientMinThreshold.findMany({
        where: useShared ? { householdId } : { userId },
      });
      const thresholdMap = new Map(
        thresholds.map((t) => [t.ingredientId, t.minQuantity]),
      );
      result = result.filter((item) => {
        if (!item.ingredientId) return false;
        const min = thresholdMap.get(item.ingredientId);
        return min !== undefined && item.quantity < min;
      });
    }

    return result;
  }

  // ── History ──

  async getHistory(homeItemId: number, userId: number) {
    const ctx = await this.getHomeContext(userId);
    const ownerFilter =
      ctx.useShared && ctx.householdId
        ? { householdId: ctx.householdId }
        : { userId };

    const item = await prisma.homeItem.findFirst({
      where: { id: homeItemId, ...ownerFilter },
    });
    if (!item) throw new Error("Item no encontrado");

    return prisma.homeItemHistory.findMany({
      where: { homeItemId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  // ── Purchase → Home ──

  async addFromPurchase(
    userId: number,
    ingredientId: number,
    quantity: number,
    unit: string,
  ): Promise<HomeItem> {
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });
    if (!ingredient) throw new Error("Ingrediente no encontrado");

    const location = (ingredient.defaultLocation || "nevera") as HomeLocation;
    const item = await this.create(userId, {
      location,
      quantity,
      unit,
      ingredientId,
    });

    // Override history origin to PURCHASED
    const lastHistory = await prisma.homeItemHistory.findFirst({
      where: { homeItemId: item.id },
      orderBy: { createdAt: "desc" },
    });
    if (lastHistory) {
      await prisma.homeItemHistory.update({
        where: { id: lastHistory.id },
        data: { origin: "PURCHASED" },
      });
    }

    // Check alerts after adding
    const totalQty = await this.getTotalQuantity(userId, ingredientId);
    await alertService.checkAndCreateAlerts({
      userId,
      ingredientId,
      triggerType: "MANUAL",
      beforeQty: totalQty - quantity,
      afterQty: totalQty,
    });

    return item;
  }

  private async getTotalRecipeServings(
    userId: number,
    recipeId: number,
  ): Promise<number> {
    const householdId = await householdService.getHouseholdId(userId);
    const household = householdId
      ? await prisma.household.findUnique({ where: { id: householdId } })
      : null;
    const where = household?.shareHome
      ? { householdId, recipeId }
      : { userId, recipeId };

    const agg = await prisma.homeItem.aggregate({
      where,
      _sum: { quantity: true },
    });
    return agg._sum.quantity || 0;
  }

  private async getTotalQuantity(
    userId: number,
    ingredientId: number,
  ): Promise<number> {
    const householdId = await householdService.getHouseholdId(userId);
    const household = householdId
      ? await prisma.household.findUnique({ where: { id: householdId } })
      : null;
    const where = household?.shareHome
      ? { householdId, ingredientId }
      : { userId, ingredientId };

    const agg = await prisma.homeItem.aggregate({
      where,
      _sum: { quantity: true },
    });
    return agg._sum.quantity || 0;
  }
}

export const homeItemService = new HomeItemService();
