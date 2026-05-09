import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface ProductDto {
  id: number;
  name: string;
  imageUrl: string | null;
  status: string;
  createdByUserId: number | null;
  createdAt: Date;
}

export interface ProductThresholdDto {
  id: number;
  productId: number;
  minQuantity: number;
  unit: string;
  userId: number | null;
  householdId: number | null;
}

export interface CreateProductData {
  name: string;
  imageUrl?: string;
  isGlobal?: boolean;
}

export interface UpdateProductData {
  name?: string;
  imageUrl?: string;
}

export interface SetThresholdData {
  minQuantity: number;
  unit: string;
  householdId?: number | null;
}

export class ProductService {
  async getAll(userId: number): Promise<ProductDto[]> {
    const products = await prisma.product.findMany({
      where: {
        OR: [{ status: "GLOBAL" }, { createdByUserId: userId }],
        NOT: { hiddenByUsers: { some: { userId } } },
      },
      orderBy: { name: "asc" },
    });
    return products;
  }

  async search(userId: number, query: string): Promise<ProductDto[]> {
    const products = await prisma.product.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
        OR: [{ status: "GLOBAL" }, { createdByUserId: userId }],
        NOT: { hiddenByUsers: { some: { userId } } },
      },
      orderBy: { name: "asc" },
      take: 20,
    });
    return products;
  }

  async getById(id: number, userId: number): Promise<ProductDto | null> {
    const product = await prisma.product.findFirst({
      where: {
        id,
        OR: [{ status: "GLOBAL" }, { createdByUserId: userId }],
      },
    });
    return product;
  }

  async create(userId: number, data: CreateProductData): Promise<ProductDto> {
    // Validar nombre duplicado para este usuario
    const existing = await prisma.product.findFirst({
      where: {
        name: { equals: data.name.trim(), mode: "insensitive" },
        OR: [{ status: "GLOBAL" }, { createdByUserId: userId }],
      },
    });
    if (existing) {
      throw { httpCode: 409, message: "Ya existe un producto con ese nombre" };
    }

    const product = await prisma.product.create({
      data: {
        name: data.name.trim(),
        imageUrl: data.imageUrl ?? null,
        status: data.isGlobal ? "GLOBAL" : "PRIVATE",
        createdByUserId: userId,
      },
    });
    return product;
  }

  async update(
    id: number,
    userId: number,
    userRole: string,
    data: UpdateProductData,
  ): Promise<ProductDto> {
    const product = await prisma.product.findFirst({
      where: { id },
    });
    if (!product) {
      throw { httpCode: 404, message: "Producto no encontrado" };
    }

    // Solo el creador o admin puede editar
    if (product.status === "PRIVATE" && product.createdByUserId !== userId) {
      throw {
        httpCode: 403,
        message: "No tienes permiso para editar este producto",
      };
    }
    if (product.status === "GLOBAL" && userRole !== "ADMIN") {
      throw {
        httpCode: 403,
        message: "Solo un administrador puede editar productos globales",
      };
    }

    if (data.name) {
      const existing = await prisma.product.findFirst({
        where: {
          name: { equals: data.name.trim(), mode: "insensitive" },
          id: { not: id },
          OR: [{ status: "GLOBAL" }, { createdByUserId: userId }],
        },
      });
      if (existing) {
        throw {
          httpCode: 409,
          message: "Ya existe un producto con ese nombre",
        };
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      },
    });
    return updated;
  }

  async delete(id: number, userId: number, userRole: string): Promise<boolean> {
    const product = await prisma.product.findFirst({
      where: { id },
    });
    if (!product) return false;

    if (product.status === "PRIVATE" && product.createdByUserId !== userId) {
      throw {
        httpCode: 403,
        message: "No tienes permiso para eliminar este producto",
      };
    }
    if (product.status === "GLOBAL" && userRole !== "ADMIN") {
      throw {
        httpCode: 403,
        message: "Solo un administrador puede eliminar productos globales",
      };
    }

    await prisma.product.delete({ where: { id } });
    return true;
  }

  async setThreshold(
    productId: number,
    userId: number,
    data: SetThresholdData,
  ): Promise<ProductThresholdDto> {
    const product = await this.getById(productId, userId);
    if (!product) {
      throw { httpCode: 404, message: "Producto no encontrado" };
    }

    if (data.householdId) {
      const threshold = await prisma.productMinThreshold.upsert({
        where: {
          productId_householdId: { productId, householdId: data.householdId },
        },
        update: { minQuantity: data.minQuantity, unit: data.unit },
        create: {
          productId,
          householdId: data.householdId,
          minQuantity: data.minQuantity,
          unit: data.unit,
        },
      });
      return threshold;
    } else {
      const threshold = await prisma.productMinThreshold.upsert({
        where: { productId_userId: { productId, userId } },
        update: { minQuantity: data.minQuantity, unit: data.unit },
        create: {
          productId,
          userId,
          minQuantity: data.minQuantity,
          unit: data.unit,
        },
      });
      return threshold;
    }
  }

  async deleteThreshold(productId: number, userId: number): Promise<boolean> {
    const deleted = await prisma.productMinThreshold.deleteMany({
      where: { productId, userId },
    });
    return deleted.count > 0;
  }

  async getThresholds(userId: number): Promise<ProductThresholdDto[]> {
    const thresholds = await prisma.productMinThreshold.findMany({
      where: { userId },
    });
    return thresholds;
  }

  // ── Overrides personales ──────────────────────────────────────────────

  async upsertOverride(
    productId: number,
    userId: number,
    data: { name?: string; imageUrl?: string | null },
  ) {
    const product = await prisma.product.findFirst({
      where: { id: productId },
    });
    if (!product) throw { httpCode: 404, message: "Producto no encontrado" };
    return prisma.productUserOverride.upsert({
      where: { userId_productId: { userId, productId } },
      create: {
        userId,
        productId,
        name: data.name ?? null,
        imageUrl: data.imageUrl ?? null,
      },
      update: { name: data.name ?? null, imageUrl: data.imageUrl ?? null },
    });
  }

  async getOverride(productId: number, userId: number) {
    return prisma.productUserOverride.findUnique({
      where: { userId_productId: { userId, productId } },
    });
  }

  async deleteOverride(productId: number, userId: number): Promise<boolean> {
    const deleted = await prisma.productUserOverride.deleteMany({
      where: { userId, productId },
    });
    return deleted.count > 0;
  }

  // ── Ocultación personal ──────────────────────────────────────────────

  async hideProduct(productId: number, userId: number): Promise<void> {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        OR: [{ status: "GLOBAL" }, { createdByUserId: userId }],
      },
    });
    if (!product) throw { httpCode: 404, message: "Producto no encontrado" };
    await prisma.productUserHide.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
  }

  async unhideProduct(productId: number, userId: number): Promise<void> {
    await prisma.productUserHide.deleteMany({ where: { userId, productId } });
  }

  async getHiddenProducts(userId: number): Promise<ProductDto[]> {
    const rows = await prisma.productUserHide.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { product: { name: "asc" } },
    });
    return rows.map((r) => r.product);
  }

  // ── Propuestas de cambio ──────────────────────────────────────────────

  async createProposal(
    productId: number,
    userId: number,
    data: {
      fieldName: "name" | "imageUrl";
      currentValue: string;
      proposedValue: string;
    },
  ) {
    const product = await prisma.product.findFirst({
      where: { id: productId, status: "GLOBAL" },
    });
    if (!product)
      throw { httpCode: 404, message: "Producto global no encontrado" };
    const type = data.fieldName === "name" ? "EDIT_NAME" : "EDIT_IMAGE";
    // Solo una propuesta pendiente por campo y usuario
    const existing = await prisma.productProposal.findFirst({
      where: {
        productId,
        proposedByUserId: userId,
        fieldName: data.fieldName,
        status: "PENDING",
      },
    });
    if (existing)
      throw {
        httpCode: 409,
        message: "Ya tienes una propuesta pendiente para este campo",
      };
    return prisma.productProposal.create({
      data: {
        type,
        productId,
        proposedByUserId: userId,
        fieldName: data.fieldName,
        currentValue: data.currentValue,
        proposedValue: data.proposedValue,
      },
    });
  }

  async getProposals(userId: number, userRole: string) {
    const where = userRole === "ADMIN" ? {} : { proposedByUserId: userId };
    return prisma.productProposal.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, imageUrl: true } },
        proposedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async reviewProposal(
    proposalId: number,
    adminId: number,
    decision: "ACCEPTED" | "REJECTED",
    adminNote?: string,
  ) {
    const proposal = await prisma.productProposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw { httpCode: 404, message: "Propuesta no encontrada" };
    if (proposal.status !== "PENDING")
      throw { httpCode: 409, message: "La propuesta ya fue revisada" };

    const updated = await prisma.productProposal.update({
      where: { id: proposalId },
      data: {
        status: decision,
        reviewedByUserId: adminId,
        adminNote: adminNote ?? null,
      },
    });

    // Si se acepta, aplicar el cambio en el producto global
    if (
      decision === "ACCEPTED" &&
      proposal.fieldName &&
      proposal.proposedValue
    ) {
      await prisma.product.update({
        where: { id: proposal.productId },
        data: { [proposal.fieldName]: proposal.proposedValue },
      });
    }
    return updated;
  }
}

export const productService = new ProductService();
