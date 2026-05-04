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
  Res,
  UseBefore,
  HttpCode,
} from "routing-controllers";
import { Response } from "express";
import PDFDocument from "pdfkit";
import { shoppingService, homeItemService } from "../services";
import { authMiddleware, AuthRequest } from "../middlewares";

@JsonController("")
@UseBefore(authMiddleware)
export class ShoppingController {
  /**
   * @swagger
   * /api/week-plan:
   *   get:
   *     tags: [Plan Semanal]
   *     summary: Obtener plan semanal
   *     parameters:
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         example: "2026-04-14"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         example: "2026-04-20"
   *     responses:
   *       200:
   *         description: Entradas del plan semanal
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/WeekPlan'
   *       400:
   *         description: startDate y endDate son requeridos
   */
  @Get("/week-plan")
  async getWeekPlan(
    @QueryParam("startDate") startDate: string,
    @QueryParam("endDate") endDate: string,
    @Req() req: AuthRequest,
  ) {
    if (!startDate || !endDate) {
      throw { httpCode: 400, message: "startDate y endDate son requeridos" };
    }

    return shoppingService.getWeekPlan(
      req.userId!,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * @swagger
   * /api/week-plan:
   *   post:
   *     tags: [Plan Semanal]
   *     summary: Añadir entrada al plan semanal
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateWeekPlan'
   *     responses:
   *       201:
   *         description: Entrada creada
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/WeekPlan'
   *       400:
   *         description: recipeId o ingredientId requerido, o plannedDate faltante
   */
  @Post("/week-plan")
  @HttpCode(201)
  async addToWeekPlan(
    @Body()
    body: {
      recipeId?: number;
      ingredientId?: number;
      ingredientQty?: number;
      ingredientUnit?: string;
      plannedDate: string;
      servings?: number;
      type?: string;
      selections?: number[];
    },
    @Req() req: AuthRequest,
  ) {
    const {
      recipeId,
      ingredientId,
      ingredientQty,
      ingredientUnit,
      plannedDate,
      servings,
      type,
      selections,
    } = body;

    if (!recipeId && !ingredientId) {
      throw {
        httpCode: 400,
        message: "recipeId o ingredientId son requeridos",
      };
    }

    if (!plannedDate) {
      throw { httpCode: 400, message: "plannedDate es requerido" };
    }

    return shoppingService.addToWeekPlan(
      {
        recipeId,
        ingredientId,
        ingredientQty,
        ingredientUnit,
        plannedDate,
        servings,
        type: (type as "meal" | "prep") || "meal",
        selections,
      },
      req.userId!,
    );
  }

  /**
   * @swagger
   * /api/week-plan/{id}:
   *   put:
   *     tags: [Plan Semanal]
   *     summary: Actualizar fecha de una entrada del plan
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
   *             required: [plannedDate]
   *             properties:
   *               plannedDate:
   *                 type: string
   *                 format: date
   *                 example: "2026-04-15"
   *     responses:
   *       200:
   *         description: Fecha actualizada
   *       404:
   *         description: Plan no encontrado
   */
  @Put("/week-plan/:id")
  async updatePlanDate(
    @Param("id") id: number,
    @Body() body: { plannedDate: string },
    @Req() req: AuthRequest,
  ) {
    const { plannedDate } = body;

    if (!plannedDate) {
      throw { httpCode: 400, message: "plannedDate es requerido" };
    }

    const plan = await shoppingService.updatePlanDate(
      id,
      new Date(plannedDate),
      req.userId!,
    );

    if (!plan) {
      throw { httpCode: 404, message: "Plan no encontrado" };
    }

    return plan;
  }

  /**
   * @swagger
   * /api/week-plan/{id}:
   *   delete:
   *     tags: [Plan Semanal]
   *     summary: Eliminar entrada del plan semanal
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Entrada eliminada
   *       404:
   *         description: Plan no encontrado
   */
  @Delete("/week-plan/:id")
  @HttpCode(204)
  async removeFromWeekPlan(@Param("id") id: number, @Req() req: AuthRequest) {
    const removed = await shoppingService.removeFromWeekPlan(id, req.userId!);

    if (!removed) {
      throw { httpCode: 404, message: "Plan no encontrado" };
    }

    return null;
  }

  /**
   * @swagger
   * /api/week-plan/{id}/cook:
   *   post:
   *     tags: [Plan Semanal]
   *     summary: Marcar entrada como cocinada
   *     description: Marca la receta/ingrediente como cocinado y opcionalmente guarda sobras en el almacenamiento
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               leftoverServings:
   *                 type: number
   *                 example: 2
   *                 description: Raciones sobrantes a guardar
   *               leftoverLocation:
   *                 type: string
   *                 enum: [nevera, congelador, despensa]
   *                 example: nevera
   *     responses:
   *       200:
   *         description: Marcado como cocinado
   */
  @Post("/week-plan/:id/cook")
  async markAsCooked(
    @Param("id") id: number,
    @Body() body: { leftoverServings?: number; leftoverLocation?: string },
    @Req() req: AuthRequest,
  ) {
    const leftoverServings = body.leftoverServings || 0;
    const leftoverLocation = body.leftoverLocation || "nevera";

    return shoppingService.markAsCooked(
      id,
      req.userId!,
      leftoverServings,
      leftoverLocation,
    );
  }

  /**
   * @swagger
   * /api/week-plan/{id}/consume:
   *   post:
   *     tags: [Plan Semanal]
   *     summary: Marcar entrada como consumida
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Marcado como consumido
   */
  @Post("/week-plan/:id/consume")
  async markAsConsumed(@Param("id") id: number, @Req() req: AuthRequest) {
    return shoppingService.markAsConsumed(id, req.userId!);
  }

  /**
   * @swagger
   * /api/shopping-list:
   *   get:
   *     tags: [Lista de Compra]
   *     summary: Obtener lista de la compra generada del plan semanal
   *     description: Si no se pasan fechas, devuelve todos los ítems pendientes desde hoy en adelante
   *     parameters:
   *       - in: query
   *         name: startDate
   *         required: false
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         required: false
   *         schema:
   *           type: string
   *           format: date
   *     responses:
   *       200:
   *         description: Lista de la compra calculada
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/ShoppingItem'
   */
  @Get("/shopping-list")
  async getShoppingList(
    @QueryParam("startDate") startDate: string,
    @QueryParam("endDate") endDate: string,
    @Req() req: AuthRequest,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return shoppingService.generateShoppingList(req.userId!, start, end);
  }

  /**
   * @swagger
   * /api/shopping-list/add:
   *   post:
   *     tags: [Lista de Compra]
   *     summary: Añadir items manualmente a la lista de la compra
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [items]
   *             properties:
   *               items:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required: [ingredientId, quantity, unit]
   *                   properties:
   *                     ingredientId:
   *                       type: integer
   *                       example: 1
   *                     quantity:
   *                       type: number
   *                       example: 500
   *                     unit:
   *                       type: string
   *                       example: g
   *     responses:
   *       201:
   *         description: Items añadidos
   *       400:
   *         description: items requerido y no vacío
   */
  @Post("/shopping-list/add")
  @HttpCode(201)
  async addToShoppingList(
    @Body()
    body: {
      items: { ingredientId: number; quantity: number; unit: string }[];
    },
    @Req() req: AuthRequest,
  ) {
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      throw {
        httpCode: 400,
        message: "items es requerido y debe ser un array no vacío",
      };
    }

    return shoppingService.addManualItems(body.items, req.userId!);
  }

  /**
   * @swagger
   * /api/shopping-list/add-product:
   *   post:
   *     tags: [Lista de Compra]
   *     summary: Añadir un producto a la lista de la compra
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [productId, quantity, unit]
   *             properties:
   *               productId:
   *                 type: integer
   *               quantity:
   *                 type: number
   *               unit:
   *                 type: string
   *     responses:
   *       201:
   *         description: Producto añadido
   *       400:
   *         description: Datos inválidos
   */
  @Post("/shopping-list/add-product")
  @HttpCode(201)
  async addProductToShoppingList(
    @Body() body: { productId: number; quantity: number; unit: string },
    @Req() req: AuthRequest,
  ) {
    if (!body.productId || !body.quantity || !body.unit) {
      throw {
        httpCode: 400,
        message: "productId, quantity y unit son requeridos",
      };
    }
    return shoppingService.addProductItem(
      body.productId,
      body.quantity,
      body.unit,
      req.userId!,
    );
  }

  /**
   * @swagger
   * /api/shopping-list/mark-purchased:
   *   post:
   *     tags: [Lista de Compra]
   *     summary: Marcar items como comprados y moverlos al almacenamiento
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [items]
   *             properties:
   *               items:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required: [ingredientId, quantity, unit]
   *                   properties:
   *                     ingredientId:
   *                       type: integer
   *                     quantity:
   *                       type: number
   *                     unit:
   *                       type: string
   *     responses:
   *       200:
   *         description: Resultado de cada item procesado
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 results:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       ingredientId:
   *                         type: integer
   *                       success:
   *                         type: boolean
   *                       homeItemId:
   *                         type: integer
   *                       error:
   *                         type: string
   */
  @Post("/shopping-list/mark-purchased")
  async markPurchased(
    @Body()
    body: { items: { ingredientId: number; quantity: number; unit: string }[] },
    @Req() req: AuthRequest,
  ) {
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      throw {
        httpCode: 400,
        message: "items es requerido y debe ser un array no vacío",
      };
    }

    const results = [];
    for (const item of body.items) {
      try {
        const homeItem = await homeItemService.addFromPurchase(
          req.userId!,
          item.ingredientId,
          item.quantity,
          item.unit,
        );
        await shoppingService.markShoppingItemPurchased(
          item.ingredientId,
          req.userId!,
        );
        results.push({
          ingredientId: item.ingredientId,
          success: true,
          homeItemId: homeItem.id,
        });
      } catch (e: any) {
        results.push({
          ingredientId: item.ingredientId,
          success: false,
          error: e.message,
        });
      }
    }
    return { results };
  }

  /**
   * @swagger
   * /api/shopping-list/export/pdf:
   *   post:
   *     tags: [Lista de Compra]
   *     summary: Exportar lista de la compra como PDF
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [items]
   *             properties:
   *               items:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     name: { type: string }
   *                     quantityToBuy: { type: number }
   *                     unit: { type: string }
   *               weekLabel:
   *                 type: string
   *     responses:
   *       200:
   *         description: PDF generado
   *         content:
   *           application/pdf:
   *             schema:
   *               type: string
   *               format: binary
   *       400:
   *         description: No hay items
   */
  @Post("/shopping-list/export/pdf")
  async exportShoppingListPdf(
    @Body()
    body: {
      items: { name: string; quantityToBuy: number; unit: string }[];
      weekLabel?: string;
    },
    @Req() req: AuthRequest,
    @Res() res: Response,
  ) {
    if (!body.items || body.items.length === 0) {
      throw { httpCode: 400, message: "No hay items para exportar" };
    }

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve, reject) => {
      doc.on("end", resolve);
      doc.on("error", reject);

      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("Lista de la Compra", { align: "center" });

      if (body.weekLabel) {
        doc
          .moveDown(0.4)
          .fontSize(11)
          .font("Helvetica")
          .fillColor("#666666")
          .text(body.weekLabel, { align: "center" });
      }

      doc
        .moveDown(0.8)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor("#dddddd")
        .stroke()
        .moveDown(0.6);

      doc.fontSize(12).font("Helvetica").fillColor("#000000");
      for (const item of body.items) {
        const qty =
          item.quantityToBuy % 1 === 0
            ? String(item.quantityToBuy)
            : item.quantityToBuy.toFixed(1);
        doc.text(`\u2022  ${item.name}: ${qty} ${item.unit}`, { indent: 10 });
      }

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="lista-compra.pdf"',
    );
    res.send(pdfBuffer);
    return res;
  }
}
