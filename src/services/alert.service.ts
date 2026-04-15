import { PrismaClient } from "@prisma/client";
import {
  CreateIngredientThresholdDto,
  CreateRecipeThresholdDto,
  UpdateAlertDto,
} from "../domain";
import { householdService } from "./household.service";

const prisma = new PrismaClient();

export const alertService = {
  async getAlertScope(userId: number): Promise<{
    useSharedAlerts: boolean;
    householdId: number | null;
  }> {
    const householdId = await householdService.getHouseholdId(userId);
    if (!householdId) return { useSharedAlerts: false, householdId: null };

    const household = await prisma.household.findUnique({
      where: { id: householdId },
      select: { shareAlerts: true },
    });

    return {
      useSharedAlerts: !!household?.shareAlerts,
      householdId,
    };
  },

  // ── Thresholds ──

  async getIngredientThresholds(userId: number) {
    const scope = await this.getAlertScope(userId);
    return prisma.ingredientMinThreshold.findMany({
      where:
        scope.useSharedAlerts && scope.householdId
          ? { householdId: scope.householdId }
          : { userId },
      include: {
        ingredient: {
          select: { id: true, name: true, unit: true, preferredUnit: true },
        },
      },
    });
  },

  async setIngredientThreshold(
    dto: CreateIngredientThresholdDto,
    userId: number,
  ) {
    const scope = await this.getAlertScope(userId);
    const where =
      scope.useSharedAlerts && scope.householdId
        ? {
            ingredientId_householdId: {
              ingredientId: dto.ingredientId,
              householdId: scope.householdId,
            },
          }
        : { ingredientId_userId: { ingredientId: dto.ingredientId, userId } };

    const result = await prisma.ingredientMinThreshold.upsert({
      where: where as any,
      update: { minQuantity: dto.minQuantity, unit: dto.unit },
      create: {
        ingredientId: dto.ingredientId,
        minQuantity: dto.minQuantity,
        unit: dto.unit,
        ...(scope.useSharedAlerts && scope.householdId
          ? { householdId: scope.householdId }
          : { userId }),
      },
    });

    // Retroactively check current stock against the new threshold
    const homeItems = await prisma.homeItem.findMany({
      where: {
        ingredientId: dto.ingredientId,
        ...(scope.useSharedAlerts && scope.householdId
          ? { householdId: scope.householdId }
          : { userId }),
      },
    });
    const totalStock = homeItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalStock < dto.minQuantity) {
      await this.checkAndCreateAlerts({
        userId,
        ingredientId: dto.ingredientId,
        triggerType: "THRESHOLD_SET",
        beforeQty: totalStock,
        afterQty: totalStock,
      });
    }

    return result;
  },

  async deleteIngredientThreshold(ingredientId: number, userId: number) {
    const scope = await this.getAlertScope(userId);
    await prisma.ingredientMinThreshold.deleteMany({
      where: {
        ingredientId,
        ...(scope.useSharedAlerts && scope.householdId
          ? { householdId: scope.householdId }
          : { userId }),
      },
    });
    return { success: true };
  },

  async getRecipeThresholds(userId: number) {
    const scope = await this.getAlertScope(userId);
    return prisma.recipeMinThreshold.findMany({
      where:
        scope.useSharedAlerts && scope.householdId
          ? { householdId: scope.householdId }
          : { userId },
      include: { recipe: { select: { id: true, title: true } } },
    });
  },

  async setRecipeThreshold(dto: CreateRecipeThresholdDto, userId: number) {
    const scope = await this.getAlertScope(userId);
    const where =
      scope.useSharedAlerts && scope.householdId
        ? {
            recipeId_householdId: {
              recipeId: dto.recipeId,
              householdId: scope.householdId,
            },
          }
        : { recipeId_userId: { recipeId: dto.recipeId, userId } };

    return prisma.recipeMinThreshold.upsert({
      where: where as any,
      update: { minServings: dto.minServings },
      create: {
        recipeId: dto.recipeId,
        minServings: dto.minServings,
        ...(scope.useSharedAlerts && scope.householdId
          ? { householdId: scope.householdId }
          : { userId }),
      },
    });
  },

  async deleteRecipeThreshold(recipeId: number, userId: number) {
    const scope = await this.getAlertScope(userId);
    await prisma.recipeMinThreshold.deleteMany({
      where: {
        recipeId,
        ...(scope.useSharedAlerts && scope.householdId
          ? { householdId: scope.householdId }
          : { userId }),
      },
    });
    return { success: true };
  },

  // ── Alerts ──

  async getAlerts(userId: number, includeResolved = false) {
    const scope = await this.getAlertScope(userId);
    const statusFilter = includeResolved
      ? {}
      : { status: { in: ["OPEN", "VIEWED", "SNOOZED"] } };

    const snoozedFilter = {
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: new Date() } }],
    };

    return prisma.stockAlert.findMany({
      where: {
        ...(scope.useSharedAlerts && scope.householdId
          ? { householdId: scope.householdId }
          : { userId }),
        ...statusFilter,
        ...snoozedFilter,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getUnreadCount(userId: number) {
    const scope = await this.getAlertScope(userId);
    return prisma.stockAlert.count({
      where: {
        ...(scope.useSharedAlerts && scope.householdId
          ? { householdId: scope.householdId }
          : { userId }),
        status: "OPEN",
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: new Date() } }],
      },
    });
  },

  async updateAlert(alertId: number, dto: UpdateAlertDto, userId: number) {
    const alert = await prisma.stockAlert.findUnique({
      where: { id: alertId },
    });
    if (!alert) throw new Error("Alerta no encontrada");

    const data: any = { status: dto.status };
    if (dto.status === "SNOOZED" && dto.snoozedUntil) {
      data.snoozedUntil = new Date(dto.snoozedUntil);
    }

    const updated = await prisma.stockAlert.update({
      where: { id: alertId },
      data,
    });

    if (dto.addToShopping && alert.ingredientId) {
      const householdId = await householdService.getHouseholdId(userId);
      const household = householdId
        ? await prisma.household.findUnique({ where: { id: householdId } })
        : null;
      const deficit = alert.minimum - alert.afterQty;
      const quantity = Math.max(deficit, 1);
      const ingredient = await prisma.ingredient.findUnique({
        where: { id: alert.ingredientId },
      });
      if (ingredient) {
        await prisma.shoppingItem.create({
          data: {
            quantity,
            unit: ingredient.unit,
            userId,
            ingredientId: alert.ingredientId,
            ...(household?.shareShopping && householdId ? { householdId } : {}),
          },
        });
      }
    }

    return updated;
  },

  // ── Alert generation (called from other services) ──

  async checkAndCreateAlerts(params: {
    userId: number;
    ingredientId?: number;
    recipeId?: number;
    triggerType: string;
    beforeQty: number;
    afterQty: number;
  }) {
    const { userId, ingredientId, recipeId, triggerType, beforeQty, afterQty } =
      params;
    const scope = await this.getAlertScope(userId);
    const deltaQty = beforeQty - afterQty;

    if (ingredientId) {
      const threshold = await prisma.ingredientMinThreshold.findFirst({
        where: {
          ingredientId,
          ...(scope.useSharedAlerts && scope.householdId
            ? { householdId: scope.householdId }
            : { userId }),
        },
      });
      if (threshold && afterQty < threshold.minQuantity) {
        // Check for existing OPEN/VIEWED alert for this ingredient to avoid duplicates
        const existingAlert = await prisma.stockAlert.findFirst({
          where: {
            ingredientId,
            status: { in: ["OPEN", "VIEWED"] },
            ...(scope.useSharedAlerts && scope.householdId
              ? { householdId: scope.householdId }
              : { userId }),
          },
        });
        if (!existingAlert) {
          const ingredient = await prisma.ingredient.findUnique({
            where: { id: ingredientId },
          });
          await prisma.stockAlert.create({
            data: {
              status: "OPEN",
              triggerType,
              beforeQty,
              deltaQty,
              afterQty,
              minimum: threshold.minQuantity,
              message: `${ingredient?.name}: quedan ${afterQty} ${threshold.unit} (mínimo: ${threshold.minQuantity})`,
              userId,
              ingredientId,
              ...(scope.useSharedAlerts && scope.householdId
                ? { householdId: scope.householdId }
                : {}),
            },
          });
        }
      }
    }

    if (recipeId) {
      const threshold = await prisma.recipeMinThreshold.findFirst({
        where: {
          recipeId,
          ...(scope.useSharedAlerts && scope.householdId
            ? { householdId: scope.householdId }
            : { userId }),
        },
      });
      if (threshold && afterQty < threshold.minServings) {
        // Check for existing OPEN/VIEWED alert for this recipe to avoid duplicates
        const existingAlert = await prisma.stockAlert.findFirst({
          where: {
            recipeId,
            status: { in: ["OPEN", "VIEWED"] },
            ...(scope.useSharedAlerts && scope.householdId
              ? { householdId: scope.householdId }
              : { userId }),
          },
        });
        if (!existingAlert) {
          const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
          });
          await prisma.stockAlert.create({
            data: {
              status: "OPEN",
              triggerType,
              beforeQty,
              deltaQty,
              afterQty,
              minimum: threshold.minServings,
              message: `${recipe?.title}: quedan ${afterQty} raciones (mínimo: ${threshold.minServings})`,
              userId,
              recipeId,
              ...(scope.useSharedAlerts && scope.householdId
                ? { householdId: scope.householdId }
                : {}),
            },
          });
        }
      }
    }
  },
};
