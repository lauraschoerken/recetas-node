import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class UserStoreService {
  async getAll(userId: number, householdId?: number) {
    return prisma.userStore.findMany({
      where: {
        OR: [
          { userId },
          // Tiendas compartidas del household
          ...(householdId ? [{ householdId, isShared: true }] : []),
        ],
      },
      include: {
        ingredients: { include: { ingredient: true } },
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
      include: { ingredients: { include: { ingredient: true } } },
    });
  }

  async update(
    storeId: number,
    userId: number,
    data: { name?: string; url?: string; logoUrl?: string; isShared?: boolean },
  ) {
    const store = await prisma.userStore.findFirst({
      where: { id: storeId, userId },
    });
    if (!store) return null;
    return prisma.userStore.update({
      where: { id: storeId },
      data,
      include: { ingredients: { include: { ingredient: true } } },
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
