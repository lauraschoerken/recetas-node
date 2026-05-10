import {
  JsonController,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseBefore,
  HttpCode,
} from "routing-controllers";
import { userStoreService, householdService } from "../services";
import { authMiddleware, AuthRequest } from "../middlewares";

@JsonController("/stores")
@UseBefore(authMiddleware)
export class UserStoreController {
  /**
   * @swagger
   * /api/stores:
   *   get:
   *     tags: [Tiendas]
   *     summary: Listar tiendas del usuario
   *     responses:
   *       200:
   *         description: Lista de tiendas
   */
  @Get("/")
  async getAll(@Req() req: AuthRequest) {
    const householdId = await householdService.getHouseholdId(req.userId!);
    return userStoreService.getAll(req.userId!, householdId ?? undefined);
  }

  /**
   * @swagger
   * /api/stores/{id}:
   *   get:
   *     tags: [Tiendas]
   *     summary: Obtener tienda por ID
   */
  @Get("/:id")
  async getById(@Param("id") id: number, @Req() req: AuthRequest) {
    const store = await userStoreService.getById(id, req.userId!);
    if (!store) throw { httpCode: 404, message: "Tienda no encontrada" };
    return store;
  }

  /**
   * @swagger
   * /api/stores:
   *   post:
   *     tags: [Tiendas]
   *     summary: Crear tienda
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name: { type: string }
   *               url: { type: string }
   *               logoUrl: { type: string }
   *               isShared: { type: boolean }
   *               householdId: { type: integer }
   *     responses:
   *       201:
   *         description: Tienda creada
   */
  @Post("/")
  @HttpCode(201)
  async create(
    @Req() req: AuthRequest,
    @Body()
    body: {
      name: string;
      url?: string;
      logoUrl?: string;
      isShared?: boolean;
      householdId?: number;
    },
  ) {
    if (!body.name) throw { httpCode: 400, message: "Nombre es requerido" };
    return userStoreService.create(req.userId!, body);
  }

  /**
   * @swagger
   * /api/stores/{id}:
   *   put:
   *     tags: [Tiendas]
   *     summary: Actualizar tienda
   */
  @Put("/:id")
  async update(
    @Param("id") id: number,
    @Req() req: AuthRequest,
    @Body()
    body: { name?: string; url?: string; logoUrl?: string; isShared?: boolean },
  ) {
    const householdId = await householdService.getHouseholdId(req.userId!);
    const store = await userStoreService.update(
      id,
      req.userId!,
      body,
      householdId ?? undefined,
    );
    if (!store) throw { httpCode: 404, message: "Tienda no encontrada" };
    return store;
  }

  /**
   * @swagger
   * /api/stores/{id}:
   *   delete:
   *     tags: [Tiendas]
   *     summary: Eliminar tienda
   */
  @Delete("/:id")
  @HttpCode(204)
  async delete(@Param("id") id: number, @Req() req: AuthRequest) {
    const ok = await userStoreService.delete(id, req.userId!);
    if (!ok) throw { httpCode: 404, message: "Tienda no encontrada" };
    return null;
  }

  /**
   * @swagger
   * /api/stores/{id}/unshare:
   *   post:
   *     tags: [Tiendas]
   *     summary: Dejar de compartir una tienda
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [mode]
   *             properties:
   *               mode:
   *                 type: string
   *                 enum: [delete, duplicate]
   *     responses:
   *       200:
   *         description: Tienda actualizada
   */
  @Post("/:id/unshare")
  async unshare(
    @Param("id") id: number,
    @Req() req: AuthRequest,
    @Body() body: { mode: "delete" | "duplicate" },
  ) {
    if (!body.mode || !["delete", "duplicate"].includes(body.mode))
      throw { httpCode: 400, message: "mode debe ser 'delete' o 'duplicate'" };
    const householdId = await householdService.getHouseholdId(req.userId!);
    const store = await userStoreService.unshare(
      id,
      req.userId!,
      body.mode,
      householdId ?? undefined,
    );
    if (!store) throw { httpCode: 404, message: "Tienda no encontrada" };
    return store;
  }

  /**
   * @swagger
   * /api/stores/{id}/check-other-users:
   *   get:
   *     tags: [Tiendas]
   *     summary: Comprobar si otros usuarios usan esta tienda
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Resultado
   */
  @Get("/:id/check-other-users")
  async checkOtherUsers(@Param("id") id: number) {
    return userStoreService.getOtherUsersIngredientCount(id);
  }

  /**
   * @swagger
   * /api/stores/{id}/merge:
   *   post:
   *     tags: [Tiendas]
   *     summary: Fusionar una tienda propia con otra del hogar
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [targetStoreId]
   *             properties:
   *               targetStoreId: { type: integer }
   *     responses:
   *       200:
   *         description: Tienda fusionada
   */
  @Post("/:id/merge")
  async mergeStores(
    @Param("id") sourceStoreId: number,
    @Req() req: AuthRequest,
    @Body() body: { targetStoreId: number },
  ) {
    if (!body.targetStoreId)
      throw { httpCode: 400, message: "targetStoreId es requerido" };
    const householdId = await householdService.getHouseholdId(req.userId!);
    if (!householdId)
      throw { httpCode: 400, message: "No perteneces a un hogar" };
    const store = await userStoreService.mergeStores(
      sourceStoreId,
      body.targetStoreId,
      req.userId!,
      householdId,
    );
    if (!store) throw { httpCode: 404, message: "Tienda no encontrada" };
    return store;
  }

  // ===== Ingredientes en tienda =====

  /**
   * @swagger
   * /api/stores/{id}/ingredients:
   *   post:
   *     tags: [Tiendas]
   *     summary: Añadir ingrediente a una tienda
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [ingredientId]
   *             properties:
   *               ingredientId: { type: integer }
   *               purchaseUrl: { type: string }
   *               preferredUnit: { type: string }
   *     responses:
   *       201:
   *         description: Ingrediente añadido
   */
  @Post("/:id/ingredients")
  @HttpCode(201)
  async addIngredient(
    @Param("id") storeId: number,
    @Req() req: AuthRequest,
    @Body()
    body: {
      ingredientId: number;
      purchaseUrl?: string;
      preferredUnit?: string;
      sortOrder?: number | null;
    },
  ) {
    if (!body.ingredientId)
      throw { httpCode: 400, message: "ingredientId es requerido" };
    const householdId = await householdService.getHouseholdId(req.userId!);
    const result = await userStoreService.addIngredient(
      storeId,
      req.userId!,
      body,
      householdId ?? undefined,
    );
    if (!result) throw { httpCode: 404, message: "Tienda no encontrada" };
    return result;
  }

  /**
   * @swagger
   * /api/stores/{id}/ingredients/{ingredientId}:
   *   delete:
   *     tags: [Tiendas]
   *     summary: Quitar ingrediente de una tienda
   */
  @Delete("/:id/ingredients/:ingredientId")
  @HttpCode(204)
  async removeIngredient(
    @Param("id") storeId: number,
    @Param("ingredientId") ingredientId: number,
    @Req() req: AuthRequest,
  ) {
    await userStoreService.removeIngredient(storeId, ingredientId, req.userId!);
    return null;
  }
}
