import {
  JsonController,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  QueryParam,
  Req,
  UseBefore,
  HttpCode,
} from "routing-controllers";
import { alertService } from "../services";
import { authMiddleware, AuthRequest } from "../middlewares";

@JsonController("/alerts")
@UseBefore(authMiddleware)
export class AlertController {
  /**
   * @swagger
   * /api/alerts:
   *   get:
   *     tags: [Alertas]
   *     summary: Listar alertas de stock del usuario
   *     parameters:
   *       - in: query
   *         name: includeResolved
   *         schema:
   *           type: boolean
   *         description: Si true, incluye alertas ya resueltas
   *     responses:
   *       200:
   *         description: Lista de alertas
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Alert'
   */
  @Get("/")
  async getAlerts(
    @QueryParam("includeResolved") includeResolved: boolean,
    @Req() req: AuthRequest,
  ) {
    return alertService.getAlerts(req.userId!, includeResolved);
  }

  /**
   * @swagger
   * /api/alerts/count:
   *   get:
   *     tags: [Alertas]
   *     summary: Obtener número de alertas no leídas
   *     responses:
   *       200:
   *         description: Conteo de alertas no leídas
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 count:
   *                   type: integer
   *                   example: 3
   */
  @Get("/count")
  async getUnreadCount(@Req() req: AuthRequest) {
    const count = await alertService.getUnreadCount(req.userId!);
    return { count };
  }

  /**
   * @swagger
   * /api/alerts/{id}:
   *   put:
   *     tags: [Alertas]
   *     summary: Actualizar estado de una alerta
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [read, resolved, dismissed]
   *                 example: resolved
   *     responses:
   *       200:
   *         description: Alerta actualizada
   *       404:
   *         description: Alerta no encontrada
   */
  @Put("/:id")
  async updateAlert(
    @Param("id") id: number,
    @Body() body: any,
    @Req() req: AuthRequest,
  ) {
    if (!body.status) throw { httpCode: 400, message: "Status es requerido" };
    try {
      return await alertService.updateAlert(id, body, req.userId!);
    } catch (e: any) {
      throw { httpCode: 404, message: e.message };
    }
  }

  // ── Ingredient thresholds ──

  /**
   * @swagger
   * /api/alerts/thresholds/ingredients:
   *   get:
   *     tags: [Alertas]
   *     summary: Listar umbrales mínimos de ingredientes
   *     responses:
   *       200:
   *         description: Lista de umbrales configurados
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/IngredientThreshold'
   */
  @Get("/thresholds/ingredients")
  async getIngredientThresholds(@Req() req: AuthRequest) {
    return alertService.getIngredientThresholds(req.userId!);
  }

  /**
   * @swagger
   * /api/alerts/thresholds/ingredients:
   *   post:
   *     tags: [Alertas]
   *     summary: Crear o actualizar umbral mínimo de un ingrediente
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [ingredientId, minQuantity, unit]
   *             properties:
   *               ingredientId:
   *                 type: integer
   *                 example: 1
   *               minQuantity:
   *                 type: number
   *                 example: 200
   *               unit:
   *                 type: string
   *                 example: g
   *     responses:
   *       201:
   *         description: Umbral creado o actualizado
   *       400:
   *         description: Campos requeridos faltantes
   */
  @Post("/thresholds/ingredients")
  @HttpCode(201)
  async setIngredientThreshold(
    @Body() body: { ingredientId: number; minQuantity: number; unit: string },
    @Req() req: AuthRequest,
  ) {
    if (!body.ingredientId || body.minQuantity === undefined || !body.unit) {
      throw {
        httpCode: 400,
        message: "ingredientId, minQuantity y unit son requeridos",
      };
    }
    return alertService.setIngredientThreshold(body, req.userId!);
  }

  /**
   * @swagger
   * /api/alerts/thresholds/ingredients/{ingredientId}:
   *   delete:
   *     tags: [Alertas]
   *     summary: Eliminar umbral mínimo de un ingrediente
   *     parameters:
   *       - in: path
   *         name: ingredientId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Umbral eliminado
   */
  @Delete("/thresholds/ingredients/:ingredientId")
  @HttpCode(204)
  async deleteIngredientThreshold(
    @Param("ingredientId") ingredientId: number,
    @Req() req: AuthRequest,
  ) {
    await alertService.deleteIngredientThreshold(ingredientId, req.userId!);
    return null;
  }

  // ── Recipe thresholds ──

  /**
   * @swagger
   * /api/alerts/thresholds/recipes:
   *   get:
   *     tags: [Alertas]
   *     summary: Listar umbrales mínimos de recetas
   *     responses:
   *       200:
   *         description: Lista de umbrales de recetas
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/RecipeThreshold'
   */
  @Get("/thresholds/recipes")
  async getRecipeThresholds(@Req() req: AuthRequest) {
    return alertService.getRecipeThresholds(req.userId!);
  }

  /**
   * @swagger
   * /api/alerts/thresholds/recipes:
   *   post:
   *     tags: [Alertas]
   *     summary: Crear o actualizar umbral mínimo de una receta
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [recipeId, minServings]
   *             properties:
   *               recipeId:
   *                 type: integer
   *                 example: 1
   *               minServings:
   *                 type: number
   *                 example: 2
   *     responses:
   *       201:
   *         description: Umbral creado o actualizado
   *       400:
   *         description: Campos requeridos faltantes
   */
  @Post("/thresholds/recipes")
  @HttpCode(201)
  async setRecipeThreshold(
    @Body() body: { recipeId: number; minServings: number },
    @Req() req: AuthRequest,
  ) {
    if (!body.recipeId || body.minServings === undefined) {
      throw { httpCode: 400, message: "recipeId y minServings son requeridos" };
    }
    return alertService.setRecipeThreshold(body, req.userId!);
  }

  /**
   * @swagger
   * /api/alerts/thresholds/recipes/{recipeId}:
   *   delete:
   *     tags: [Alertas]
   *     summary: Eliminar umbral mínimo de una receta
   *     parameters:
   *       - in: path
   *         name: recipeId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Umbral eliminado
   */
  @Delete("/thresholds/recipes/:recipeId")
  @HttpCode(204)
  async deleteRecipeThreshold(
    @Param("recipeId") recipeId: number,
    @Req() req: AuthRequest,
  ) {
    await alertService.deleteRecipeThreshold(recipeId, req.userId!);
    return null;
  }
}
