import { JsonController, Get, Post, Put, Delete, Param, Body, QueryParam, Req, UseBefore, HttpCode } from 'routing-controllers';
import { shoppingService } from '../services';
import { authMiddleware, AuthRequest } from '../middlewares';

@JsonController('')
@UseBefore(authMiddleware)
export class ShoppingController {
  @Get('/week-plan')
  async getWeekPlan(
    @QueryParam('startDate') startDate: string,
    @QueryParam('endDate') endDate: string,
    @Req() req: AuthRequest
  ) {
    if (!startDate || !endDate) {
      throw { httpCode: 400, message: 'startDate y endDate son requeridos' };
    }

    return shoppingService.getWeekPlan(
      req.userId!,
      new Date(startDate),
      new Date(endDate)
    );
  }

  @Post('/week-plan')
  @HttpCode(201)
  async addToWeekPlan(
    @Body() body: { recipeId?: number; plannedDate: string; servings?: number; type?: string; selections?: number[] },
    @Req() req: AuthRequest
  ) {
    const { recipeId, plannedDate, servings, type, selections } = body;

    if (!recipeId || !plannedDate) {
      throw { httpCode: 400, message: 'recipeId y plannedDate son requeridos' };
    }

    return shoppingService.addToWeekPlan(
      { recipeId, plannedDate, servings, type: (type as 'meal' | 'prep') || 'meal', selections },
      req.userId!
    );
  }

  @Put('/week-plan/:id')
  async updatePlanDate(
    @Param('id') id: number,
    @Body() body: { plannedDate: string },
    @Req() req: AuthRequest
  ) {
    const { plannedDate } = body;

    if (!plannedDate) {
      throw { httpCode: 400, message: 'plannedDate es requerido' };
    }

    const plan = await shoppingService.updatePlanDate(id, new Date(plannedDate), req.userId!);

    if (!plan) {
      throw { httpCode: 404, message: 'Plan no encontrado' };
    }

    return plan;
  }

  @Delete('/week-plan/:id')
  @HttpCode(204)
  async removeFromWeekPlan(@Param('id') id: number, @Req() req: AuthRequest) {
    const removed = await shoppingService.removeFromWeekPlan(id, req.userId!);

    if (!removed) {
      throw { httpCode: 404, message: 'Plan no encontrado' };
    }

    return null;
  }

  @Post('/week-plan/:id/cook')
  async markAsCooked(
    @Param('id') id: number,
    @Body() body: { leftoverServings?: number; leftoverLocation?: string },
    @Req() req: AuthRequest
  ) {
    const leftoverServings = body.leftoverServings || 0;
    const leftoverLocation = body.leftoverLocation || 'nevera';

    return shoppingService.markAsCooked(id, req.userId!, leftoverServings, leftoverLocation);
  }

  @Post('/week-plan/:id/consume')
  async markAsConsumed(
    @Param('id') id: number,
    @Req() req: AuthRequest
  ) {
    return shoppingService.markAsConsumed(id, req.userId!);
  }

  @Get('/shopping-list')
  async getShoppingList(
    @QueryParam('startDate') startDate: string,
    @QueryParam('endDate') endDate: string,
    @Req() req: AuthRequest
  ) {
    if (!startDate || !endDate) {
      throw { httpCode: 400, message: 'startDate y endDate son requeridos' };
    }

    return shoppingService.generateShoppingList(
      req.userId!,
      new Date(startDate),
      new Date(endDate)
    );
  }
}
