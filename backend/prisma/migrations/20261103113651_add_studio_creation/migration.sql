-- CreateTable
CREATE TABLE "studio_creations" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "imageUrls" TEXT[],
    "descriptionFr" TEXT,
    "descriptionTn" TEXT,
    "descriptionIg" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "platform" TEXT,
    "shareUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "studio_creations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "studio_creations_propertyId_idx" ON "studio_creations"("propertyId");

-- CreateIndex
CREATE INDEX "studio_creations_template_idx" ON "studio_creations"("template");

-- CreateIndex
CREATE INDEX "studio_creations_createdAt_idx" ON "studio_creations"("createdAt");

-- CreateIndex
CREATE INDEX "studio_creations_createdById_idx" ON "studio_creations"("createdById");

-- AddForeignKey
ALTER TABLE "studio_creations" ADD CONSTRAINT "studio_creations_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_creations" ADD CONSTRAINT "studio_creations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
