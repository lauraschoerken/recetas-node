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
import { homeItemService } from "../services";
import { HomeLocation } from "../domain";
import { authMiddleware, AuthRequest } from "../middlewares";

@JsonController("/home")
@UseBefore(authMiddleware)
export class HomeItemController {
  /**
   * @swagger
   * /api/home:
   *   get:
   *     tags: [Almacenamiento]
   *     summary: Listar items en nevera/congelador/despensa
   *     parameters:
   *       - in: query
   *         name: location
   *         schema:
   *           type: string
   *           enum: [nevera, congelador, despensa]
   *         description: Filtrar por ubicación
   *     responses:
   *       200:
   *         description: Lista de items
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/HomeItem'
   */
  @Get("/")
  async getAll(
    @QueryParam("location") location: HomeLocation | undefined,
    @Req() req: AuthRequest,
  ) {
    const userId = req.userId!;

    return location
      ? homeItemService.getByLocation(userId, location)
      : homeItemService.getAll(userId);
  }

  /**
   * @swagger
   * /api/home:
   *   post:
   *     tags: [Almacenamiento]
   *     summary: Añadir item al almacenamiento
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [location, quantity, unit]
   *             properties:
   *               ingredientId:
   *                 type: integer
   *                 example: 1
   *               ingredientName:
   *                 type: string
   *                 example: "Tomate"
   *               location:
   *                 type: string
   *                 enum: [nevera, congelador, despensa]
   *                 example: nevera
   *               quantity:
   *                 type: number
   *                 example: 500
   *               unit:
   *                 type: string
   *                 example: g
   *               expiresAt:
   *                 type: string
   *                 format: date
   *                 example: "2026-03-30"
   *     responses:
   *       201:
   *         description: Item añadido
   *       400:
   *         description: Datos inválidos
   */
  @Post("/")
  @HttpCode(201)
  async create(
    @Body()
    body: {
      location: HomeLocation;
      quantity: number;
      unit: string;
      expiresAt?: string;
      ingredientId?: number;
      recipeId?: number;
      ingredientName?: string;
      variantId?: number;
    },
    @Req() req: AuthRequest,
  ) {
    const userId = req.userId!;
    const {
      location,
      quantity,
      unit,
      expiresAt,
      ingredientId,
      recipeId,
      ingredientName,
      variantId,
    } = body;

    console.log("Create home item:", {
      location,
      quantity,
      unit,
      recipeId,
      ingredientId,
      ingredientName,
      variantId,
    });

    if (!location || quantity === undefined || !unit) {
      throw { httpCode: 400, message: "Faltan campos requeridos" };
    }

    if (!ingredientId && !recipeId && !ingredientName) {
      throw {
        httpCode: 400,
        message: "Debe especificar un ingrediente o una receta",
      };
    }

    return homeItemService.create(userId, {
      location,
      quantity,
      unit,
      expiresAt,
      ingredientId,
      recipeId: recipeId || undefined,
      ingredientName,
      variantId,
    });
  }

  /**
   * @swagger
   * /api/home/{id}:
   *   put:
   *     tags: [Almacenamiento]
   *     summary: Actualizar item
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
   *             properties:
   *               quantity:
   *                 type: number
   *               location:
   *                 type: string
   *                 enum: [nevera, congelador, despensa]
   *               expiresAt:
   *                 type: string
   *                 format: date
   *     responses:
   *       200:
   *         description: Item actualizado
   *       404:
   *         description: Item no encontrado
   */
  @Put("/:id")
  async update(
    @Param("id") id: number,
    @Body()
    body: {
      location?: HomeLocation;
      quantity?: number;
      unit?: string;
      expiresAt?: string;
    },
    @Req() req: AuthRequest,
  ) {
    const userId = req.userId!;
    const { location, quantity, unit, expiresAt } = body;

    const item = await homeItemService.update(id, userId, {
      location,
      quantity,
      unit,
      expiresAt,
    });

    if (!item) {
      throw { httpCode: 404, message: "Item no encontrado" };
    }

    return item;
  }

  /**
   * @swagger
   * /api/home/{id}:
   *   delete:
   *     tags: [Almacenamiento]
   *     summary: Eliminar item
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Item eliminado
   *       404:
   *         description: Item no encontrado
   */
  @Delete("/:id")
  @HttpCode(204)
  async delete(@Param("id") id: number, @Req() req: AuthRequest) {
    const userId = req.userId!;
    const deleted = await homeItemService.delete(id, userId);

    if (!deleted) {
      throw { httpCode: 404, message: "Item no encontrado" };
    }

    return null;
  }

  /**
   * @swagger
   * /api/home/{id}/cook:
   *   post:
   *     tags: [Almacenamiento]
   *     summary: Cocinar un ingrediente
   *     description: Transforma un ingrediente de un estado a otro (ej. arroz crudo a cocinado), aplicando el factor de peso
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
   *             required: [targetVariantId]
   *             properties:
   *               targetVariantId:
   *                 type: integer
   *                 description: ID del estado destino (ej. "Cocinado")
   *               quantity:
   *                 type: number
   *                 description: Cantidad a cocinar (si no se especifica, cocina todo)
   *               targetLocation:
   *                 type: string
   *                 enum: [nevera, congelador, despensa]
   *                 description: Ubicación donde guardar el resultado
   *     responses:
   *       200:
   *         description: Ingrediente cocinado
   *       400:
   *         description: Error en la operación
   *       404:
   *         description: Item no encontrado
   */
  @Post("/:id/cook")
  async cookIngredient(
    @Param("id") id: number,
    @Body()
    body: {
      targetVariantId: number;
      quantity?: number;
      targetLocation?: HomeLocation;
    },
    @Req() req: AuthRequest,
  ) {
    const userId = req.userId!;

    if (!body.targetVariantId) {
      throw { httpCode: 400, message: "Debe especificar el estado destino" };
    }

    try {
      return await homeItemService.cookIngredient(id, userId, {
        targetVariantId: body.targetVariantId,
        quantity: body.quantity,
        targetLocation: body.targetLocation,
      });
    } catch (error: any) {
      throw { httpCode: 400, message: error.message };
    }
  }

  /**
   * @swagger
   * /api/home/process-consumed:
   *   post:
   *     tags: [Almacenamiento]
   *     summary: Procesar ingredientes consumidos
   *     description: Descuenta ingredientes del almacenamiento según las comidas del día
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               date:
   *                 type: string
   *                 format: date
   *                 example: "2026-03-20"
   *     responses:
   *       200:
   *         description: Ingredientes procesados
   */
  @Post("/process-consumed")
  async processConsumed(@Req() req: AuthRequest) {
    const userId = req.userId!;
    return homeItemService.processConsumedMeals(userId);
  }

  @Get("/search")
  async search(
    @QueryParam("q") query: string,
    @QueryParam("location") location: HomeLocation | undefined,
    @QueryParam("belowMinimum") belowMinimum: boolean,
    @QueryParam("addedByUserId") addedByUserId: number | undefined,
    @Req() req: AuthRequest,
  ) {
    return homeItemService.search(req.userId!, {
      query,
      location,
      belowMinimum,
      addedByUserId,
    });
  }

  @Get("/:id/history")
  async getHistory(@Param("id") id: number, @Req() req: AuthRequest) {
    try {
      return await homeItemService.getHistory(id, req.userId!);
    } catch (e: any) {
      throw { httpCode: 404, message: e.message };
    }
  }

  @Post("/from-purchase")
  async addFromPurchase(
    @Body() body: { ingredientId: number; quantity: number; unit: string },
    @Req() req: AuthRequest,
  ) {
    if (!body.ingredientId || !body.quantity || !body.unit) {
      throw {
        httpCode: 400,
        message: "ingredientId, quantity y unit son requeridos",
      };
    }
    try {
      return await homeItemService.addFromPurchase(
        req.userId!,
        body.ingredientId,
        body.quantity,
        body.unit,
      );
    } catch (e: any) {
      throw { httpCode: 400, message: e.message };
    }
  }
}
