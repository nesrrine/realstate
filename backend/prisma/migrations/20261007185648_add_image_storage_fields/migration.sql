-- AlterTable
ALTER TABLE "property_images" ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "originalName" TEXT,
ADD COLUMN     "size" INTEGER,
ADD COLUMN     "storageKey" TEXT;
