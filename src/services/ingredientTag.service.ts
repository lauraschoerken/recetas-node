import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class IngredientTagService {
  /** Normaliza nombre para comparación de duplicados */
  private normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  /**
   * Devuelve todas las tags visibles para un usuario:
   * - Tags globales (isGlobal = true) que el usuario no ha ocultado globalmente
   * - Tags personales del propio usuario
   * Aplica color override si existe en IngredientTagUserPreference
   */
  async getAll(userId: number, includeHidden = false) {
    // Obtener preferencias del usuario (colores personalizados y ocultos globales)
    const userPrefs = await prisma.ingredientTagUserPreference.findMany({
      where: { userId },
    });
    const prefMap = new Map(userPrefs.map((p) => [p.tagId, p]));

    // IDs de tags globalmente ocultos para este usuario
    const globallyHiddenTagIds = userPrefs
      .filter((p) => p.isHiddenGlobally)
      .map((p) => p.tagId);

    const tags = await prisma.ingredientTag.findMany({
      where: {
        OR: [
          // Tags globales: si includeHidden=false, excluir las ocultas
          {
            isGlobal: true,
            id:
              !includeHidden && globallyHiddenTagIds.length > 0
                ? { notIn: globallyHiddenTagIds }
                : undefined,
          },
          // Tags personales del usuario
          { createdByUserId: userId },
        ],
      },
      orderBy: [{ isGlobal: "desc" }, { name: "asc" }],
    });

    // Aplicar color override y añadir campos de preferencia
    return tags.map((tag) => {
      const pref = prefMap.get(tag.id);
      return {
        ...tag,
        color: pref?.colorOverride ?? tag.color,
        colorOverride: pref?.colorOverride ?? null,
        isHiddenGlobally: pref?.isHiddenGlobally ?? false,
      };
    });
  }

  async create(userId: number, name: string, color?: string, isGlobal = false) {
    const normalized = this.normalizeName(name);
    if (!normalized) throw { httpCode: 400, message: "Nombre es requerido" };

    // Validar duplicado: buscar tag con mismo nombre (normalizado) visible para este usuario
    const visibleTags = await this.getAll(userId);
    const duplicate = visibleTags.find(
      (t) => this.normalizeName(t.name) === normalized,
    );
    if (duplicate) {
      throw { httpCode: 409, message: "Ya tienes un tag con ese nombre" };
    }

    return prisma.ingredientTag.create({
      data: { name: name.trim(), color, isGlobal, createdByUserId: userId },
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
    // Solo el creador o admin puede editar el tag global
    if (tag.createdByUserId !== userId && userRole !== "ADMIN") return null;

    // Validar duplicado si se está cambiando el nombre
    if (data.name) {
      const normalized = this.normalizeName(data.name);
      const visibleTags = await this.getAll(userId);
      const duplicate = visibleTags.find(
        (t) => t.id !== tagId && this.normalizeName(t.name) === normalized,
      );
      if (duplicate) {
        throw { httpCode: 409, message: "Ya tienes un tag con ese nombre" };
      }
      data = { ...data, name: data.name.trim() };
    }

    return prisma.ingredientTag.update({ where: { id: tagId }, data });
  }

  /** Guardar preferencias personales del usuario sobre un tag global (color override, ocultar globalmente) */
  async saveUserPreference(
    userId: number,
    tagId: number,
    data: { colorOverride?: string | null; isHiddenGlobally?: boolean },
  ) {
    const tag = await prisma.ingredientTag.findUnique({ where: { id: tagId } });
    if (!tag) throw { httpCode: 404, message: "Tag no encontrada" };

    return prisma.ingredientTagUserPreference.upsert({
      where: { userId_tagId: { userId, tagId } },
      create: {
        userId,
        tagId,
        colorOverride: data.colorOverride ?? null,
        isHiddenGlobally: data.isHiddenGlobally ?? false,
      },
      update: {
        ...(data.colorOverride !== undefined
          ? { colorOverride: data.colorOverride }
          : {}),
        ...(data.isHiddenGlobally !== undefined
          ? { isHiddenGlobally: data.isHiddenGlobally }
          : {}),
      },
    });
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

  /** Obtener tags de varios ingredientes a la vez (para exportar lista de compra) */
  async getBulkAssignments(
    ingredientIds: number[],
    userId: number,
  ): Promise<
    Record<string, { id: number; name: string; color: string | null }[]>
  > {
    if (ingredientIds.length === 0) return {};

    // Preferencias del usuario para aplicar color override
    const userPrefs = await prisma.ingredientTagUserPreference.findMany({
      where: { userId },
    });
    const prefMap = new Map(userPrefs.map((p) => [p.tagId, p]));
    const globallyHiddenTagIds = new Set(
      userPrefs.filter((p) => p.isHiddenGlobally).map((p) => p.tagId),
    );

    const hiddenRows = await prisma.ingredientTagHidden.findMany({
      where: { userId, ingredientId: { in: ingredientIds } },
      select: { tagId: true, ingredientId: true },
    });
    const hiddenMap: Record<number, Set<number>> = {};
    for (const h of hiddenRows) {
      if (!hiddenMap[h.ingredientId]) hiddenMap[h.ingredientId] = new Set();
      hiddenMap[h.ingredientId].add(h.tagId);
    }

    const assignments = await prisma.ingredientTagAssignment.findMany({
      where: {
        ingredientId: { in: ingredientIds },
        OR: [{ userId: null }, { userId }],
      },
      include: { tag: true },
    });

    const result: Record<
      string,
      { id: number; name: string; color: string | null }[]
    > = {};
    for (const a of assignments) {
      if (hiddenMap[a.ingredientId]?.has(a.tagId)) continue;
      if (globallyHiddenTagIds.has(a.tagId)) continue;
      const key = String(a.ingredientId);
      if (!result[key]) result[key] = [];
      if (!result[key].find((t) => t.id === a.tag.id)) {
        const pref = prefMap.get(a.tag.id);
        result[key].push({
          id: a.tag.id,
          name: a.tag.name,
          color: pref?.colorOverride ?? a.tag.color,
        });
      }
    }
    return result;
  }
}

export const ingredientTagService = new IngredientTagService();
