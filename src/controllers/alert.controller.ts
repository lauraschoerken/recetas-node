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
import { alertService } from "../services";
import { authMiddleware, AuthRequest } from "../middlewares";

@JsonController("/alerts")
@UseBefore(authMiddleware)
export class AlertController {
  @Get("/")
  async getAlerts(
    @QueryParam("includeResolved") includeResolved: boolean,
    @Req() req: AuthRequest,
  ) {
    return alertService.getAlerts(req.userId!, includeResolved);
  }

  @Get("/count")
  async getUnreadCount(@Req() req: AuthRequest) {
    const count = await alertService.getUnreadCount(req.userId!);
    return { count };
  }

  @Put("/:id")
  async updateAlert(
    @Param("id") id: number,
    @Body() body: any,
    @Req() req: AuthRequest,
  ) {
    if (!body.status) throw { httpCode: 400, message: "Status es requerido" };
    try {
      return await alertService.updateAlert(id, body, req.userId!);
    } catch (e: any) {
      throw { httpCode: 404, message: e.message };
    }
  }

  // ── Ingredient thresholds ──

  @Get("/thresholds/ingredients")
  async getIngredientThresholds(@Req() req: AuthRequest) {
    return alertService.getIngredientThresholds(req.userId!);
  }

  @Post("/thresholds/ingredients")
  @HttpCode(201)
  async setIngredientThreshold(
    @Body() body: { ingredientId: number; minQuantity: number; unit: string },
    @Req() req: AuthRequest,
  ) {
    if (!body.ingredientId || body.minQuantity === undefined || !body.unit) {
      throw {
        httpCode: 400,
        message: "ingredientId, minQuantity y unit son requeridos",
      };
    }
    return alertService.setIngredientThreshold(body, req.userId!);
  }

  @Delete("/thresholds/ingredients/:ingredientId")
  @HttpCode(204)
  async deleteIngredientThreshold(
    @Param("ingredientId") ingredientId: number,
    @Req() req: AuthRequest,
  ) {
    await alertService.deleteIngredientThreshold(ingredientId, req.userId!);
    return null;
  }

  // ── Recipe thresholds ──

  @Get("/thresholds/recipes")
  async getRecipeThresholds(@Req() req: AuthRequest) {
    return alertService.getRecipeThresholds(req.userId!);
  }

  @Post("/thresholds/recipes")
  @HttpCode(201)
  async setRecipeThreshold(
    @Body() body: { recipeId: number; minServings: number },
    @Req() req: AuthRequest,
  ) {
    if (!body.recipeId || body.minServings === undefined) {
      throw { httpCode: 400, message: "recipeId y minServings son requeridos" };
    }
    return alertService.setRecipeThreshold(body, req.userId!);
  }

  @Delete("/thresholds/recipes/:recipeId")
  @HttpCode(204)
  async deleteRecipeThreshold(
    @Param("recipeId") recipeId: number,
    @Req() req: AuthRequest,
  ) {
    await alertService.deleteRecipeThreshold(recipeId, req.userId!);
    return null;
  }
}
