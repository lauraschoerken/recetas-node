import "reflect-metadata";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { useExpressServer } from "routing-controllers";
import { setupSwagger } from "./swagger";

import { AuthController } from "./controllers/auth.controller";
import { RecipeController } from "./controllers/recipe.controller";
import { IngredientController } from "./controllers/ingredient.controller";
import { ShoppingController } from "./controllers/shopping.controller";
import { HomeItemController } from "./controllers/homeItem.controller";
import { ProfileController } from "./controllers/profile.controller";
import { HouseholdController } from "./controllers/household.controller";
import { AlertController } from "./controllers/alert.controller";
import { BackupController } from "./controllers/backup.controller";
import { PdfController } from "./controllers/pdf.controller";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

setupSwagger(app);

useExpressServer(app, {
  routePrefix: "/api",
  controllers: [
    AuthController,
    RecipeController,
    IngredientController,
    ShoppingController,
    HomeItemController,
    ProfileController,
    HouseholdController,
    AlertController,
    BackupController,
    PdfController,
  ],
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
    console.error("Error:", err);

    const status = err.httpCode || err.status || 500;
    const message = err.message || "Error interno del servidor";

    res.status(status).json({ error: message });
  },
);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Swagger docs en http://localhost:${PORT}/api-docs`);
});
