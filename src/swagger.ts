import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3002;

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Recetas API",
      version: "1.0.0",
      description:
        "API para gestión de recetas, planificación de comidas y listas de compra",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Servidor de desarrollo",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Recipe: {
          type: "object",
          properties: {
            id: { type: "integer" },
            title: { type: "string" },
            description: { type: "string", nullable: true },
            instructions: { type: "string", nullable: true },
            servings: { type: "integer" },
            isPublic: { type: "boolean" },
            userId: { type: "integer" },
            totalCalories: { type: "number", nullable: true },
            caloriesPerServing: { type: "number", nullable: true },
            ingredients: {
              type: "array",
              items: { $ref: "#/components/schemas/IngredientWithQuantity" },
            },
          },
        },
        CreateRecipe: {
          type: "object",
          required: ["title", "ingredients"],
          properties: {
            title: { type: "string", example: "Tortilla Española" },
            description: { type: "string", example: "Receta tradicional" },
            instructions: { type: "string", example: "1. Pelar patatas..." },
            servings: { type: "integer", example: 4 },
            isPublic: { type: "boolean", example: false },
            ingredients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Patata" },
                  quantity: { type: "number", example: 500 },
                  unit: { type: "string", example: "g" },
                },
              },
            },
          },
        },
        Ingredient: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            unit: { type: "string", enum: ["g", "ml"] },
            calories: { type: "number", nullable: true },
            protein: { type: "number", nullable: true },
            carbs: { type: "number", nullable: true },
            fat: { type: "number", nullable: true },
            fiber: { type: "number", nullable: true },
            conversions: {
              type: "array",
              items: { $ref: "#/components/schemas/UnitConversion" },
            },
          },
        },
        CreateIngredient: {
          type: "object",
          required: ["name", "unit"],
          properties: {
            name: { type: "string", example: "Tomate" },
            unit: { type: "string", enum: ["g", "ml"], example: "g" },
            calories: { type: "number", example: 18 },
            protein: { type: "number", example: 0.9 },
            carbs: { type: "number", example: 3.9 },
            fat: { type: "number", example: 0.2 },
            fiber: { type: "number", example: 1.2 },
          },
        },
        IngredientWithQuantity: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            unit: { type: "string" },
            quantity: { type: "number" },
            calories: { type: "number", nullable: true },
          },
        },
        UnitConversion: {
          type: "object",
          properties: {
            id: { type: "integer" },
            unitName: { type: "string" },
            gramsPerUnit: { type: "number" },
            ingredientId: { type: "integer" },
          },
        },
        CreateUnitConversion: {
          type: "object",
          required: ["unitName", "gramsPerUnit"],
          properties: {
            unitName: { type: "string", example: "diente" },
            gramsPerUnit: { type: "number", example: 5 },
          },
        },
        Dish: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            servings: { type: "integer" },
            isPublic: { type: "boolean" },
            totalCalories: { type: "number", nullable: true },
            caloriesPerServing: { type: "number", nullable: true },
            slots: {
              type: "array",
              items: { $ref: "#/components/schemas/DishSlot" },
            },
          },
        },
        DishSlot: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            sortOrder: { type: "integer" },
            options: {
              type: "array",
              items: { $ref: "#/components/schemas/DishSlotOption" },
            },
          },
        },
        DishSlotOption: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            isDefault: { type: "boolean" },
            recipeId: { type: "integer", nullable: true },
            recipeServings: { type: "number", nullable: true },
            ingredientId: { type: "integer", nullable: true },
            quantity: { type: "number", nullable: true },
            unit: { type: "string", nullable: true },
          },
        },
        WeekPlan: {
          type: "object",
          properties: {
            id: { type: "integer" },
            plannedDate: { type: "string", format: "date-time" },
            servings: { type: "integer" },
            recipeId: { type: "integer", nullable: true },
            dishId: { type: "integer", nullable: true },
            recipe: { $ref: "#/components/schemas/Recipe" },
            dish: { $ref: "#/components/schemas/Dish" },
          },
        },
        CreateWeekPlan: {
          type: "object",
          required: ["plannedDate"],
          properties: {
            recipeId: { type: "integer", example: 1 },
            dishId: { type: "integer", example: 1 },
            plannedDate: {
              type: "string",
              format: "date",
              example: "2026-03-20",
            },
            servings: { type: "integer", example: 4 },
            selections: {
              type: "array",
              items: { type: "integer" },
            },
          },
        },
        ShoppingItem: {
          type: "object",
          properties: {
            ingredientId: { type: "integer" },
            name: { type: "string" },
            unit: { type: "string" },
            totalQuantity: { type: "number" },
          },
        },
        DailyNutrition: {
          type: "object",
          properties: {
            calories: { type: "number" },
            protein: { type: "number" },
            carbs: { type: "number" },
            fat: { type: "number" },
            fiber: { type: "number" },
          },
        },
        HomeItem: {
          type: "object",
          properties: {
            id: { type: "integer" },
            location: {
              type: "string",
              enum: ["nevera", "congelador", "despensa"],
            },
            quantity: { type: "number" },
            unit: { type: "string" },
            addedAt: { type: "string", format: "date-time" },
            expiresAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/controllers/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Recetas API - Documentación",
    }),
  );

  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}
