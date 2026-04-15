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
   *     summary: Listar todas las recetas del usuario
   *     description: Devuelve las recetas propias más las recetas públicas de otros usuarios
   *     responses:
   *       200:
   *         description: Lista de recetas
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Recipe'
   */
  @Get("/")
  async getAll(@Req() req: AuthRequest) {
    return recipeService.getAll(req.userId!);
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
