import "reflect-metadata";
import express from "express";
import cors from "cors";
import { useExpressServer } from "routing-controllers";

import { AuthController } from "./controllers/auth.controller";
import { RecipeController } from "./controllers/recipe.controller";
import { IngredientController } from "./controllers/ingredient.controller";
import { IngredientTagController } from "./controllers/ingredientTag.controller";
import { IngredientProposalController } from "./controllers/ingredientProposal.controller";
import { UserStoreController } from "./controllers/userStore.controller";
import { AdminController } from "./controllers/admin.controller";
import { ShoppingController } from "./controllers/shopping.controller";
import { HomeItemController } from "./controllers/homeItem.controller";
import { HouseholdController } from "./controllers/household.controller";
import { AlertController } from "./controllers/alert.controller";
import { BackupController } from "./controllers/backup.controller";
import { PdfController } from "./controllers/pdf.controller";
import { TestController } from "./controllers/test.controller";
import { ProductController } from "./controllers/product.controller";

export function createApp() {
  const app = express();
  const bodyLimit = process.env.JSON_BODY_LIMIT || "10mb";

  app.use(cors());
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ limit: bodyLimit, extended: true }));

  // Determinar qué controladores usar
  const controllers: any[] = [
    AuthController,
    RecipeController,
    IngredientController,
    IngredientTagController,
    IngredientProposalController,
    UserStoreController,
    AdminController,
    ShoppingController,
    HomeItemController,
    HouseholdController,
    AlertController,
    BackupController,
    PdfController,
    ProductController,
  ];

  // Agregar TestController solo en entorno de test
  if (
    process.env.NODE_ENV === "test" ||
    process.env.ALLOW_TEST_ENDPOINTS === "true"
  ) {
    controllers.push(TestController);
  }

  useExpressServer(app, {
    routePrefix: "/api",
    controllers,
    defaultErrorHandler: false,
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const status = err.httpCode || err.status || 500;
      const message =
        err.type === "entity.too.large"
          ? "El archivo es demasiado grande para importarlo. Prueba con un PDF más pequeño o aumenta JSON_BODY_LIMIT en backend."
          : err.message || "Error interno del servidor";
      res.status(status).json({ error: message });
    },
  );

  return app;
}
