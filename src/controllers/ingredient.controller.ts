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
import { ingredientService } from "../services";
import { authMiddleware, AuthRequest } from "../middlewares";

@JsonController("/ingredients")
@UseBefore(authMiddleware)
export class IngredientController {
  /**
   * @swagger
   * /api/ingredients:
   *   get:
   *     tags: [Ingredientes]
   *     summary: Listar todos los ingredientes
   *     responses:
   *       200:
   *         description: Lista de ingredientes
   */
  @Get("/")
  async getAll() {
    return ingredientService.getAll();
  }

  /**
   * @swagger
   * /api/ingredients/search:
   *   get:
   *     tags: [Ingredientes]
   *     summary: Buscar ingredientes por nombre
   */
  @Get("/search")
  async search(@QueryParam("q") query: string) {
    if (!query) {
      throw { httpCode: 400, message: "Parámetro de búsqueda requerido" };
    }
    return ingredientService.search(query);
  }

  /**
   * @swagger
   * /api/ingredients/nutrition:
   *   get:
   *     tags: [Ingredientes]
   *     summary: Obtener nutrición diaria
   */
  @Get("/nutrition")
  async getDailyNutrition(
    @QueryParam("date") dateStr: string,
    @Req() req: AuthRequest,
  ) {
    const date = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
    return ingredientService.getDailyNutrition(req.userId!, date);
  }

  /**
   * @swagger
   * /api/ingredients/{id}:
   *   get:
   *     tags: [Ingredientes]
   *     summary: Obtener ingrediente por ID
   */
  @Get("/:id")
  async getById(@Param("id") id: number) {
    const ingredient = await ingredientService.getById(id);
    if (!ingredient) {
      throw { httpCode: 404, message: "Ingrediente no encontrado" };
    }
    return ingredient;
  }

  /**
   * @swagger
   * /api/ingredients:
   *   post:
   *     tags: [Ingredientes]
   *     summary: Crear nuevo ingrediente
   */
  @Post("/")
  @HttpCode(201)
  async create(
    @Body()
    body: {
      name: string;
      unit?: string;
      imageUrl?: string;
      defaultLocation?: string;
      variants?: Array<{
        name: string;
        isDefault?: boolean;
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        fiber?: number;
      }>;
      // Legacy fields for backward compatibility
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
    },
  ) {
    const {
      name,
      unit,
      imageUrl,
      defaultLocation,
      variants,
      calories,
      protein,
      carbs,
      fat,
      fiber,
    } = body;

    if (!name) {
      throw { httpCode: 400, message: "Nombre es requerido" };
    }

    if (unit && unit !== "g" && unit !== "ml") {
      throw { httpCode: 400, message: 'La unidad debe ser "g" o "ml"' };
    }

    // Si se pasan macros directamente (legacy), convertirlos a variante
    let finalVariants = variants;
    if (!variants && (calories || protein || carbs || fat || fiber)) {
      finalVariants = [
        {
          name: "Crudo",
          isDefault: true,
          calories,
          protein,
          carbs,
          fat,
          fiber,
        },
      ];
    }

    return ingredientService.create({
      name,
      unit: (unit as "g" | "ml") || "g",
      imageUrl,
      defaultLocation,
      variants: finalVariants,
    });
  }

  /**
   * @swagger
   * /api/ingredients/bulk:
   *   post:
   *     tags: [Ingredientes]
   *     summary: Crear múltiples ingredientes
   */
  @Post("/bulk")
  @HttpCode(201)
  async createBulk(
    @Body() body: { ingredients: Array<{ name: string; unit?: string }> },
  ) {
    const { ingredients } = body;

    if (
      !ingredients ||
      !Array.isArray(ingredients) ||
      ingredients.length === 0
    ) {
      throw { httpCode: 400, message: "Se requiere un array de ingredientes" };
    }

    const validIngredients = ingredients
      .filter((ing) => ing.name && ing.name.trim())
      .map((ing) => ({
        name: ing.name,
        unit: (ing.unit === "ml" ? "ml" : "g") as "g" | "ml",
      }));

    if (validIngredients.length === 0) {
      throw {
        httpCode: 400,
        message: "No hay ingredientes válidos para crear",
      };
    }

    return ingredientService.createBulk(validIngredients);
  }

  /**
   * @swagger
   * /api/ingredients/{id}:
   *   put:
   *     tags: [Ingredientes]
   *     summary: Actualizar ingrediente
   */
  @Put("/:id")
  async update(
    @Param("id") id: number,
    @Body()
    body: {
      name?: string;
      imageUrl?: string | null;
      preferredUnit?: string | null;
      defaultLocation?: string | null;
    },
  ) {
    const { name, imageUrl, preferredUnit, defaultLocation } = body;

    const ingredient = await ingredientService.update(id, {
      name,
      imageUrl,
      preferredUnit,
      defaultLocation,
    });

    if (!ingredient) {
      throw { httpCode: 404, message: "Ingrediente no encontrado" };
    }

    return ingredient;
  }

  /**
   * @swagger
   * /api/ingredients/{id}:
   *   delete:
   *     tags: [Ingredientes]
   *     summary: Eliminar ingrediente
   */
  @Delete("/:id")
  @HttpCode(204)
  async delete(@Param("id") id: number) {
    const deleted = await ingredientService.delete(id);
    if (!deleted) {
      throw { httpCode: 404, message: "Ingrediente no encontrado" };
    }
    return null;
  }

  // ===================== VARIANTS =====================

  /**
   * @swagger
   * /api/ingredients/{id}/variants:
   *   get:
   *     tags: [Variantes]
   *     summary: Listar variantes de un ingrediente
   */
  @Get("/:id/variants")
  async getVariants(@Param("id") ingredientId: number) {
    return ingredientService.getVariants(ingredientId);
  }

  /**
   * @swagger
   * /api/ingredients/{id}/variants:
   *   post:
   *     tags: [Variantes]
   *     summary: Añadir variante a un ingrediente
   */
  @Post("/:id/variants")
  @HttpCode(201)
  async addVariant(
    @Param("id") ingredientId: number,
    @Body()
    body: {
      name: string;
      isDefault?: boolean;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
      weightFactor?: number;
    },
  ) {
    const {
      name,
      isDefault,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      weightFactor,
    } = body;

    if (!name) {
      throw { httpCode: 400, message: "El nombre de la variante es requerido" };
    }

    const ingredient = await ingredientService.getById(ingredientId);
    if (!ingredient) {
      throw { httpCode: 404, message: "Ingrediente no encontrado" };
    }

    return ingredientService.addVariant(ingredientId, {
      name,
      isDefault,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      weightFactor,
    });
  }

  /**
   * @swagger
   * /api/ingredients/variants/{variantId}:
   *   put:
   *     tags: [Variantes]
   *     summary: Actualizar variante
   */
  @Put("/variants/:variantId")
  async updateVariant(
    @Param("variantId") variantId: number,
    @Body()
    body: {
      name?: string;
      isDefault?: boolean;
      calories?: number | null;
      protein?: number | null;
      carbs?: number | null;
      fat?: number | null;
      fiber?: number | null;
      weightFactor?: number;
    },
  ) {
    const variant = await ingredientService.updateVariant(variantId, body);

    if (!variant) {
      throw { httpCode: 404, message: "Variante no encontrada" };
    }

    return variant;
  }

  /**
   * @swagger
   * /api/ingredients/variants/{variantId}:
   *   delete:
   *     tags: [Variantes]
   *     summary: Eliminar variante
   */
  @Delete("/variants/:variantId")
  @HttpCode(204)
  async deleteVariant(@Param("variantId") variantId: number) {
    const deleted = await ingredientService.deleteVariant(variantId);

    if (!deleted) {
      throw {
        httpCode: 400,
        message: "No se puede eliminar la variante (es la única o no existe)",
      };
    }

    return null;
  }

  // ===================== CONVERSIONS =====================

  /**
   * @swagger
   * /api/ingredients/{id}/conversions:
   *   get:
   *     tags: [Conversiones]
   *     summary: Listar conversiones de un ingrediente
   */
  @Get("/:id/conversions")
  async getConversions(@Param("id") ingredientId: number) {
    return ingredientService.getConversions(ingredientId);
  }

  /**
   * @swagger
   * /api/ingredients/{id}/conversions:
   *   post:
   *     tags: [Conversiones]
   *     summary: Añadir conversión de unidad a un ingrediente
   */
  @Post("/:id/conversions")
  @HttpCode(201)
  async addConversion(
    @Param("id") ingredientId: number,
    @Body() body: { unitName: string; gramsPerUnit: number },
  ) {
    const { unitName, gramsPerUnit } = body;

    if (!unitName || gramsPerUnit === undefined) {
      throw {
        httpCode: 400,
        message: "unitName y gramsPerUnit son requeridos",
      };
    }

    if (typeof gramsPerUnit !== "number" || gramsPerUnit <= 0) {
      throw {
        httpCode: 400,
        message: "gramsPerUnit debe ser un número positivo",
      };
    }

    const ingredient = await ingredientService.getById(ingredientId);
    if (!ingredient) {
      throw { httpCode: 404, message: "Ingrediente no encontrado" };
    }

    return ingredientService.addConversion(ingredientId, {
      unitName,
      gramsPerUnit,
    });
  }

  /**
   * @swagger
   * /api/ingredients/conversions/{conversionId}:
   *   put:
   *     tags: [Conversiones]
   *     summary: Actualizar conversión de unidad
   */
  @Put("/conversions/:conversionId")
  async updateConversion(
    @Param("conversionId") conversionId: number,
    @Body() body: { gramsPerUnit: number },
  ) {
    const { gramsPerUnit } = body;

    if (typeof gramsPerUnit !== "number" || gramsPerUnit <= 0) {
      throw {
        httpCode: 400,
        message: "gramsPerUnit debe ser un número positivo",
      };
    }

    const conversion = await ingredientService.updateConversion(
      conversionId,
      gramsPerUnit,
    );

    if (!conversion) {
      throw { httpCode: 404, message: "Conversión no encontrada" };
    }

    return conversion;
  }

  /**
   * @swagger
   * /api/ingredients/conversions/{conversionId}:
   *   delete:
   *     tags: [Conversiones]
   *     summary: Eliminar conversión de unidad
   */
  @Delete("/conversions/:conversionId")
  @HttpCode(204)
  async deleteConversion(@Param("conversionId") conversionId: number) {
    const deleted = await ingredientService.deleteConversion(conversionId);

    if (!deleted) {
      throw { httpCode: 404, message: "Conversión no encontrada" };
    }

    return null;
  }
}
