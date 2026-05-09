# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar manifests e instalar dependencias (incluye generación del cliente Prisma)
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund
RUN npx prisma generate

# Compilar TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Solo lo necesario en producción
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3001

# Ejecutar migraciones pendientes y arrancar el servidor
CMD sh -c "npx prisma migrate deploy && node dist/index.js"
