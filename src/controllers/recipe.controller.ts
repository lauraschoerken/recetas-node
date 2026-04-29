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
import { recipeService } from "../services";
import { authMiddleware, AuthRequest } from "../middlewares";
import { CreateRecipeDto, UpdateRecipeDto } from "../domain";

@JsonController("/recipes")
@UseBefore(authMiddleware)
export class RecipeController {
  /**
   * @swagger
   * /api/recipes:
   *   get:
   *     tags: [Recetas]
   *     summary: Listar recetas del usuario con paginación
   *     description: Devuelve las recetas propias más las recetas públicas de otros usuarios. Soporta paginación server-side.
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Número de página
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           default: 12
   *         description: Elementos por página
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Filtrar por título
   *       - in: query
   *         name: visibility
   *         schema:
   *           type: string
   *           enum: [all, public, mine]
   *           default: all
   *         description: Filtrar por visibilidad (all/public/mine)
   *       - in: query
   *         name: ingredient
   *         schema:
   *           type: string
   *         description: Filtrar por nombre de ingrediente
   *     responses:
   *       200:
   *         description: Objeto con data y total
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Recipe'
   *                 total:
   *                   type: integer
   */
  @Get("/")
  async getAll(
    @Req() req: AuthRequest,
    @QueryParam("page") page?: number,
    @QueryParam("pageSize") pageSize?: number,
    @QueryParam("search") search?: string,
    @QueryParam("visibility") visibility?: string,
    @QueryParam("ingredient") ingredient?: string,
  ) {
    return recipeService.getAll(req.userId!, {
      page,
      pageSize,
      search,
      visibility,
      ingredient,
    });
  }

  /**
   * @swagger
   * /api/recipes/{id}:
   *   get:
   *     tags: [Recetas]
   *     summary: Obtener receta por ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID de la receta
   *     responses:
   *       200:
   *         description: Datos de la receta
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Recipe'
   *       404:
   *         description: Receta no encontrada
   */
  @Get("/:id")
  async getById(@Param("id") id: number, @Req() req: AuthRequest) {
    const recipe = await recipeService.getById(id, req.userId!);

    if (!recipe) {
      throw { httpCode: 404, message: "Receta no encontrada" };
    }

    return recipe;
  }

  /**
   * @swagger
   * /api/recipes:
   *   post:
   *     tags: [Recetas]
   *     summary: Crear nueva receta
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateRecipe'
   *     responses:
   *       201:
   *         description: Receta creada
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Recipe'
   *       400:
   *         description: Datos inválidos (título o ingredientes requeridos)
   */
  @Post("/")
  @HttpCode(201)
  async create(@Body() body: CreateRecipeDto, @Req() req: AuthRequest) {
    const { title, ingredients, components } = body;

    if (!title) {
      throw { httpCode: 400, message: "Título es requerido" };
    }

    if (
      (!ingredients || ingredients.length === 0) &&
      (!components || components.length === 0)
    ) {
      throw { httpCode: 400, message: "Debe tener ingredientes o componentes" };
    }

    return recipeService.create(body, req.userId!);
  }

  /**
   * @swagger
   * /api/recipes/{id}:
   *   put:
   *     tags: [Recetas]
   *     summary: Actualizar receta existente
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
   *             $ref: '#/components/schemas/CreateRecipe'
   *     responses:
   *       200:
   *         description: Receta actualizada
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Recipe'
   *       404:
   *         description: Receta no encontrada
   */
  @Put("/:id")
  async update(
    @Param("id") id: number,
    @Body() body: UpdateRecipeDto,
    @Req() req: AuthRequest,
  ) {
    const recipe = await recipeService.update(id, body, req.userId!);

    if (!recipe) {
      throw { httpCode: 404, message: "Receta no encontrada" };
    }

    return recipe;
  }

  /**
   * @swagger
   * /api/recipes/{id}:
   *   delete:
   *     tags: [Recetas]
   *     summary: Eliminar receta
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Receta eliminada
   *       404:
   *         description: Receta no encontrada
   */
  @Delete("/:id")
  @HttpCode(204)
  async delete(@Param("id") id: number, @Req() req: AuthRequest) {
    const deleted = await recipeService.delete(id, req.userId!);

    if (!deleted) {
      throw { httpCode: 404, message: "Receta no encontrada" };
    }

    return null;
  }
}
