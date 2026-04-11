import {
  JsonController,
  Get,
  Post,
  Param,
  Body,
  Req,
  Res,
  UseBefore,
  HttpCode,
} from "routing-controllers";
import { Response } from "express";
import { pdfService } from "../services";
import { authMiddleware, AuthRequest } from "../middlewares";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

@JsonController("/pdf")
@UseBefore(authMiddleware)
export class PdfController {
  @Get("/recipe/:id")
  async exportRecipe(@Param("id") id: number, @Req() req: AuthRequest) {
    try {
      const recipe = await pdfService.getRecipeDataForPdf(id, req.userId!);
      const html = pdfService.generatePdfHtml(recipe);
      return { html, recipe: { id: recipe.id, title: recipe.title } };
    } catch (e: any) {
      throw { httpCode: 404, message: e.message };
    }
  }

  @Get("/recipe/:id/data")
  async getRecipeData(@Param("id") id: number, @Req() req: AuthRequest) {
    try {
      const recipe = await pdfService.getRecipeDataForPdf(id, req.userId!);
      return recipe;
    } catch (e: any) {
      throw { httpCode: 404, message: e.message };
    }
  }

  @Post("/recipe/:id/pdf")
  async exportRecipePdf(
    @Param("id") id: number,
    @Body()
    body: {
      selectedOptions?: Record<string, number>;
      showAuthor?: boolean;
      showVisibility?: boolean;
    },
    @Req() req: AuthRequest,
    @Res() res: Response,
  ) {
    try {
      const recipe = await pdfService.getRecipeDataForPdf(id, req.userId!);

      // Convert string keys to number keys
      const selectedOptions: Record<number, number> = {};
      if (body.selectedOptions) {
        for (const [k, v] of Object.entries(body.selectedOptions)) {
          selectedOptions[parseInt(k)] = v;
        }
      }

      const pdfBuffer = await pdfService.generatePdfBuffer(recipe, {
        selectedOptions,
        showAuthor: body.showAuthor ?? false,
        showVisibility: body.showVisibility ?? false,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${recipe.title}.pdf"`,
      );
      res.send(pdfBuffer);
      return res;
    } catch (e: any) {
      throw { httpCode: 404, message: e.message };
    }
  }

  @Post("/recipe/import")
  @HttpCode(201)
  async importRecipe(@Body() body: { html: string }, @Req() req: AuthRequest) {
    if (!body.html) throw { httpCode: 400, message: "HTML es requerido" };

    try {
      const parsed = pdfService.parseImportedPdfHtml(body.html);

      const ingredientConnects = [];
      for (const ing of parsed.ingredients) {
        let ingredient = await prisma.ingredient.findUnique({
          where: { name: ing.name },
        });
        if (!ingredient) {
          ingredient = await prisma.ingredient.create({
            data: { name: ing.name, unit: ing.unit || "g" },
          });
        }
        ingredientConnects.push({
          quantity: ing.quantity,
          unit: ing.unit,
          ingredientId: ingredient.id,
        });
      }

      const recipe = await prisma.recipe.create({
        data: {
          title: parsed.title,
          description: parsed.description,
          instructions: parsed.instructions,
          servings: parsed.servings,
          userId: req.userId!,
          ingredients: { create: ingredientConnects },
        },
        include: { ingredients: { include: { ingredient: true } } },
      });

      return recipe;
    } catch (e: any) {
      throw { httpCode: 400, message: e.message };
    }
  }
}
