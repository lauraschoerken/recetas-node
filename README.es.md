# MealAgenda — API

[English](README.md)

API REST de MealAgenda, desarrollada con TypeScript, Express, Prisma y PostgreSQL. Proporciona autenticación y el comportamiento de servidor para recetas, ingredientes, planificación de comidas, listas de la compra, existencias del hogar, hogares compartidos, alertas, perfiles y entrenamientos.

El cliente web se encuentra en [recetas-react](https://github.com/lauraschoerken/recetas-react). Consulta [ARCHITECTURE.md](ARCHITECTURE.md) para conocer el diseño de controladores, servicios, dominio y persistencia.

## Requisitos

- Para la última verificación local se utilizaron Node.js 24.14.1 y npm 11.11.0. El proyecto está pensado para versiones modernas de Node.js con soporte.
- PostgreSQL 15 o una versión compatible. Utiliza bases diferentes para desarrollo y tests.

## Desarrollo local

```bash
git clone --branch develop https://github.com/lauraschoerken/recetas-node.git
cd recetas-node
npm ci
Copy-Item .env.example .env  # PowerShell
# cp .env.example .env       # macOS/Linux
npm run prisma:generate
npx prisma migrate deploy
npm run dev
```

Antes de aplicar migraciones, confirma que `DATABASE_URL` apunta a tu base local dedicada. El `.env.example` proporcionado usa el puerto `3002`; si se omite `PORT`, el código utiliza `3001`. Con la configuración de ejemplo, comprueba `http://localhost:3002/health`; la documentación interactiva está en `http://localhost:3002/api-docs`.

## Configuración

Copia `.env.example` como `.env` y sustituye sus valores de ejemplo. No subas `.env`, `.env.test`, credenciales, tokens ni exportaciones de bases de datos.

| Variable | Obligatoria | Finalidad |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Conexión PostgreSQL utilizada por Prisma. Las bases de desarrollo y tests deben ser distintas. |
| `JWT_SECRET` | Sí | Secreto privado y de alta entropía utilizado para firmar tokens de autenticación. |
| `PORT` | No | Puerto HTTP; por defecto `3001`. |
| `CORS_ALLOWED_ORIGINS` | Despliegue | Orígenes de navegador permitidos por CORS, separados por comas. Si se omite se usan orígenes locales de respaldo. |
| `JSON_BODY_LIMIT` | No | Límite de JSON/importaciones de Express; por defecto `10mb`. |
| `APP_URL` | Invitaciones | URL pública de la web para construir invitaciones; por defecto `http://localhost:5173`. |
| `SMTP_HOST`, `SMTP_PORT` | Correo | Servidor SMTP; el host y puerto predeterminados son `smtp.gmail.com:587`. |
| `SMTP_USER`, `SMTP_PASS` | Correo | Credenciales SMTP. Si faltan, se omite el envío de invitaciones. |
| `SMTP_FROM` | No | Remitente; usa `SMTP_USER` y después `noreply@recetas.app` como alternativas. |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Bootstrap | Credenciales utilizadas por el bootstrap administrativo. Define valores seguros antes de ejecutar fuera de un entorno local aislado. |
| `NODE_ENV` | Tests/despliegue | Modo de ejecución. Jest lo establece como `test`. |
| `ALLOW_TEST_ENDPOINTS` | Solo tests | Habilita endpoints destructivos de limpieza cuando vale `true`. Nunca lo habilites en producción. |

## Build y ejecución

```bash
npm run build
npm start
```

`npm start` ejecuta `dist/index.js`. El workflow de Docker construye y publica una imagen cuando se actualiza `develop`; eso no demuestra ni realiza por sí solo un despliegue de producción.

## Tests

Crea una configuración desechable sin sobrescribir un `.env.test` existente:

```bash
Copy-Item .env.test.example .env.test  # PowerShell
# cp .env.test.example .env.test       # macOS/Linux
```

Revisa cuidadosamente `DATABASE_URL` y después ejecuta:

```bash
npm test
npm run test:coverage
```

**Comportamiento destructivo:** la preparación global de Jest ejecuta primero `prisma migrate deploy`. Si falla, ejecuta `prisma db push --force-reset --accept-data-loss` contra la `DATABASE_URL` cargada desde `.env.test`. El script `npm run test:db:setup` también reinicia forzosamente una base local fijada en el comando. Nunca ejecutes estos comandos con la URL de una base de producción, compartida o valiosa.

### Estado de la verificación

El 6 de noviembre de 2026 una copia sin dependencias completó `npm ci` y `npm run build`. El comando de tests se intentó únicamente con el destino configurado `recipes_db_test`, pero PostgreSQL no estaba disponible en el puerto `5432`; no se ejecutó ningún caso de prueba ni se utilizó otra base de datos.

## Entornos local, de tests y desplegado

- **Desarrollo local:** `.env` privado, base de desarrollo dedicada y API normalmente en el puerto `3002` con el ejemplo proporcionado.
- **Tests:** `.env.test` privado, base desechable y `NODE_ENV=test`; se esperan operaciones de limpieza y reinicio.
- **Despliegue:** secretos proporcionados por la plataforma, CORS y URL pública explícitos, endpoints de test deshabilitados. Una instancia desplegada contiene cuentas reales y no es un entorno de pruebas.

## Problemas frecuentes

- **Falla la conexión con la base:** verifica que PostgreSQL está activo, la base existe y todos los componentes de `DATABASE_URL` son correctos.
- **Falla una migración:** confirma la base de destino y ejecuta `npm run prisma:generate`; no uses un reinicio forzado para reparar datos valiosos.
- **Las peticiones web fallan por CORS:** añade el origen exacto de la web a `CORS_ALLOWED_ORIGINS` y reinicia la API.
- **El proxy del frontend no conecta:** haz que `VITE_API_URL` coincida con el `PORT` configurado en la API (`3002` en los ejemplos locales).
- **Puerto ocupado:** detén el proceso en conflicto o cambia `PORT`, y actualiza después los clientes y tests.
- **No se envían invitaciones:** configura las credenciales SMTP. Sin ellas, el servicio registra que el correo está deshabilitado.

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un pull request.

## Licencia

Copyright © 2025 Laura Schörken. El código fuente está disponible bajo la [Licencia MIT](LICENSE). Consulta los [avisos de terceros](THIRD_PARTY_NOTICES.md) para las dependencias incluidas. Los nombres de producto, imágenes, recetas y materiales de terceros pueden tener derechos diferentes.

