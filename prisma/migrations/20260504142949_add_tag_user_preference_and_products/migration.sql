-- AlterTable
ALTER TABLE "HomeItem" ADD COLUMN     "productId" INTEGER;

-- AlterTable
ALTER TABLE "ShoppingItem" ADD COLUMN     "productId" INTEGER,
ALTER COLUMN "ingredientId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "IngredientTagUserPreference" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "colorOverride" TEXT,
    "isHiddenGlobally" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "IngredientTagUserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PRIVATE',
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMinThreshold" (
    "id" SERIAL NOT NULL,
    "minQuantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "userId" INTEGER,
    "householdId" INTEGER,

    CONSTRAINT "ProductMinThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStoreProduct" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "purchaseUrl" TEXT,
    "sortOrder" INTEGER,

    CONSTRAINT "UserStoreProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngredientTagUserPreference_userId_tagId_key" ON "IngredientTagUserPreference"("userId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMinThreshold_productId_userId_key" ON "ProductMinThreshold"("productId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMinThreshold_productId_householdId_key" ON "ProductMinThreshold"("productId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "UserStoreProduct_storeId_productId_key" ON "UserStoreProduct"("storeId", "productId");

-- AddForeignKey
ALTER TABLE "HomeItem" ADD CONSTRAINT "HomeItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientTagUserPreference" ADD CONSTRAINT "IngredientTagUserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientTagUserPreference" ADD CONSTRAINT "IngredientTagUserPreference_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "IngredientTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMinThreshold" ADD CONSTRAINT "ProductMinThreshold_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMinThreshold" ADD CONSTRAINT "ProductMinThreshold_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStoreProduct" ADD CONSTRAINT "UserStoreProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "UserStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStoreProduct" ADD CONSTRAINT "UserStoreProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
