-- CreateTable
CREATE TABLE "ProductUserOverride" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "ProductUserOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductProposal" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "proposedByUserId" INTEGER NOT NULL,
    "reviewedByUserId" INTEGER,
    "productId" INTEGER NOT NULL,
    "fieldName" TEXT,
    "currentValue" TEXT,
    "proposedValue" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductUserOverride_userId_productId_key" ON "ProductUserOverride"("userId", "productId");

-- AddForeignKey
ALTER TABLE "ProductUserOverride" ADD CONSTRAINT "ProductUserOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUserOverride" ADD CONSTRAINT "ProductUserOverride_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductProposal" ADD CONSTRAINT "ProductProposal_proposedByUserId_fkey" FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductProposal" ADD CONSTRAINT "ProductProposal_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductProposal" ADD CONSTRAINT "ProductProposal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
