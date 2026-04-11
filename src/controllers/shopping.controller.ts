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
import { shoppingService, homeItemService } from "../services";
import { authMiddleware, AuthRequest } from "../middlewares";

@JsonController("")
@UseBefore(authMiddleware)
export class ShoppingController {
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

  @Delete("/week-plan/:id")
  @HttpCode(204)
  async removeFromWeekPlan(@Param("id") id: number, @Req() req: AuthRequest) {
    const removed = await shoppingService.removeFromWeekPlan(id, req.userId!);

    if (!removed) {
      throw { httpCode: 404, message: "Plan no encontrado" };
    }

    return null;
  }

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

  @Post("/week-plan/:id/consume")
  async markAsConsumed(@Param("id") id: number, @Req() req: AuthRequest) {
    return shoppingService.markAsConsumed(id, req.userId!);
  }

  @Get("/shopping-list")
  async getShoppingList(
    @QueryParam("startDate") startDate: string,
    @QueryParam("endDate") endDate: string,
    @Req() req: AuthRequest,
  ) {
    if (!startDate || !endDate) {
      throw { httpCode: 400, message: "startDate y endDate son requeridos" };
    }

    return shoppingService.generateShoppingList(
      req.userId!,
      new Date(startDate),
      new Date(endDate),
    );
  }

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
}
