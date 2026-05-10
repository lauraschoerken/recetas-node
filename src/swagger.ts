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
        url: "/",
        description: "Servidor actual",
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
        Household: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            joinCode: { type: "string", nullable: true },
            shareHome: { type: "boolean" },
            shareShopping: { type: "boolean" },
            shareAlerts: { type: "boolean" },
            myRole: { type: "string", enum: ["ADMIN", "MEMBER"] },
            members: {
              type: "array",
              items: { $ref: "#/components/schemas/HouseholdMember" },
            },
            invites: {
              type: "array",
              items: { $ref: "#/components/schemas/HouseholdInvite" },
            },
          },
        },
        HouseholdMember: {
          type: "object",
          properties: {
            id: { type: "integer" },
            role: { type: "string", enum: ["ADMIN", "MEMBER"] },
            joinedAt: { type: "string", format: "date-time" },
            userId: { type: "integer" },
            householdId: { type: "integer" },
            user: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
                email: { type: "string", format: "email" },
                imageUrl: { type: "string", nullable: true },
              },
            },
          },
        },
        HouseholdInvite: {
          type: "object",
          properties: {
            id: { type: "integer" },
            email: { type: "string", format: "email" },
            token: { type: "string" },
            expiresAt: { type: "string", format: "date-time" },
            accepted: { type: "boolean" },
          },
        },
        Alert: {
          type: "object",
          properties: {
            id: { type: "integer" },
            type: {
              type: "string",
              enum: ["low_stock_ingredient", "low_stock_recipe"],
            },
            status: {
              type: "string",
              enum: ["unread", "read", "resolved", "dismissed"],
            },
            message: { type: "string" },
            ingredientId: { type: "integer", nullable: true },
            recipeId: { type: "integer", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        IngredientThreshold: {
          type: "object",
          properties: {
            id: { type: "integer" },
            ingredientId: { type: "integer" },
            minQuantity: { type: "number" },
            unit: { type: "string" },
            ingredient: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
              },
            },
          },
        },
        RecipeThreshold: {
          type: "object",
          properties: {
            id: { type: "integer" },
            recipeId: { type: "integer" },
            minServings: { type: "number" },
            recipe: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "integer" },
                title: { type: "string" },
              },
            },
          },
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            imageUrl: { type: "string", nullable: true },
            status: { type: "string", enum: ["GLOBAL", "PRIVATE"] },
            createdByUserId: { type: "integer", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        CreateProduct: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", example: "Leche entera" },
            imageUrl: { type: "string", nullable: true },
            isGlobal: { type: "boolean", example: false },
          },
        },
        UpdateProduct: {
          type: "object",
          properties: {
            name: { type: "string" },
            imageUrl: { type: "string", nullable: true },
          },
        },
        ProductThreshold: {
          type: "object",
          properties: {
            id: { type: "integer" },
            productId: { type: "integer" },
            minQuantity: { type: "number" },
            unit: { type: "string" },
            userId: { type: "integer", nullable: true },
            householdId: { type: "integer", nullable: true },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Autenticación y gestión de cuenta" },
      { name: "Recetas", description: "CRUD de recetas" },
      { name: "Ingredientes", description: "CRUD de ingredientes" },
      { name: "Variantes", description: "Estados de cocción de ingredientes" },
      { name: "Conversiones", description: "Conversiones de unidades" },
      { name: "Almacenamiento", description: "Nevera, congelador y despensa" },
      {
        name: "Plan Semanal",
        description: "Planificación de comidas semanales",
      },
      {
        name: "Lista de Compra",
        description: "Generación y gestión de la lista de compra",
      },
      {
        name: "Hogar",
        description: "Gestión del hogar compartido e invitaciones",
      },
      {
        name: "Alertas",
        description: "Alertas de stock bajo y umbrales mínimos",
      },
      {
        name: "Perfil",
        description: "Perfil nutricional y macros recomendados",
      },
      {
        name: "PDF",
        description: "Exportación e importación de recetas en PDF",
      },
      { name: "Backup", description: "Exportación e importación de datos" },
      {
        name: "Productos",
        description: "Gestión de productos (no ingredientes de receta)",
      },
    ],
  },
  apis:
    process.env.NODE_ENV === "production"
      ? ["./dist/controllers/*.js"]
      : ["./src/controllers/*.ts"],
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
