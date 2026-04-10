# Recetas API - Backend

API REST para la gestión de recetas, planificación de comidas y listas de compra.

## Tecnologías

| Tecnología          | Descripción                         |
|---------------------|-------------------------------------|
| Node.js (v16+)      | Runtime de JavaScript               |
| Express.js          | Framework web                       |
| TypeScript          | Tipado estático                     |
| routing-controllers | Decoradores para rutas (estilo Java)|
| Prisma              | ORM para PostgreSQL                 |
| JWT                 | Autenticación con tokens            |
| bcrypt              | Hash de contraseñas                 |
| Swagger             | Documentación interactiva API       |

## Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Ejecutar migraciones
npx prisma migrate dev

# Generar cliente Prisma
npx prisma generate

# Iniciar en desarrollo
npm run dev
```

## Variables de Entorno

Crear archivo `.env`:

```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/recetas_db"
JWT_SECRET="clave-secreta-para-jwt"
PORT=3001
```

## Scripts

```bash
npm run dev             # Inicia servidor en desarrollo con hot-reload
npm run build           # Compila TypeScript a JavaScript
npm start               # Inicia servidor en producción
npm test                # Ejecuta los tests
npm run test:watch      # Ejecuta tests en modo watch
npm run test:coverage   # Ejecuta tests con reporte de cobertura
npx prisma studio       # Abre interfaz visual de la base de datos
npx prisma migrate dev  # Ejecuta migraciones pendientes
```

## Tests

El backend incluye tests de integración para todos los endpoints usando Jest y Supertest.

### Ejecutar Tests

```bash
# Ejecutar todos los tests
npm test

# Ejecutar en modo watch (re-ejecuta al guardar cambios)
npm run test:watch

# Ejecutar con reporte de cobertura
npm run test:coverage
```

### Estructura de Tests

```
src/tests/
├── setup.ts                    # Configuración global de tests
├── helpers.ts                  # Funciones auxiliares (crear usuarios, etc.)
├── auth.controller.test.ts     # Tests de autenticación
├── recipe.controller.test.ts   # Tests de recetas
├── ingredient.controller.test.ts # Tests de ingredientes
├── dish.controller.test.ts     # Tests de platos
├── shopping.controller.test.ts # Tests de plan semanal
└── homeItem.controller.test.ts # Tests de almacenamiento
```

### Cobertura de Tests

Los tests cubren:
- **Auth**: Register, Login, Me (obtener usuario actual)
- **Recipes**: CRUD completo (crear, leer, actualizar, eliminar)
- **Ingredients**: CRUD, búsqueda, bulk create, conversiones
- **Dishes**: CRUD con slots y opciones
- **Shopping**: Week plan (añadir, mover, eliminar), cook, consume
- **HomeItem**: CRUD de items en nevera/congelador/despensa

## Estructura del Proyecto

```
back/
├── prisma/
│   ├── schema.prisma          # Esquema de base de datos
│   └── migrations/            # Migraciones SQL
├── src/
│   ├── controllers/           # Controladores con decoradores (rutas + lógica HTTP)
│   │   ├── auth.controller.ts
│   │   ├── recipe.controller.ts
│   │   ├── ingredient.controller.ts
│   │   ├── dish.controller.ts
│   │   ├── shopping.controller.ts
│   │   └── homeItem.controller.ts
│   ├── services/              # Lógica de negocio
│   │   ├── auth.service.ts
│   │   ├── recipe.service.ts
│   │   ├── ingredient.service.ts
│   │   ├── dish.service.ts
│   │   ├── shopping.service.ts
│   │   └── homeItem.service.ts
│   ├── domain/                # Interfaces y tipos TypeScript
│   │   ├── user.ts
│   │   ├── recipe.ts
│   │   ├── ingredient.ts
│   │   ├── dish.ts
│   │   └── weekPlan.ts
│   ├── middlewares/           # Middlewares
│   │   └── auth.middleware.ts
│   ├── swagger.ts             # Configuración Swagger/OpenAPI
│   └── index.ts               # Entry point
├── package.json
└── tsconfig.json
```

## Decoradores (routing-controllers)

Los controllers usan decoradores similares a Spring Boot:

```typescript
@JsonController('/recipes')
@UseBefore(authMiddleware)
export class RecipeController {
  
  @Get('/')
  async getAll(@Req() req: AuthRequest) {
    return recipeService.getAll(req.userId!);
  }

  @Get('/:id')
  async getById(@Param('id') id: number, @Req() req: AuthRequest) {
    // ...
  }

  @Post('/')
  @HttpCode(201)
  async create(@Body() body: CreateRecipeDto, @Req() req: AuthRequest) {
    // ...
  }

  @Put('/:id')
  async update(@Param('id') id: number, @Body() body: UpdateRecipeDto) {
    // ...
  }

  @Delete('/:id')
  @HttpCode(204)
  async delete(@Param('id') id: number) {
    // ...
  }
}
```

**Decoradores disponibles:**
- `@JsonController('/path')` - Define el controller y su ruta base
- `@Get()`, `@Post()`, `@Put()`, `@Delete()` - Métodos HTTP
- `@Param('name')` - Parámetros de ruta
- `@QueryParam('name')` - Parámetros de query string
- `@Body()` - Cuerpo de la petición
- `@Req()` - Request completo
- `@UseBefore(middleware)` - Aplica middleware
- `@HttpCode(code)` - Código de respuesta

## Documentación Swagger

La API cuenta con documentación interactiva generada con Swagger/OpenAPI.

**URL**: http://localhost:3001/api-docs

Desde Swagger UI puedes:
- Ver todos los endpoints disponibles
- Probar las peticiones directamente
- Ver los esquemas de datos
- Descargar la especificación OpenAPI en `/api-docs.json`

## API Endpoints

### Autenticación
```
POST   /auth/register     # Registrar usuario
POST   /auth/login        # Iniciar sesión
```

### Recetas
```
GET    /recipes           # Listar recetas
GET    /recipes/:id       # Obtener receta
POST   /recipes           # Crear receta
PUT    /recipes/:id       # Actualizar receta
DELETE /recipes/:id       # Eliminar receta
```

### Ingredientes
```
GET    /ingredients                    # Listar ingredientes
GET    /ingredients/search?q=          # Buscar ingredientes
GET    /ingredients/:id                # Obtener ingrediente
POST   /ingredients                    # Crear ingrediente
PUT    /ingredients/:id                # Actualizar ingrediente
DELETE /ingredients/:id                # Eliminar ingrediente

# Conversiones de unidades
GET    /ingredients/:id/conversions           # Listar conversiones
POST   /ingredients/:id/conversions           # Añadir conversión
PUT    /ingredients/conversions/:conversionId # Actualizar conversión
DELETE /ingredients/conversions/:conversionId # Eliminar conversión
```

### Platos
```
GET    /dishes            # Listar platos
GET    /dishes/:id        # Obtener plato
POST   /dishes            # Crear plato
PUT    /dishes/:id        # Actualizar plato
DELETE /dishes/:id        # Eliminar plato
```

### Plan Semanal
```
GET    /week-plan?startDate=&endDate=  # Obtener plan
POST   /week-plan                       # Añadir al plan
PUT    /week-plan/:id                   # Mover fecha
DELETE /week-plan/:id                   # Eliminar del plan
```

### Lista de Compra
```
GET    /shopping-list?startDate=&endDate=  # Generar lista
```

### Almacenamiento
```
GET    /home-items                  # Listar items
GET    /home-items?location=nevera  # Filtrar por ubicación
POST   /home-items                  # Añadir item
PUT    /home-items/:id              # Actualizar item
DELETE /home-items/:id              # Eliminar item
```

### Nutrición
```
GET    /ingredients/nutrition/daily?date=  # Macros del día
```

## Modelos de Base de Datos

| Modelo                    | Campos Principales                                                              |
|---------------------------|---------------------------------------------------------------------------------|
| **User**                  | id, email, password, name, createdAt, updatedAt                                 |
| **Recipe**                | id, title, description, instructions, servings, isPublic, userId               |
| **Ingredient**            | id, name, unit (g/ml), preferredUnit, imageUrl                                  |
| **IngredientVariant**     | id, name, isDefault, calories, protein, carbs, fat, fiber, weightFactor         |
| **UnitConversion**        | id, unitName, gramsPerUnit, ingredientId                                        |
| **RecipeIngredient**      | id, quantity, unit, recipeId, ingredientId, variantId, cookedVariantId          |
| **RecipeComponent**       | id, name, sortOrder, isOptional, defaultEnabled, recipeId                       |
| **RecipeComponentOption** | id, name, isDefault, quantity, unit, ingredientId, recipeId, variantId          |
| **WeekPlan**              | id, plannedDate, servings, type, cooked, consumed, userId, recipeId             |
| **HomeItem**              | id, location, quantity, addedAt, expiresAt, userId, ingredientId, variantId     |

### Campos Especiales

| Campo             | Modelo              | Descripción                                                    |
|-------------------|---------------------|----------------------------------------------------------------|
| **weightFactor**  | IngredientVariant   | Factor de cambio de peso al cocinar (ej: arroz 2.6x)           |
| **preferredUnit** | Ingredient          | Unidad preferida para mostrar en lista de compra               |
| **variantId**     | RecipeIngredient    | Estado del ingrediente en la receta                            |
| **cookedVariantId**| RecipeIngredient   | Estado final del ingrediente (deprecado, usar variantId)       |

### Relaciones

| Modelo           | Relación                                     |
|------------------|----------------------------------------------|
| Recipe           | → ingredients (RecipeIngredient[])           |
| Recipe           | → components (RecipeComponent[])             |
| Ingredient       | → variants (IngredientVariant[])             |
| Ingredient       | → conversions (UnitConversion[])             |
| RecipeComponent  | → options (RecipeComponentOption[])          |
| HomeItem         | → variant (IngredientVariant)                |

## Autenticación

Todas las rutas (excepto `/auth/*`) requieren token JWT:

```
Authorization: Bearer <token>
```

El token se obtiene al hacer login y contiene el `userId`.

## Ejemplos de Requests

### Crear Receta
```json
POST /recipes
{
  "title": "Tortilla Española",
  "description": "Receta tradicional",
  "instructions": "1. Pelar patatas...",
  "servings": 4,
  "isPublic": false,
  "ingredients": [
    { "name": "Patata", "quantity": 500, "unit": "g" },
    { "name": "Huevo", "quantity": 6, "unit": "unidad" }
  ]
}
```

### Crear Conversión
```json
POST /ingredients/1/conversions
{
  "unitName": "diente",
  "gramsPerUnit": 5
}
```

### Añadir al Plan
```json
POST /week-plan
{
  "recipeId": 1,
  "plannedDate": "2026-03-20",
  "servings": 4
}
```
