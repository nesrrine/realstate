-- Migration: Add PropertyDocument model for property documents
-- Allows attaching documents (plans, diagnostics, contracts) to properties

CREATE TABLE "property_documents" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "size" INTEGER,
    "mimeType" TEXT,
    "originalName" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "property_documents_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "property_documents_propertyId_idx" ON "property_documents"("propertyId");
CREATE INDEX "property_documents_category_idx" ON "property_documents"("category");