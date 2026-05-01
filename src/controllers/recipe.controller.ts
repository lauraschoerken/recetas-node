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
    @QueryParam("difficulty") difficulty?: string,
    @QueryParam("minCookTime") minCookTime?: number,
    @QueryParam("maxCookTime") maxCookTime?: number,
    @QueryParam("tagIds") tagIds?: string,
    @QueryParam("excludeTagIds") excludeTagIds?: string,
    @QueryParam("sortBy") sortBy?: string,
    @QueryParam("sortOrder") sortOrder?: string,
    @QueryParam("author") author?: number,
  ) {
    const parsedTagIds = tagIds
      ? tagIds
          .split(",")
          .map(Number)
          .filter((n) => !isNaN(n) && n > 0)
      : [];
    const parsedExcludeTagIds = excludeTagIds
      ? excludeTagIds
          .split(",")
          .map(Number)
          .filter((n) => !isNaN(n) && n > 0)
      : [];
    return recipeService.getAll(req.userId!, {
      page,
      pageSize,
      search,
      visibility,
      ingredient,
      difficulty,
      minCookTime,
      maxCookTime,
      tagIds: parsedTagIds,
      excludeTagIds: parsedExcludeTagIds,
      sortBy,
      sortOrder,
      authorId: author,
    });
  }

  /**
   * @swagger
   * /api/recipes/authors:
   *   get:
   *     tags: [Recetas]
   *     summary: Obtener autores con recetas visibles
   *     responses:
   *       200:
   *         description: Lista de autores
   */
  @Get("/authors")
  async getAuthors(@Req() req: AuthRequest) {
    return recipeService.getAuthors(req.userId!);
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

  /**
   * @swagger
   * /api/recipes/export/csv:
   *   get:
   *     tags: [Recetas]
   *     summary: Exportar varias recetas como CSV
   *     parameters:
   *       - in: query
   *         name: ids
   *         required: true
   *         schema:
   *           type: string
   *         description: IDs separados por coma
   *     responses:
   *       200:
   *         description: Archivo CSV
   *         content:
   *           text/csv:
   *             schema:
   *               type: string
   *       400:
   *         description: ids requerido
   */
  @Get("/export/csv")
  async exportCsv(
    @QueryParam("ids") ids: string,
    @Req() req: AuthRequest,
    @Res() res: Response,
  ) {
    if (!ids) throw { httpCode: 400, message: "ids es requerido" };
    const idList = ids
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0);
    const csv = await recipeService.exportCsv(idList, req.userId!);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="recetas.csv"');
    res.send(csv);
    return res;
  }

  /**
   * @swagger
   * /api/recipes/import/csv:
   *   post:
   *     tags: [Recetas]
   *     summary: Importar recetas desde CSV
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [csv]
   *             properties:
   *               csv:
   *                 type: string
   *     responses:
   *       200:
   *         description: Resultado de la importación
   */
  @Post("/import/csv")
  async importCsv(@Body() body: { csv: string }, @Req() req: AuthRequest) {
    if (!body.csv) throw { httpCode: 400, message: "csv es requerido" };
    return recipeService.importFromCsv(body.csv, req.userId!);
  }
}
