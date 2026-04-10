import { JsonController, Get, Post, Put, Delete, Param, Body, Req, UseBefore, HttpCode } from 'routing-controllers';
import { recipeService } from '../services';
import { authMiddleware, AuthRequest } from '../middlewares';
import { CreateRecipeDto, UpdateRecipeDto } from '../domain';

@JsonController('/recipes')
@UseBefore(authMiddleware)
export class RecipeController {
  @Get('/')
  async getAll(@Req() req: AuthRequest) {
    return recipeService.getAll(req.userId!);
  }

  @Get('/:id')
  async getById(@Param('id') id: number, @Req() req: AuthRequest) {
    const recipe = await recipeService.getById(id, req.userId!);

    if (!recipe) {
      throw { httpCode: 404, message: 'Receta no encontrada' };
    }

    return recipe;
  }

  @Post('/')
  @HttpCode(201)
  async create(
    @Body() body: CreateRecipeDto,
    @Req() req: AuthRequest
  ) {
    const { title, ingredients, components } = body;

    if (!title) {
      throw { httpCode: 400, message: 'Título es requerido' };
    }

    if ((!ingredients || ingredients.length === 0) && (!components || components.length === 0)) {
      throw { httpCode: 400, message: 'Debe tener ingredientes o componentes' };
    }

    return recipeService.create(body, req.userId!);
  }

  @Put('/:id')
  async update(
    @Param('id') id: number,
    @Body() body: UpdateRecipeDto,
    @Req() req: AuthRequest
  ) {
    const recipe = await recipeService.update(id, body, req.userId!);

    if (!recipe) {
      throw { httpCode: 404, message: 'Receta no encontrada' };
    }

    return recipe;
  }

  @Delete('/:id')
  @HttpCode(204)
  async delete(@Param('id') id: number, @Req() req: AuthRequest) {
    const deleted = await recipeService.delete(id, req.userId!);

    if (!deleted) {
      throw { httpCode: 404, message: 'Receta no encontrada' };
    }

    return null;
  }
}
