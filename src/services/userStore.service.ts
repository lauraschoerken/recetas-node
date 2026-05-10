import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper include para devolver siempre la misma forma
const storeInclude = (requestingUserId: number) => ({
  ingredients: {
    where: { userId: requestingUserId },
    include: { ingredient: true },
  },
  user: { select: { id: true, name: true, email: true } },
});

export class UserStoreService {
  async getAll(userId: number, householdId?: number) {
    if (householdId) {
      const members = await prisma.householdMember.findMany({
        where: { householdId },
        select: { userId: true },
      });
      const memberUserIds = members.map((m) => m.userId);
      return prisma.userStore.findMany({
        where: { userId: { in: memberUserIds } },
        include: storeInclude(userId),
        orderBy: { createdAt: "desc" },
      });
    }
    return prisma.userStore.findMany({
      where: { userId },
      include: storeInclude(userId),
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(storeId: number, userId: number) {
    return prisma.userStore.findFirst({
      where: { id: storeId, userId },
      include: storeInclude(userId),
    });
  }

  async create(
    userId: number,
    data: {
      name: string;
      url?: string;
      logoUrl?: string;
      isShared?: boolean;
      householdId?: number;
    },
  ) {
    return prisma.userStore.create({
      data: { ...data, userId },
      include: storeInclude(userId),
    });
  }

  async update(
    storeId: number,
    userId: number,
    data: { name?: string; url?: string; logoUrl?: string; isShared?: boolean },
    householdId?: number,
  ) {
    let store = await prisma.userStore.findFirst({
      where: { id: storeId, userId },
    });

    if (!store && householdId) {
      const members = await prisma.householdMember.findMany({
        where: { householdId },
        select: { userId: true },
      });
      const memberIds = members.map((m) => m.userId);
      store = await prisma.userStore.findFirst({
        where: { id: storeId, userId: { in: memberIds } },
      });
    }

    if (!store) return null;

    const isOwner = store.userId === userId;
    const updateData = isOwner ? data : { isShared: data.isShared };

    const householdUpdate: { householdId?: number | null } = {};
    if (updateData.isShared === true && householdId)
      householdUpdate.householdId = householdId;
    if (updateData.isShared === false) householdUpdate.householdId = null;

    return prisma.userStore.update({
      where: { id: storeId },
      data: { ...updateData, ...householdUpdate },
      include: storeInclude(userId),
    });
  }

  async delete(storeId: number, userId: number) {
    const store = await prisma.userStore.findFirst({
      where: { id: storeId, userId },
    });
    if (!store) return false;
    await prisma.userStore.delete({ where: { id: storeId } });
    return true;
  }

  /** Verifica si otros usuarios (que no sean el dueño real de la tienda) tienen ingredientes en esta tienda */
  async getOtherUsersIngredientCount(
    storeId: number,
  ): Promise<{ count: number; userNames: string[] }> {
    const store = await prisma.userStore.findFirst({ where: { id: storeId } });
    if (!store) return { count: 0, userNames: [] };
    const items = await prisma.userStoreIngredient.findMany({
      where: { storeId, userId: { not: store.userId } },
      include: { user: { select: { name: true, email: true } } },
    });
    const names = [...new Set(items.map((i) => i.user.name || i.user.email))];
    return { count: items.length, userNames: names };
  }

  /**
   * Deja de compartir una tienda.
   * mode='delete' → borra las asociaciones de otros usuarios con esta tienda
   * mode='duplicate' → crea una copia privada de la tienda para cada otro usuario que la usaba
   */
  async unshare(
    storeId: number,
    requestingUserId: number,
    mode: "delete" | "duplicate",
    householdId?: number,
  ) {
    let store = await prisma.userStore.findFirst({
      where: { id: storeId, userId: requestingUserId },
      include: { ingredients: true },
    });

    if (!store && householdId) {
      const members = await prisma.householdMember.findMany({
        where: { householdId },
        select: { userId: true },
      });
      const memberIds = members.map((m) => m.userId);
      store = await prisma.userStore.findFirst({
        where: { id: storeId, userId: { in: memberIds } },
        include: { ingredients: true },
      });
    }

    if (!store) return null;

    // El propietario real de la tienda mantiene sus ingredientes
    const storeOwnerId = store.userId;

    if (mode === "duplicate") {
      // Encontrar todos los otros usuarios que tienen ingredientes en esta tienda
      const otherItems = await prisma.userStoreIngredient.findMany({
        where: { storeId, userId: { not: storeOwnerId } },
      });
      const otherUserIds = [...new Set(otherItems.map((i) => i.userId))];

      for (const otherUserId of otherUserIds) {
        // Crear una copia privada de la tienda para ese usuario
        const copy = await prisma.userStore.create({
          data: {
            userId: otherUserId,
            name: store.name,
            url: store.url ?? undefined,
            logoUrl: store.logoUrl ?? undefined,
            isShared: false,
          },
        });
        // Mover sus ingredientes a la nueva copia
        const userItems = otherItems.filter((i) => i.userId === otherUserId);
        for (const item of userItems) {
          await prisma.userStoreIngredient.create({
            data: {
              storeId: copy.id,
              ingredientId: item.ingredientId,
              userId: otherUserId,
              purchaseUrl: item.purchaseUrl ?? undefined,
              preferredUnit: item.preferredUnit ?? undefined,
              sortOrder: item.sortOrder ?? undefined,
            },
          });
        }
      }
    }

    // Borrar asociaciones de otros usuarios con la tienda original
    await prisma.userStoreIngredient.deleteMany({
      where: { storeId, userId: { not: storeOwnerId } },
    });

    // Finalmente dejar de compartir
    return prisma.userStore.update({
      where: { id: storeId },
      data: { isShared: false, householdId: null },
      include: storeInclude(requestingUserId),
    });
  }

  /**
   * Fusiona targetStoreId en sourceStoreId (el de la persona que comparte).
   * Los ingredientes de targetStore pasan a sourceStore, y targetStore se elimina.
   * sourceStore queda como la tienda compartida del hogar.
   */
  async mergeStores(
    sourceStoreId: number,
    targetStoreId: number,
    requestingUserId: number,
    householdId: number,
  ) {
    const source = await prisma.userStore.findFirst({
      where: { id: sourceStoreId, userId: requestingUserId },
    });
    const target = await prisma.userStore.findFirst({
      where: { id: targetStoreId },
    });
    if (!source || !target) return null;

    // Mover los ingredientes del target al source (sin duplicar)
    const targetItems = await prisma.userStoreIngredient.findMany({
      where: { storeId: targetStoreId },
    });
    for (const item of targetItems) {
      const exists = await prisma.userStoreIngredient.findUnique({
        where: {
          storeId_ingredientId_userId: {
            storeId: sourceStoreId,
            ingredientId: item.ingredientId,
            userId: item.userId,
          },
        },
      });
      if (!exists) {
        await prisma.userStoreIngredient.create({
          data: {
            storeId: sourceStoreId,
            ingredientId: item.ingredientId,
            userId: item.userId,
            purchaseUrl: item.purchaseUrl ?? undefined,
            preferredUnit: item.preferredUnit ?? undefined,
            sortOrder: item.sortOrder ?? undefined,
          },
        });
      }
    }

    // Eliminar la tienda target
    await prisma.userStore.delete({ where: { id: targetStoreId } });

    // Compartir la tienda source con el hogar
    return prisma.userStore.update({
      where: { id: sourceStoreId },
      data: { isShared: true, householdId },
      include: storeInclude(requestingUserId),
    });
  }

  async addIngredient(
    storeId: number,
    userId: number,
    data: {
      ingredientId: number;
      purchaseUrl?: string;
      preferredUnit?: string;
      sortOrder?: number | null;
    },
    householdId?: number,
  ) {
    // Buscar la tienda: propia O compartida por alguien del mismo hogar
    let store = await prisma.userStore.findFirst({
      where: { id: storeId, userId },
    });

    if (!store && householdId) {
      // Verificar si la tienda es de un miembro del hogar y está compartida
      const members = await prisma.householdMember.findMany({
        where: { householdId },
        select: { userId: true },
      });
      const memberIds = members.map((m) => m.userId);
      store = await prisma.userStore.findFirst({
        where: { id: storeId, isShared: true, userId: { in: memberIds } },
      });
    }

    if (!store) return null;

    return prisma.userStoreIngredient.upsert({
      where: {
        storeId_ingredientId_userId: {
          storeId,
          ingredientId: data.ingredientId,
          userId,
        },
      },
      create: { storeId, userId, ...data },
      update: {
        purchaseUrl: data.purchaseUrl,
        preferredUnit: data.preferredUnit,
        sortOrder: data.sortOrder,
      },
      include: { ingredient: true },
    });
  }

  async removeIngredient(
    storeId: number,
    ingredientId: number,
    userId: number,
  ) {
    const item = await prisma.userStoreIngredient.findUnique({
      where: {
        storeId_ingredientId_userId: { storeId, ingredientId, userId },
      },
    });
    if (!item) return false;
    await prisma.userStoreIngredient.delete({ where: { id: item.id } });
    return true;
  }
}

export const userStoreService = new UserStoreService();
