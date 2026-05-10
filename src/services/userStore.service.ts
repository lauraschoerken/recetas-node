import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class UserStoreService {
  async getAll(userId: number, householdId?: number) {
    if (householdId) {
      // Obtener los userId de todos los miembros del hogar
      const members = await prisma.householdMember.findMany({
        where: { householdId },
        select: { userId: true },
      });
      const memberUserIds = members.map((m) => m.userId);
      // Devolver todas las tiendas de todos los miembros del hogar
      return prisma.userStore.findMany({
        where: { userId: { in: memberUserIds } },
        include: {
          ingredients: { include: { ingredient: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }
    // Sin hogar: solo las propias
    return prisma.userStore.findMany({
      where: { userId },
      include: {
        ingredients: { include: { ingredient: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(storeId: number, userId: number) {
    return prisma.userStore.findFirst({
      where: { id: storeId, userId },
      include: { ingredients: { include: { ingredient: true } } },
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
      include: {
        ingredients: { include: { ingredient: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(
    storeId: number,
    userId: number,
    data: { name?: string; url?: string; logoUrl?: string; isShared?: boolean },
    householdId?: number,
  ) {
    // El dueño puede cambiar todo; miembros del mismo hogar solo pueden cambiar isShared
    const store = await prisma.userStore.findFirst({
      where: {
        id: storeId,
        OR: [{ userId }, ...(householdId ? [{ householdId }] : [])],
      },
    });
    if (!store) return null;

    // Si no es el dueño, solo se permite modificar isShared
    const isOwner = store.userId === userId;
    const updateData = isOwner ? data : { isShared: data.isShared };

    // Al compartir, vincular al household del que modifica; al dejar de compartir, desvincularlo
    const householdUpdate: { householdId?: number | null } = {};
    if (updateData.isShared === true && householdId)
      householdUpdate.householdId = householdId;
    if (updateData.isShared === false) householdUpdate.householdId = null;
    return prisma.userStore.update({
      where: { id: storeId },
      data: { ...updateData, ...householdUpdate },
      include: {
        ingredients: { include: { ingredient: true } },
        user: { select: { id: true, name: true, email: true } },
      },
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

  async addIngredient(
    storeId: number,
    userId: number,
    data: {
      ingredientId: number;
      purchaseUrl?: string;
      preferredUnit?: string;
      sortOrder?: number | null;
    },
  ) {
    const store = await prisma.userStore.findFirst({
      where: { id: storeId, userId },
    });
    if (!store) return null;
    return prisma.userStoreIngredient.upsert({
      where: {
        storeId_ingredientId: { storeId, ingredientId: data.ingredientId },
      },
      create: { storeId, ...data },
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
    const store = await prisma.userStore.findFirst({
      where: { id: storeId, userId },
    });
    if (!store) return false;
    const item = await prisma.userStoreIngredient.findUnique({
      where: { storeId_ingredientId: { storeId, ingredientId } },
    });
    if (!item) return false;
    await prisma.userStoreIngredient.delete({ where: { id: item.id } });
    return true;
  }
}

export const userStoreService = new UserStoreService();
