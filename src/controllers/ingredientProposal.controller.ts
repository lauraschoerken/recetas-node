import {
  JsonController,
  Get,
  Post,
  Put,
  Param,
  Body,
  QueryParam,
  Req,
  UseBefore,
  HttpCode,
} from "routing-controllers";
import { ingredientProposalService } from "../services";
import { authMiddleware, adminMiddleware, AuthRequest } from "../middlewares";

@JsonController("/ingredient-proposals")
@UseBefore(authMiddleware)
export class IngredientProposalController {
  /**
   * @swagger
   * /api/ingredient-proposals:
   *   get:
   *     tags: [Propuestas]
   *     summary: Listar propuestas (admin ve todas, usuario ve las suyas)
   *     parameters:
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [PENDING, ACCEPTED, REJECTED] }
   *     responses:
   *       200:
   *         description: Lista de propuestas
   */
  @Get("/")
  async getAll(
    @QueryParam("status") status?: string,
    @Req() req?: AuthRequest,
  ) {
    const isAdmin = req?.userRole === "ADMIN";
    return ingredientProposalService.getAll({
      status,
      userId: isAdmin ? undefined : req?.userId,
    });
  }

  /**
   * @swagger
   * /api/ingredient-proposals/{id}:
   *   get:
   *     tags: [Propuestas]
   *     summary: Obtener propuesta por ID
   */
  @Get("/:id")
  async getById(@Param("id") id: number) {
    const proposal = await ingredientProposalService.getById(id);
    if (!proposal) throw { httpCode: 404, message: "Propuesta no encontrada" };
    return proposal;
  }

  /**
   * @swagger
   * /api/ingredient-proposals:
   *   post:
   *     tags: [Propuestas]
   *     summary: Enviar una propuesta de cambio/nuevo ingrediente
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [type, ingredientId]
   *             properties:
   *               type: { type: string, enum: [NEW_INGREDIENT, EDIT_FIELD, NEW_VARIANT, EDIT_VARIANT, NEW_CONVERSION] }
   *               ingredientId: { type: integer }
   *               variantId: { type: integer }
   *               fieldName: { type: string }
   *               currentValue: {}
   *               proposedValue: {}
   *     responses:
   *       201:
   *         description: Propuesta creada
   */
  @Post("/")
  @HttpCode(201)
  async create(
    @Req() req: AuthRequest,
    @Body()
    body: {
      type: string;
      ingredientId: number;
      variantId?: number;
      fieldName?: string;
      currentValue?: unknown;
      proposedValue?: unknown;
    },
  ) {
    if (!body.type || !body.ingredientId) {
      throw { httpCode: 400, message: "type e ingredientId son requeridos" };
    }
    return ingredientProposalService.create(body, req.userId!);
  }

  /**
   * @swagger
   * /api/ingredient-proposals/{id}/review:
   *   put:
   *     tags: [Propuestas]
   *     summary: (Admin) Revisar propuesta — aceptar o rechazar
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status: { type: string, enum: [ACCEPTED, REJECTED] }
   *               adminNote: { type: string }
   *     responses:
   *       200:
   *         description: Propuesta revisada
   */
  @Put("/:id/review")
  @UseBefore(adminMiddleware)
  async review(
    @Param("id") id: number,
    @Req() req: AuthRequest,
    @Body() body: { status: "ACCEPTED" | "REJECTED"; adminNote?: string },
  ) {
    if (!body.status) throw { httpCode: 400, message: "status es requerido" };
    const result = await ingredientProposalService.review(
      id,
      req.userId!,
      body.status,
      body.adminNote,
    );
    if (!result)
      throw { httpCode: 404, message: "Propuesta no encontrada o ya revisada" };
    return result;
  }
}
