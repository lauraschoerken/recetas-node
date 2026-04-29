import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class IngredientTagService {
  /**
   * Devuelve todas las tags visibles para un usuario:
   * - Tags globales (isGlobal = true) que el usuario no ha ocultado
   * - Tags personales del propio usuario
   */
  async getAll(userId: number) {
    const hiddenTagIds = await prisma.ingredientTagHidden
      .findMany({ where: { userId }, select: { tagId: true } })
      .then((rows) => rows.map((r) => r.tagId));

    return prisma.ingredientTag.findMany({
      where: {
        OR: [
          // Tags globales no ocultadas
          {
            isGlobal: true,
            id: hiddenTagIds.length > 0 ? { notIn: hiddenTagIds } : undefined,
          },
          // Tags personales del usuario
          { createdByUserId: userId },
        ],
      },
      orderBy: [{ isGlobal: "desc" }, { name: "asc" }],
    });
  }

  async create(userId: number, name: string, color?: string, isGlobal = false) {
    return prisma.ingredientTag.create({
      data: { name, color, isGlobal, createdByUserId: userId },
    });
  }

  async update(
    tagId: number,
    userId: number,
    userRole: string,
    data: { name?: string; color?: string },
  ) {
    const tag = await prisma.ingredientTag.findUnique({ where: { id: tagId } });
    if (!tag) return null;
    // Solo el creador o admin puede editar
    if (tag.createdByUserId !== userId && userRole !== "ADMIN") return null;
    return prisma.ingredientTag.update({ where: { id: tagId }, data });
  }

  async delete(tagId: number, userId: number, userRole: string) {
    const tag = await prisma.ingredientTag.findUnique({ where: { id: tagId } });
    if (!tag) return false;
    if (tag.createdByUserId !== userId && userRole !== "ADMIN") return false;
    await prisma.ingredientTag.delete({ where: { id: tagId } });
    return true;
  }

  /** Asignar tag a ingrediente */
  async assign(
    ingredientId: number,
    tagId: number,
    userId: number,
    userRole: string,
  ) {
    const tag = await prisma.ingredientTag.findUnique({ where: { id: tagId } });
    if (!tag) return null;
    // Si es tag global, solo admin puede asignar globalmente (userId = null)
    const assignUserId = tag.isGlobal && userRole === "ADMIN" ? null : userId;
    return prisma.ingredientTagAssignment.upsert({
      where: {
        ingredientId_tagId_userId: {
          ingredientId,
          tagId,
          userId: assignUserId as number,
        },
      },
      create: { ingredientId, tagId, userId: assignUserId },
      update: {},
    });
  }

  /** Quitar asignación de tag a ingrediente */
  async unassign(
    ingredientId: number,
    tagId: number,
    userId: number,
    userRole: string,
  ) {
    const tag = await prisma.ingredientTag.findUnique({ where: { id: tagId } });
    if (!tag) return false;
    const assignUserId = tag.isGlobal && userRole === "ADMIN" ? null : userId;
    const existing = await prisma.ingredientTagAssignment.findUnique({
      where: {
        ingredientId_tagId_userId: {
          ingredientId,
          tagId,
          userId: assignUserId as number,
        },
      },
    });
    if (!existing) return false;
    await prisma.ingredientTagAssignment.delete({
      where: { id: existing.id },
    });
    return true;
  }

  /** Obtener las tags de un ingrediente para un usuario (globales + personales, sin las ocultas) */
  async getForIngredient(ingredientId: number, userId: number) {
    const hiddenTagIds = await prisma.ingredientTagHidden
      .findMany({ where: { userId, ingredientId }, select: { tagId: true } })
      .then((rows) => rows.map((r) => r.tagId));

    return prisma.ingredientTagAssignment.findMany({
      where: {
        ingredientId,
        OR: [{ userId: null }, { userId }],
        tagId: hiddenTagIds.length > 0 ? { notIn: hiddenTagIds } : undefined,
      },
      include: { tag: true },
    });
  }

  /** Ocultar tag global en un ingrediente */
  async hide(ingredientId: number, tagId: number, userId: number) {
    return prisma.ingredientTagHidden.upsert({
      where: { userId_ingredientId_tagId: { userId, ingredientId, tagId } },
      create: { userId, ingredientId, tagId },
      update: {},
    });
  }

  /** Mostrar tag global en un ingrediente (quitar ocultación) */
  async unhide(ingredientId: number, tagId: number, userId: number) {
    const existing = await prisma.ingredientTagHidden.findUnique({
      where: { userId_ingredientId_tagId: { userId, ingredientId, tagId } },
    });
    if (!existing) return false;
    await prisma.ingredientTagHidden.delete({ where: { id: existing.id } });
    return true;
  }
}

export const ingredientTagService = new IngredientTagService();
