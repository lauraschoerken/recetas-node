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
import { ingredientTagService } from "../services";
import { authMiddleware, adminMiddleware, AuthRequest } from "../middlewares";

@JsonController("/ingredient-tags")
@UseBefore(authMiddleware)
export class IngredientTagController {
  /**
   * @swagger
   * /api/ingredient-tags:
   *   get:
   *     tags: [Tags]
   *     summary: Listar tags visibles para el usuario (globales + personales)
   *     responses:
   *       200:
   *         description: Lista de tags
   */
  @Get("/")
  async getAll(@Req() req: AuthRequest) {
    return ingredientTagService.getAll(req.userId!);
  }

  /**
   * @swagger
   * /api/ingredient-tags:
   *   post:
   *     tags: [Tags]
   *     summary: Crear una nueva tag (global solo para admins)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name: { type: string }
   *               color: { type: string }
   *               isGlobal: { type: boolean }
   *     responses:
   *       201:
   *         description: Tag creada
   */
  @Post("/")
  @HttpCode(201)
  async create(
    @Req() req: AuthRequest,
    @Body() body: { name: string; color?: string; isGlobal?: boolean },
  ) {
    if (!body.name) throw { httpCode: 400, message: "Nombre es requerido" };
    // Solo admins pueden crear tags globales
    const isGlobal =
      req.userRole === "ADMIN" ? (body.isGlobal ?? false) : false;
    return ingredientTagService.create(
      req.userId!,
      body.name,
      body.color,
      isGlobal,
    );
  }

  /**
   * @swagger
   * /api/ingredient-tags/{id}:
   *   put:
   *     tags: [Tags]
   *     summary: Actualizar tag (solo creador o admin)
   */
  @Put("/:id")
  async update(
    @Param("id") id: number,
    @Req() req: AuthRequest,
    @Body() body: { name?: string; color?: string },
  ) {
    const result = await ingredientTagService.update(
      id,
      req.userId!,
      req.userRole!,
      body,
    );
    if (!result)
      throw { httpCode: 403, message: "No autorizado o no encontrado" };
    return result;
  }

  /**
   * @swagger
   * /api/ingredient-tags/{id}:
   *   delete:
   *     tags: [Tags]
   *     summary: Eliminar tag (solo creador o admin)
   */
  @Delete("/:id")
  @HttpCode(204)
  async delete(@Param("id") id: number, @Req() req: AuthRequest) {
    const ok = await ingredientTagService.delete(
      id,
      req.userId!,
      req.userRole!,
    );
    if (!ok) throw { httpCode: 403, message: "No autorizado o no encontrado" };
    return null;
  }

  // ===== Asignaciones de tags a ingredientes =====

  /**
   * @swagger
   * /api/ingredient-tags/ingredients/{ingredientId}:
   *   get:
   *     tags: [Tags]
   *     summary: Obtener tags de un ingrediente para el usuario
   */
  @Get("/ingredients/:ingredientId")
  async getForIngredient(
    @Param("ingredientId") ingredientId: number,
    @Req() req: AuthRequest,
  ) {
    return ingredientTagService.getForIngredient(ingredientId, req.userId!);
  }

  /**
   * @swagger
   * /api/ingredient-tags/ingredients/{ingredientId}/assign/{tagId}:
   *   post:
   *     tags: [Tags]
   *     summary: Asignar tag a un ingrediente
   */
  @Post("/ingredients/:ingredientId/assign/:tagId")
  @HttpCode(201)
  async assign(
    @Param("ingredientId") ingredientId: number,
    @Param("tagId") tagId: number,
    @Req() req: AuthRequest,
  ) {
    const result = await ingredientTagService.assign(
      ingredientId,
      tagId,
      req.userId!,
      req.userRole!,
    );
    if (!result) throw { httpCode: 404, message: "Tag no encontrada" };
    return result;
  }

  /**
   * @swagger
   * /api/ingredient-tags/ingredients/{ingredientId}/unassign/{tagId}:
   *   delete:
   *     tags: [Tags]
   *     summary: Quitar tag de un ingrediente
   */
  @Delete("/ingredients/:ingredientId/unassign/:tagId")
  @HttpCode(204)
  async unassign(
    @Param("ingredientId") ingredientId: number,
    @Param("tagId") tagId: number,
    @Req() req: AuthRequest,
  ) {
    await ingredientTagService.unassign(
      ingredientId,
      tagId,
      req.userId!,
      req.userRole!,
    );
    return null;
  }

  /**
   * @swagger
   * /api/ingredient-tags/ingredients/{ingredientId}/hide/{tagId}:
   *   post:
   *     tags: [Tags]
   *     summary: Ocultar tag global en un ingrediente para el usuario
   */
  @Post("/ingredients/:ingredientId/hide/:tagId")
  @HttpCode(201)
  async hide(
    @Param("ingredientId") ingredientId: number,
    @Param("tagId") tagId: number,
    @Req() req: AuthRequest,
  ) {
    return ingredientTagService.hide(ingredientId, tagId, req.userId!);
  }

  /**
   * @swagger
   * /api/ingredient-tags/ingredients/{ingredientId}/unhide/{tagId}:
   *   delete:
   *     tags: [Tags]
   *     summary: Mostrar tag (quitar ocultación)
   */
  @Delete("/ingredients/:ingredientId/unhide/:tagId")
  @HttpCode(204)
  async unhide(
    @Param("ingredientId") ingredientId: number,
    @Param("tagId") tagId: number,
    @Req() req: AuthRequest,
  ) {
    await ingredientTagService.unhide(ingredientId, tagId, req.userId!);
    return null;
  }
}
