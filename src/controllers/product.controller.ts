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
import { adminMiddleware } from "../middlewares";
import { productService } from "../services/product.service";
import { authMiddleware, AuthRequest } from "../middlewares";

@JsonController("/products")
@UseBefore(authMiddleware)
export class ProductController {
  /**
   * @swagger
   * /api/products:
   *   get:
   *     tags: [Productos]
   *     summary: Listar todos los productos accesibles por el usuario
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de productos
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Product'
   */
  @Get("/")
  async getAll(@Req() req: AuthRequest) {
    return productService.getAll(req.userId!);
  }

  /**
   * @swagger
   * /api/products/search:
   *   get:
   *     tags: [Productos]
   *     summary: Buscar productos por nombre
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *         description: Texto de búsqueda
   *     responses:
   *       200:
   *         description: Productos encontrados
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Product'
   */
  @Get("/search")
  async search(@QueryParam("q") q: string, @Req() req: AuthRequest) {
    return productService.search(req.userId!, q || "");
  }

  /**
   * @swagger
   * /api/products/thresholds:
   *   get:
   *     tags: [Productos]
   *     summary: Obtener umbrales mínimos del usuario
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de umbrales
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/ProductThreshold'
   */
  @Get("/thresholds")
  async getThresholds(@Req() req: AuthRequest) {
    return productService.getThresholds(req.userId!);
  }

  /**
   * @swagger
   * /api/products/{id}:
   *   get:
   *     tags: [Productos]
   *     summary: Obtener producto por ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Producto encontrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Product'
   *       404:
   *         description: No encontrado
   */
  @Get("/:id")
  async getById(@Param("id") id: number, @Req() req: AuthRequest) {
    const product = await productService.getById(id, req.userId!);
    if (!product) {
      throw { httpCode: 404, message: "Producto no encontrado" };
    }
    return product;
  }

  /**
   * @swagger
   * /api/products:
   *   post:
   *     tags: [Productos]
   *     summary: Crear un nuevo producto
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateProduct'
   *     responses:
   *       201:
   *         description: Producto creado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Product'
   *       409:
   *         description: Nombre duplicado
   */
  @Post("/")
  @HttpCode(201)
  async create(@Body() body: any, @Req() req: AuthRequest) {
    return productService.create(req.userId!, {
      name: body.name,
      imageUrl: body.imageUrl,
      isGlobal: body.isGlobal,
    });
  }

  /**
   * @swagger
   * /api/products/{id}:
   *   put:
   *     tags: [Productos]
   *     summary: Actualizar un producto
   *     security:
   *       - bearerAuth: []
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
   *             $ref: '#/components/schemas/UpdateProduct'
   *     responses:
   *       200:
   *         description: Producto actualizado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Product'
   *       403:
   *         description: Sin permiso
   *       404:
   *         description: No encontrado
   */
  @Put("/:id")
  async update(
    @Param("id") id: number,
    @Body() body: any,
    @Req() req: AuthRequest,
  ) {
    return productService.update(
      id,
      req.userId!,
      (req as any).userRole || "USER",
      {
        name: body.name,
        imageUrl: body.imageUrl,
      },
    );
  }

  /**
   * @swagger
   * /api/products/{id}:
   *   delete:
   *     tags: [Productos]
   *     summary: Eliminar un producto
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Producto eliminado
   *       403:
   *         description: Sin permiso
   *       404:
   *         description: No encontrado
   */
  @Delete("/:id")
  async delete(@Param("id") id: number, @Req() req: AuthRequest) {
    const ok = await productService.delete(
      id,
      req.userId!,
      (req as any).userRole || "USER",
    );
    if (!ok) {
      throw { httpCode: 404, message: "Producto no encontrado" };
    }
    return { success: true };
  }

  /**
   * @swagger
   * /api/products/{id}/threshold:
   *   post:
   *     tags: [Productos]
   *     summary: Establecer umbral mínimo para un producto
   *     security:
   *       - bearerAuth: []
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
   *             required: [minQuantity, unit]
   *             properties:
   *               minQuantity:
   *                 type: number
   *               unit:
   *                 type: string
   *               householdId:
   *                 type: integer
   *                 nullable: true
   *     responses:
   *       200:
   *         description: Umbral guardado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ProductThreshold'
   */
  @Post("/:id/threshold")
  async setThreshold(
    @Param("id") id: number,
    @Body() body: any,
    @Req() req: AuthRequest,
  ) {
    return productService.setThreshold(id, req.userId!, {
      minQuantity: body.minQuantity,
      unit: body.unit,
      householdId: body.householdId,
    });
  }

  /**
   * @swagger
   * /api/products/{id}/threshold:
   *   delete:
   *     tags: [Productos]
   *     summary: Eliminar umbral mínimo de un producto
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Umbral eliminado
   */
  @Delete("/:id/threshold")
  async deleteThreshold(@Param("id") id: number, @Req() req: AuthRequest) {
    const ok = await productService.deleteThreshold(id, req.userId!);
    return { success: ok };
  }

  // ── Override personal ─────────────────────────────────────────────────

  /**
   * @swagger
   * /api/products/{id}/override:
   *   get:
   *     tags: [Productos]
   *     summary: Obtener override personal del usuario para un producto global
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Override encontrado o null
   */
  @Get("/:id/override")
  async getOverride(@Param("id") id: number, @Req() req: AuthRequest) {
    return productService.getOverride(id, req.userId!);
  }

  /**
   * @swagger
   * /api/products/{id}/override:
   *   put:
   *     tags: [Productos]
   *     summary: Guardar override personal (nombre/imagen) para un producto global
   *     security:
   *       - bearerAuth: []
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
   *               name:
   *                 type: string
   *               imageUrl:
   *                 type: string
   *                 nullable: true
   *     responses:
   *       200:
   *         description: Override guardado
   */
  @Put("/:id/override")
  async upsertOverride(
    @Param("id") id: number,
    @Body() body: any,
    @Req() req: AuthRequest,
  ) {
    return productService.upsertOverride(id, req.userId!, {
      name: body.name,
      imageUrl: body.imageUrl,
    });
  }

  /**
   * @swagger
   * /api/products/{id}/override:
   *   delete:
   *     tags: [Productos]
   *     summary: Eliminar override personal de un producto
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Override eliminado
   */
  @Delete("/:id/override")
  async deleteOverride(@Param("id") id: number, @Req() req: AuthRequest) {
    const ok = await productService.deleteOverride(id, req.userId!);
    return { success: ok };
  }

  // ── Ocultación personal ────────────────────────────────────────────────

  /**
   * @swagger
   * /api/products/{id}/hide:
   *   post:
   *     tags: [Productos]
   *     summary: Ocultar un producto de la lista personal del usuario
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Producto ocultado
   *       404:
   *         description: Producto no encontrado
   */
  @Post("/:id/hide")
  async hideProduct(@Param("id") id: number, @Req() req: AuthRequest) {
    await productService.hideProduct(id, req.userId!);
    return { success: true };
  }

  /**
   * @swagger
   * /api/products/{id}/hide:
   *   delete:
   *     tags: [Productos]
   *     summary: Mostrar de nuevo un producto ocultado
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Producto visible de nuevo
   */
  @Delete("/:id/hide")
  async unhideProduct(@Param("id") id: number, @Req() req: AuthRequest) {
    await productService.unhideProduct(id, req.userId!);
    return { success: true };
  }

  /**
   * @swagger
   * /api/products/hidden:
   *   get:
   *     tags: [Productos]
   *     summary: Listar los productos ocultados por el usuario
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de productos ocultados
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Product'
   */
  @Get("/hidden")
  async getHiddenProducts(@Req() req: AuthRequest) {
    return productService.getHiddenProducts(req.userId!);
  }

  // ── Propuestas de cambio ──────────────────────────────────────────────

  /**
   * @swagger
   * /api/products/{id}/propose:
   *   post:
   *     tags: [Productos]
   *     summary: Proponer un cambio en un producto global al admin
   *     security:
   *       - bearerAuth: []
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
   *             required: [fieldName, currentValue, proposedValue]
   *             properties:
   *               fieldName:
   *                 type: string
   *                 enum: [name, imageUrl]
   *               currentValue:
   *                 type: string
   *               proposedValue:
   *                 type: string
   *     responses:
   *       201:
   *         description: Propuesta creada
   *       409:
   *         description: Ya existe una propuesta pendiente para este campo
   */
  @Post("/:id/propose")
  @HttpCode(201)
  async propose(
    @Param("id") id: number,
    @Body() body: any,
    @Req() req: AuthRequest,
  ) {
    return productService.createProposal(id, req.userId!, {
      fieldName: body.fieldName,
      currentValue: body.currentValue,
      proposedValue: body.proposedValue,
    });
  }

  /**
   * @swagger
   * /api/products/proposals:
   *   get:
   *     tags: [Productos]
   *     summary: Listar propuestas de cambio (admin ve todas, usuario ve las suyas)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PENDING, ACCEPTED, REJECTED]
   *     responses:
   *       200:
   *         description: Lista de propuestas
   */
  @Get("/proposals")
  async getProposals(@Req() req: AuthRequest) {
    return productService.getProposals(
      req.userId!,
      (req as any).userRole || "USER",
    );
  }

  /**
   * @swagger
   * /api/products/proposals/{id}/review:
   *   put:
   *     tags: [Productos]
   *     summary: (Admin) Revisar una propuesta de cambio
   *     security:
   *       - bearerAuth: []
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
   *             required: [decision]
   *             properties:
   *               decision:
   *                 type: string
   *                 enum: [ACCEPTED, REJECTED]
   *               adminNote:
   *                 type: string
   *     responses:
   *       200:
   *         description: Propuesta revisada; si ACCEPTED el producto global se actualiza
   *       403:
   *         description: Solo administradores
   *       404:
   *         description: Propuesta no encontrada
   */
  @Put("/proposals/:id/review")
  @UseBefore(adminMiddleware)
  async reviewProposal(
    @Param("id") id: number,
    @Body() body: any,
    @Req() req: AuthRequest,
  ) {
    return productService.reviewProposal(
      id,
      req.userId!,
      body.decision,
      body.adminNote,
    );
  }
}
