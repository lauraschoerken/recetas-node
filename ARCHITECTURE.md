# Backend — Arquitectura y Documentación

## Stack Tecnológico

| Tecnología                         | Versión | Uso                                |
| ---------------------------------- | ------- | ---------------------------------- |
| Node.js                            | 20+     | Runtime                            |
| Express                            | 4.18    | HTTP server                        |
| TypeScript                         | 5.3     | Tipado estático                    |
| routing-controllers                | 0.11    | Decoradores para controllers/rutas |
| Prisma                             | 5.10    | ORM + migraciones                  |
| PostgreSQL                         | 15+     | Base de datos principal            |
| jsonwebtoken                       | 9       | Autenticación JWT                  |
| bcrypt                             | 5       | Hash de contraseñas                |
| nodemailer                         | 8       | Envío de emails (invitaciones)     |
| pdfkit                             | 0.18    | Generación de PDFs de recetas      |
| swagger-jsdoc + swagger-ui-express | —       | Documentación Swagger/OpenAPI      |
| Jest + Supertest                   | 30 / 7  | Tests de integración               |

---

## Estructura de Carpetas

```
recetas-node/
├── prisma/
│   ├── schema.prisma         # Definición de todos los modelos
│   ├── migrations/           # Migraciones SQL generadas por Prisma
│   ├── seed.ts               # Seed básico de usuarios de desarrollo
│   ├── seed-recipes.ts       # Seed de recetas de ejemplo
│   └── seeds/                # Seeds SQL de ingredientes
├── src/
│   ├── app.ts                # Factory de la aplicación Express
│   ├── index.ts              # Punto de entrada (listen)
│   ├── swagger.ts            # Configuración de Swagger + schemas
│   ├── controllers/          # Un fichero por dominio
│   ├── domain/               # DTOs + tipos TypeScript
│   ├── middlewares/          # auth.middleware.ts
│   ├── routes/               # (vacío — las rutas se declaran con decoradores)
│   ├── services/             # Lógica de negocio + acceso a DB
│   ├── tests/                # Tests de integración (Jest + Supertest)
│   └── utils/                # Utilidades (conversiones de unidades, etc.)
```

---

## Arquitectura General

```
Request → authMiddleware → @JsonController → Service → Prisma → PostgreSQL
```

El framework `routing-controllers` convierte decoradores como `@Get()`, `@Post()`, `@Body()`, `@Param()` en routes de Express automáticamente. La `routePrefix` global es `/api`.

### `createApp()` (app.ts)

- Configura CORS (configurable via `CORS_ALLOWED_ORIGINS`)
- Limita el cuerpo JSON a `JSON_BODY_LIMIT` (default 10mb)
- Registra todos los controllers
- Añade endpoint `/health`
- El `TestController` solo se añade en `NODE_ENV=test` o `ALLOW_TEST_ENDPOINTS=true`

---

## Endpoints Disponibles

### Auth — `/api/auth`

| Método | Ruta               | Auth | Descripción                      |
| ------ | ------------------ | ---- | -------------------------------- |
| POST   | `/register`        | No   | Registrar nuevo usuario          |
| POST   | `/login`           | No   | Login → JWT                      |
| GET    | `/me`              | Sí   | Datos del usuario actual         |
| PUT    | `/account`         | Sí   | Actualizar nombre, email, imagen |
| POST   | `/change-password` | Sí   | Cambiar contraseña               |

### Recetas — `/api/recipes`

| Método | Ruta          | Descripción                                                                              |
| ------ | ------------- | ---------------------------------------------------------------------------------------- |
| GET    | `/`           | Listar con paginación y filtros (search, visibility, ingredient, difficulty, tags, sort) |
| GET    | `/:id`        | Detalle completo (ingredientes + componentes + variantes)                                |
| GET    | `/authors`    | Lista de autores únicos                                                                  |
| POST   | `/`           | Crear receta                                                                             |
| PUT    | `/:id`        | Actualizar receta                                                                        |
| DELETE | `/:id`        | Eliminar receta                                                                          |
| GET    | `/export/csv` | Exportar recetas seleccionadas como CSV                                                  |
| POST   | `/import/csv` | Importar recetas desde CSV                                                               |
| GET    | `/:id/pdf`    | Generar PDF de receta (con opciones de variantes)                                        |

### Ingredientes — `/api/ingredients`

| Método | Ruta                       | Descripción                                                   |
| ------ | -------------------------- | ------------------------------------------------------------- |
| GET    | `/`                        | Listar ingredientes globales (y propios privados) con filtros |
| POST   | `/`                        | Crear ingrediente                                             |
| PUT    | `/:id`                     | Actualizar ingrediente                                        |
| DELETE | `/:id`                     | Eliminar ingrediente                                          |
| GET    | `/:id/variants`            | Variantes de un ingrediente                                   |
| POST   | `/:id/variants`            | Añadir variante                                               |
| PUT    | `/:id/variants/:variantId` | Actualizar variante                                           |
| DELETE | `/:id/variants/:variantId` | Eliminar variante                                             |
| GET    | `/:id/conversions`         | Conversiones de unidad                                        |
| POST   | `/:id/conversions`         | Añadir conversión                                             |
| DELETE | `/:id/conversions/:convId` | Eliminar conversión                                           |

### Tags — `/api/ingredient-tags`

| Método | Ruta                             | Descripción               |
| ------ | -------------------------------- | ------------------------- |
| GET    | `/`                              | Listar tags               |
| POST   | `/`                              | Crear tag                 |
| PUT    | `/:id`                           | Actualizar tag            |
| DELETE | `/:id`                           | Eliminar tag              |
| POST   | `/:tagId/assign/:ingredientId`   | Asignar tag a ingrediente |
| DELETE | `/:tagId/unassign/:ingredientId` | Desasignar tag            |

### Propuestas de Ingredientes — `/api/ingredient-proposals`

| Método | Ruta           | Descripción                |
| ------ | -------------- | -------------------------- |
| GET    | `/`            | Listar propuestas          |
| POST   | `/`            | Crear propuesta            |
| PUT    | `/:id/approve` | Aprobar propuesta (admin)  |
| PUT    | `/:id/reject`  | Rechazar propuesta (admin) |

### Almacenamiento — `/api/home`

| Método | Ruta                | Descripción                                      |
| ------ | ------------------- | ------------------------------------------------ |
| GET    | `/`                 | Listar items del hogar (con filtro por location) |
| POST   | `/`                 | Añadir item al almacenamiento                    |
| PUT    | `/:id`              | Actualizar item                                  |
| DELETE | `/:id`              | Eliminar item                                    |
| POST   | `/process-consumed` | Procesar items consumidos del plan semanal       |
| POST   | `/:id/cook`         | Marcar como cocinado (reduce stock)              |

### Plan Semanal — `/api/week-plan`

| Método | Ruta              | Descripción                          |
| ------ | ----------------- | ------------------------------------ |
| GET    | `/`               | Obtener plan por rango de fechas     |
| POST   | `/`               | Añadir receta al plan                |
| PUT    | `/:id`            | Actualizar fecha de un plan          |
| DELETE | `/:id`            | Eliminar del plan                    |
| POST   | `/:id/cook`       | Marcar como cocinado (genera sobras) |
| POST   | `/:id/consume`    | Marcar como consumido                |
| POST   | `/:id/selections` | Guardar selecciones de variantes     |

### Lista de Compra — `/api/shopping-list`

| Método | Ruta        | Descripción                                   |
| ------ | ----------- | --------------------------------------------- |
| GET    | `/`         | Generar lista de compra inteligente           |
| POST   | `/purchase` | Marcar items como comprados (actualiza stock) |
| DELETE | `/`         | Limpiar lista                                 |

### Hogar Compartido — `/api/household`

| Método | Ruta               | Descripción                                    |
| ------ | ------------------ | ---------------------------------------------- |
| GET    | `/`                | Datos del household actual                     |
| POST   | `/`                | Crear household                                |
| PUT    | `/`                | Actualizar configuración                       |
| POST   | `/invite`          | Invitar miembro por email                      |
| GET    | `/invites/pending` | Invitaciones pendientes para el usuario actual |
| POST   | `/accept-invite`   | Aceptar invitación por token                   |
| DELETE | `/members/:userId` | Expulsar miembro                               |
| DELETE | `/leave`           | Abandonar household                            |

### Alertas — `/api/alerts`

| Método | Ruta           | Descripción            |
| ------ | -------------- | ---------------------- |
| GET    | `/`            | Listar alertas activas |
| POST   | `/:id/snooze`  | Posponer alerta        |
| POST   | `/:id/dismiss` | Descartar alerta       |

### Tiendas — `/api/user-stores`

| Método | Ruta                      | Descripción                   |
| ------ | ------------------------- | ----------------------------- |
| GET    | `/`                       | Listar tiendas del usuario    |
| POST   | `/`                       | Crear tienda                  |
| PUT    | `/:id`                    | Actualizar tienda             |
| DELETE | `/:id`                    | Eliminar tienda               |
| POST   | `/:id/ingredients`        | Asignar ingredientes a tienda |
| DELETE | `/:id/ingredients/:ingId` | Desasignar ingrediente        |

### Backup — `/api/backup`

| Método | Ruta      | Descripción                                 |
| ------ | --------- | ------------------------------------------- |
| GET    | `/export` | Exportar backup completo del usuario (JSON) |
| POST   | `/import` | Importar backup                             |

### Productos — `/api/products`

| Método | Ruta   | Descripción                  |
| ------ | ------ | ---------------------------- |
| GET    | `/`    | Listar productos con filtros |
| POST   | `/`    | Crear producto               |
| PUT    | `/:id` | Actualizar producto          |
| DELETE | `/:id` | Eliminar producto            |

### PDF — `/api/pdf`

| Método | Ruta                   | Descripción                              |
| ------ | ---------------------- | ---------------------------------------- |
| GET    | `/recipe/:id`          | Generar PDF de receta con datos base     |
| POST   | `/recipe/:id/generate` | Generar PDF con selecciones de variantes |

### Admin — `/api/admin`

| Método | Ruta                      | Auth  | Descripción                   |
| ------ | ------------------------- | ----- | ----------------------------- |
| GET    | `/users`                  | Admin | Listar usuarios               |
| DELETE | `/users/:id`              | Admin | Eliminar usuario              |
| GET    | `/stats`                  | Admin | Estadísticas globales         |
| PUT    | `/ingredients/:id/status` | Admin | Cambiar estado de ingrediente |

---

## Modelos de Datos (Prisma)

### Entidades principales

| Modelo                    | Descripción                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `User`                    | Usuario. Role: `USER` \| `ADMIN`. Tiene macros personales, peso, altura, objetivo.            |
| `Recipe`                  | Receta. Pública o privada. Macros calculados o manuales.                                      |
| `RecipeIngredient`        | Ingrediente en una receta con cantidad y unidad. Unique por `(recipeId, ingredientId)`.       |
| `RecipeComponent`         | Grupo opcional de variantes (ej: "Salsa"). Tiene `sortOrder`, `isOptional`, `defaultEnabled`. |
| `RecipeComponentOption`   | Opción dentro de un componente: puede ser un ingrediente O una sub-receta.                    |
| `Ingredient`              | Ingrediente del catálogo. Status: `GLOBAL` \| `PENDING` \| `PRIVATE` \| `REJECTED`.           |
| `IngredientVariant`       | Variante (crudo/cocinado) con macros y `weightFactor`.                                        |
| `UnitConversion`          | Factor de conversión unitName→gramos para un ingrediente.                                     |
| `WeekPlan`                | Entrada del plan semanal (receta + fecha + porciones).                                        |
| `WeekPlanSelection`       | Selección de opción de componente para un WeekPlan.                                           |
| `HomeItem`                | Item en almacenamiento (nevera/congelador/despensa). Soporta ingrediente O producto.          |
| `HomeItemHistory`         | Historial de acciones sobre HomeItem.                                                         |
| `ShoppingItem`            | Item de lista de compra generado. Soporta ingrediente O producto.                             |
| `ShoppingOverride`        | Override manual de cantidad/unidad en la lista de compra.                                     |
| `Household`               | Grupo de usuarios que comparten home, shopping y/o alertas.                                   |
| `HouseholdMember`         | Miembro de un Household con rol (`OWNER` \| `MEMBER`).                                        |
| `HouseholdInvite`         | Invitación por email con token UUID y fecha de expiración.                                    |
| `StockAlert`              | Alerta de stock bajo. Status: `OPEN` \| `SNOOZED` \| `DISMISSED`.                             |
| `IngredientMinThreshold`  | Umbral mínimo de stock para un ingrediente (por household o por usuario).                     |
| `RecipeMinThreshold`      | Umbral mínimo de porciones para una receta.                                                   |
| `IngredientTag`           | Etiqueta de categorización (color, nombre).                                                   |
| `IngredientTagAssignment` | Tag asignado a un ingrediente por un usuario.                                                 |
| `UserStore`               | Tienda personal del usuario (o household).                                                    |
| `UserStoreIngredient`     | Ingrediente asociado a una tienda.                                                            |
| `Product`                 | Producto del catálogo (ej: Mercadona). Soporta variantes y conversiones.                      |
| `IngredientProposal`      | Propuesta de creación/modificación de ingrediente global.                                     |
| `ProductProposal`         | Propuesta de creación/modificación de producto global.                                        |

---

## DTOs y Dominio (`src/domain/`)

Los DTOs se usan en los controllers con `class-validator` para validación automática:

- `CreateRecipeDto` / `UpdateRecipeDto`
- `CreateUserDto` / `LoginDto` / `AuthResponse` / `UserResponse`
- `CreateIngredientDto` / `UpdateIngredientDto`
- `CreateWeekPlanDto`
- `CreateHomeItemDto` / `UpdateHomeItemDto`
- `CreateHouseholdDto`

---

## Autenticación

1. El usuario hace login → recibe un JWT firmado con `JWT_SECRET`
2. El JWT contiene `{ userId, role }` con expiración de 7d
3. Cada request protegido debe incluir: `Authorization: Bearer <token>`
4. El `authMiddleware` verifica el JWT y añade `req.userId` y `req.userRole`
5. En caso de token inválido → 401

El `authMiddleware` se aplica a nivel de controller con `@UseBefore(authMiddleware)`.

---

## Persistencia y Migraciones

- **ORM**: Prisma 5 con cliente generado en `node_modules/@prisma/client`
- **Schema**: `prisma/schema.prisma` (fuente de verdad)
- **Migraciones**: `prisma/migrations/` — generadas con `npx prisma migrate dev`
- **Seed**: `npx prisma db seed` (ejecuta `prisma/seed.ts`)

### Comandos útiles

```bash
npx prisma migrate dev         # Crear migración + aplicar en dev
npx prisma migrate deploy      # Aplicar migraciones en producción
npx prisma db push             # Push sin migración (dev rápido)
npx prisma studio              # GUI de la DB en navegador
npx prisma generate            # Regenerar cliente TypeScript
```

---

## Configuración / Variables de Entorno

Fichero: `recetas-node/.env` (no incluido en git)

| Variable               | Descripción                       | Valor ejemplo                                      |
| ---------------------- | --------------------------------- | -------------------------------------------------- |
| `DATABASE_URL`         | Conexión PostgreSQL               | `postgresql://user:pass@localhost:5432/recipes_db` |
| `JWT_SECRET`           | Clave secreta para firmar JWT     | `cambiar-en-produccion`                            |
| `PORT`                 | Puerto del servidor               | `3002`                                             |
| `JSON_BODY_LIMIT`      | Límite de payload JSON            | `10mb`                                             |
| `CORS_ALLOWED_ORIGINS` | Orígenes CORS permitidos (comas)  | `http://localhost:3000`                            |
| `SMTP_HOST`            | Host SMTP para emails             | `smtp.gmail.com`                                   |
| `SMTP_PORT`            | Puerto SMTP                       | `587`                                              |
| `SMTP_USER`            | Usuario SMTP                      | —                                                  |
| `SMTP_PASS`            | Contraseña SMTP                   | —                                                  |
| `ALLOW_TEST_ENDPOINTS` | Activar endpoints de test en prod | `false`                                            |

---

## Ejecución Local

```bash
cd recetas-node
npm install

# Desarrollo con hot-reload
npm run dev

# Desarrollo con endpoints de test habilitados
npm run dev:test

# Build producción
npm run build

# Iniciar producción (requiere build)
npm start
```

---

## Tests (Jest + Supertest)

### Configuración

- `jest.config.js` — carga `.env.test` antes de importar módulos
- `src/tests/setup.ts` — conecta/desconecta Prisma, funciones de limpieza
- `src/tests/globalSetup.ts` / `globalTeardown.ts` — configuración global de Jest
- `src/tests/helpers.ts` — factorías de usuarios e ingredientes de test

### Tests existentes

| Fichero                         | Cobertura                               |
| ------------------------------- | --------------------------------------- |
| `auth.controller.test.ts`       | Register, login, credenciales inválidas |
| `recipe.controller.test.ts`     | CRUD de recetas                         |
| `ingredient.controller.test.ts` | CRUD de ingredientes                    |
| `homeItem.controller.test.ts`   | Almacenamiento                          |
| `shopping.controller.test.ts`   | Lista de compra                         |
| `dish.controller.test.ts`       | Componentes de receta                   |

### Ejecutar tests

```bash
npm test                  # Todos los tests
npm run test:watch        # Modo watch
npm run test:coverage     # Con cobertura
npm run test:db:setup     # Crear DB de test desde cero
```

### Requisitos para tests backend

- PostgreSQL corriendo
- `.env.test` con `DATABASE_URL` apuntando a `recipes_db_test`
- La DB de test se prepara con `npm run test:db:setup`

---

## Swagger / Documentación de API

- Disponible en: `http://localhost:3002/api-docs` (cuando el servidor está corriendo)
- La configuración base está en `src/swagger.ts`
- Los endpoints se documentan con comentarios JSDoc `@swagger` en cada controller
- La seguridad global requiere `bearerAuth` (JWT)
