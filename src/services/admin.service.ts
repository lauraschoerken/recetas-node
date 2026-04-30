import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class AdminService {
  async getAllUsers(
    opts: { page?: number; pageSize?: number; search?: string } = {},
  ) {
    const { page = 1, pageSize = 20, search = "" } = opts;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          imageUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    return { data, total };
  }

  async setRole(userId: number, role: "USER" | "ADMIN") {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async deleteUser(userId: number) {
    await prisma.user.delete({ where: { id: userId } });
  }

  async getPendingIngredients() {
    return prisma.ingredient.findMany({
      where: { status: "PENDING" },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        variants: {
          select: {
            id: true,
            name: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true,
            fiber: true,
            weightFactor: true,
            isDefault: true,
          },
        },
        conversions: {
          select: { id: true, unitName: true, gramsPerUnit: true },
        },
      },
      orderBy: { id: "desc" },
    });
  }

  async getPendingProposals() {
    return prisma.ingredientProposal.findMany({
      where: { status: "PENDING" },
      include: {
        proposedBy: { select: { id: true, name: true, email: true } },
        ingredient: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }
}

export const adminService = new AdminService();
