ALTER TABLE "Ingredient"
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedByUserId" INTEGER;

CREATE TABLE "IngredientAuditLog" (
    "id" SERIAL NOT NULL,
    "ingredientId" INTEGER,
    "actorUserId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IngredientAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IngredientAuditLog_ingredientId_createdAt_idx"
ON "IngredientAuditLog"("ingredientId", "createdAt");

CREATE INDEX "IngredientAuditLog_actorUserId_createdAt_idx"
ON "IngredientAuditLog"("actorUserId", "createdAt");

ALTER TABLE "IngredientAuditLog"
ADD CONSTRAINT "IngredientAuditLog_ingredientId_fkey"
FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
