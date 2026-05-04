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
}

export const productService = new ProductService();
