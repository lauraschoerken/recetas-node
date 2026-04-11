-- AlterTable
ALTER TABLE "HomeItem" ADD COLUMN     "householdId" INTEGER;

-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "defaultLocation" TEXT;

-- AlterTable
ALTER TABLE "ShoppingItem" ADD COLUMN     "householdId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "planningAlertScope" TEXT;

-- CreateTable
CREATE TABLE "Household" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shareHome" BOOLEAN NOT NULL DEFAULT true,
    "shareShopping" BOOLEAN NOT NULL DEFAULT true,
    "shareAlerts" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" SERIAL NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "householdId" INTEGER NOT NULL,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdInvite" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senderId" INTEGER NOT NULL,
    "householdId" INTEGER NOT NULL,

    CONSTRAINT "HouseholdInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientMinThreshold" (
    "id" SERIAL NOT NULL,
    "minQuantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "householdId" INTEGER,
    "userId" INTEGER,

    CONSTRAINT "IngredientMinThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeMinThreshold" (
    "id" SERIAL NOT NULL,
    "minServings" DOUBLE PRECISION NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "householdId" INTEGER,
    "userId" INTEGER,

    CONSTRAINT "RecipeMinThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "triggerType" TEXT NOT NULL,
    "beforeQty" DOUBLE PRECISION NOT NULL,
    "deltaQty" DOUBLE PRECISION NOT NULL,
    "afterQty" DOUBLE PRECISION NOT NULL,
    "minimum" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snoozedUntil" TIMESTAMP(3),
    "userId" INTEGER NOT NULL,
    "householdId" INTEGER,
    "ingredientId" INTEGER,
    "recipeId" INTEGER,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeItemHistory" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "homeItemId" INTEGER NOT NULL,

    CONSTRAINT "HomeItemHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMember_userId_householdId_key" ON "HouseholdMember"("userId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdInvite_token_key" ON "HouseholdInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientMinThreshold_ingredientId_householdId_key" ON "IngredientMinThreshold"("ingredientId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientMinThreshold_ingredientId_userId_key" ON "IngredientMinThreshold"("ingredientId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeMinThreshold_recipeId_householdId_key" ON "RecipeMinThreshold"("recipeId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeMinThreshold_recipeId_userId_key" ON "RecipeMinThreshold"("recipeId", "userId");

-- AddForeignKey
ALTER TABLE "HomeItem" ADD CONSTRAINT "HomeItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdInvite" ADD CONSTRAINT "HouseholdInvite_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdInvite" ADD CONSTRAINT "HouseholdInvite_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientMinThreshold" ADD CONSTRAINT "IngredientMinThreshold_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeMinThreshold" ADD CONSTRAINT "RecipeMinThreshold_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeItemHistory" ADD CONSTRAINT "HomeItemHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeItemHistory" ADD CONSTRAINT "HomeItemHistory_homeItemId_fkey" FOREIGN KEY ("homeItemId") REFERENCES "HomeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
