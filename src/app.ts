import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { useExpressServer } from 'routing-controllers';

import { AuthController } from './controllers/auth.controller';
import { RecipeController } from './controllers/recipe.controller';
import { IngredientController } from './controllers/ingredient.controller';
import { ShoppingController } from './controllers/shopping.controller';
import { HomeItemController } from './controllers/homeItem.controller';
import { TestController } from './controllers/test.controller';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Determinar qué controladores usar
  const controllers: any[] = [
    AuthController,
    RecipeController,
    IngredientController,
    ShoppingController,
    HomeItemController
  ];

  // Agregar TestController solo en entorno de test
  if (process.env.NODE_ENV === 'test' || process.env.ALLOW_TEST_ENDPOINTS === 'true') {
    controllers.push(TestController);
  }

  useExpressServer(app, {
    routePrefix: '/api',
    controllers,
    defaultErrorHandler: false
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.httpCode || err.status || 500;
    const message = err.message || 'Error interno del servidor';
    res.status(status).json({ error: message });
  });

  return app;
}
