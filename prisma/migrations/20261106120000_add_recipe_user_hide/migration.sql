-- CreateTable
CREATE TABLE "RecipeUserHide" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeUserHide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecipeUserHide_userId_recipeId_key" ON "RecipeUserHide"("userId", "recipeId");

-- CreateIndex
CREATE INDEX "RecipeUserHide_recipeId_idx" ON "RecipeUserHide"("recipeId");

-- AddForeignKey
ALTER TABLE "RecipeUserHide" ADD CONSTRAINT "RecipeUserHide_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeUserHide" ADD CONSTRAINT "RecipeUserHide_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
