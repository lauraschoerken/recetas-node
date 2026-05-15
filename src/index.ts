import "reflect-metadata";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { useExpressServer } from "routing-controllers";
import { setupSwagger } from "./swagger";
import { ensureAdminUser } from "./utils/ensureAdminUser";

import { AuthController } from "./controllers/auth.controller";
import { RecipeController } from "./controllers/recipe.controller";
import { IngredientController } from "./controllers/ingredient.controller";
import { IngredientTagController } from "./controllers/ingredientTag.controller";
import { IngredientProposalController } from "./controllers/ingredientProposal.controller";
import { UserStoreController } from "./controllers/userStore.controller";
import { AdminController } from "./controllers/admin.controller";
import { ShoppingController } from "./controllers/shopping.controller";
import { HomeItemController } from "./controllers/homeItem.controller";
import { ProfileController } from "./controllers/profile.controller";
import { HouseholdController } from "./controllers/household.controller";
import { AlertController } from "./controllers/alert.controller";
import { BackupController } from "./controllers/backup.controller";
import { PdfController } from "./controllers/pdf.controller";
import { ProductController } from "./controllers/product.controller";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const bodyLimit = process.env.JSON_BODY_LIMIT || "10mb";

const rawOrigins = process.env.CORS_ALLOWED_ORIGINS;
const allowedOrigins = rawOrigins
  ? rawOrigins
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
  : [];

app.use(
  cors(
    allowedOrigins.length > 0
      ? {
          origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error(`CORS: origen no permitido: ${origin}`));
            }
          },
          credentials: true,
        }
      : undefined,
  ),
);
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ limit: bodyLimit, extended: true }));

setupSwagger(app);

useExpressServer(app, {
  routePrefix: "/api",
  controllers: [
    AuthController,
    RecipeController,
    IngredientController,
    IngredientTagController,
    IngredientProposalController,
    UserStoreController,
    AdminController,
    ShoppingController,
    HomeItemController,
    ProfileController,
    HouseholdController,
    AlertController,
    BackupController,
    PdfController,
    ProductController,
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
    const message =
      err.type === "entity.too.large"
        ? "El archivo es demasiado grande para importarlo. Prueba con un PDF más pequeño o aumenta JSON_BODY_LIMIT en backend."
        : err.message || "Error interno del servidor";

    res.status(status).json({ error: message });
  },
);

app.listen(PORT, async () => {
  await ensureAdminUser();
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Swagger docs en http://localhost:${PORT}/api-docs`);
});
