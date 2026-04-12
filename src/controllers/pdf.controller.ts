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
      lang?: string;
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
        lang: body.lang,
        importPayload: pdfService.buildImportPayload([
          { recipe, selectedOptions },
        ]),
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

  @Post("/recipes/combined")
  async exportCombinedPdf(
    @Body()
    body: {
      entries: { recipeId: number; selectedOptions?: Record<string, number> }[];
      showAuthor?: boolean;
      showVisibility?: boolean;
      lang?: string;
    },
    @Req() req: AuthRequest,
    @Res() res: Response,
  ) {
    try {
      if (!body.entries || body.entries.length === 0) {
        throw { httpCode: 400, message: "No hay recetas para exportar" };
      }

      const resolvedEntries: {
        recipe: any;
        selectedOptions: Record<number, number>;
      }[] = [];
      let combinedTitle = "recetas";

      for (const entry of body.entries) {
        const recipe = await pdfService.getRecipeDataForPdf(
          entry.recipeId,
          req.userId!,
        );
        const selectedOptions: Record<number, number> = {};
        if (entry.selectedOptions) {
          for (const [k, v] of Object.entries(entry.selectedOptions)) {
            selectedOptions[parseInt(k)] = v;
          }
        }
        resolvedEntries.push({ recipe, selectedOptions });
        if (resolvedEntries.length === 1) combinedTitle = recipe.title;
      }

      const pdfBuffer = await pdfService.generateCombinedPdfBuffer(
        resolvedEntries,
        {
          showAuthor: body.showAuthor ?? false,
          showVisibility: body.showVisibility ?? false,
          lang: body.lang,
          importPayload: pdfService.buildImportPayload(resolvedEntries),
        },
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${combinedTitle}.pdf"`,
      );
      res.send(pdfBuffer);
      return res;
    } catch (e: any) {
      throw { httpCode: e.httpCode ?? 500, message: e.message };
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

  @Post("/recipe/import-pdf")
  @HttpCode(201)
  async importRecipePdf(
    @Body() body: { fileBase64: string; filename?: string },
    @Req() req: AuthRequest,
  ) {
    if (!body.fileBase64) {
      throw { httpCode: 400, message: "PDF requerido" };
    }

    try {
      const pdfBuffer = Buffer.from(body.fileBase64, "base64");
      const payload = pdfService.parseImportedPdfBuffer(pdfBuffer);

      const byTitle = new Map<string, number>();
      const created: string[] = [];
      const skipped: { title: string; id: number }[] = [];

      // Pass 1: create missing recipes without linked components first
      for (const r of payload.recipes) {
        const title = (r.title || "").trim();
        if (!title) continue;

        const existing = await prisma.recipe.findFirst({
          where: { title, userId: req.userId! },
          select: { id: true },
        });
        if (existing) {
          byTitle.set(title, existing.id);
          skipped.push({ title, id: existing.id });
          continue;
        }

        const ingredientRows: {
          ingredientId: number;
          quantity: number;
          unit: string;
        }[] = [];

        for (const ing of r.ingredients || []) {
          const name = (ing.name || "").trim();
          if (!name) continue;
          let dbIng = await prisma.ingredient.findUnique({ where: { name } });
          if (!dbIng) {
            dbIng = await prisma.ingredient.create({
              data: { name, unit: ing.unit || "g" },
            });
          }
          ingredientRows.push({
            ingredientId: dbIng.id,
            quantity: Number(ing.quantity) || 0,
            unit: ing.unit || dbIng.unit || "g",
          });
        }

        const createdRecipe = await prisma.recipe.create({
          data: {
            title,
            description: r.description || null,
            instructions: r.instructions || null,
            imageUrl: r.imageUrl || null,
            servings: Number(r.servings) || 4,
            cookTimeMinutes: r.cookTimeMinutes ?? null,
            difficulty: r.difficulty ?? null,
            userId: req.userId!,
            ingredients:
              ingredientRows.length > 0
                ? {
                    create: ingredientRows.map((x) => ({
                      ingredientId: x.ingredientId,
                      quantity: x.quantity,
                      unit: x.unit,
                    })),
                  }
                : undefined,
          },
          select: { id: true },
        });

        byTitle.set(title, createdRecipe.id);
        created.push(title);
      }

      // Pass 2: validate and wire nested recipe requirements
      for (const r of payload.recipes) {
        const title = (r.title || "").trim();
        const recipeId = byTitle.get(title);
        if (!title || !recipeId) continue;

        const targetRecipeWasCreated = created.includes(title);
        if (!targetRecipeWasCreated) continue;

        const required = r.requiredRecipes || [];
        let sortOrder = 0;
        for (const reqRecipe of required) {
          const reqTitle = (reqRecipe.title || "").trim();
          if (!reqTitle) continue;

          let linkedId = byTitle.get(reqTitle);
          if (!linkedId) {
            // Try by id first (works across users for public recipes)
            if (reqRecipe.id) {
              const byId = await prisma.recipe.findFirst({
                where: {
                  id: reqRecipe.id,
                  OR: [{ userId: req.userId! }, { isPublic: true }],
                },
                select: { id: true },
              });
              if (byId) linkedId = byId.id;
            }
          }
          if (!linkedId) {
            // Fallback: search by title in own recipes or public ones
            const existingLinked = await prisma.recipe.findFirst({
              where: {
                title: reqTitle,
                OR: [{ userId: req.userId! }, { isPublic: true }],
              },
              select: { id: true },
            });
            if (existingLinked) {
              linkedId = existingLinked.id;
              byTitle.set(reqTitle, linkedId);
            }
          }

          if (!linkedId) {
            throw {
              httpCode: 400,
              message: `Falta la receta anidada "${reqTitle}". Importa primero el PDF que contiene esa receta.`,
            };
          }

          await prisma.recipeComponent.create({
            data: {
              name: reqTitle,
              sortOrder,
              isOptional: false,
              defaultEnabled: true,
              recipeId,
              options: {
                create: [
                  {
                    name: reqTitle,
                    isDefault: true,
                    recipeId: linkedId,
                    recipeServings: Number(reqRecipe.servings) || 1,
                  },
                ],
              },
            },
          });
          sortOrder += 1;
        }
      }

      return {
        created,
        skipped,
        importedCount: created.length,
        skippedCount: skipped.length,
      };
    } catch (e: any) {
      throw { httpCode: e.httpCode ?? 400, message: e.message };
    }
  }
}
