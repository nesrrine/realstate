-- AlterTable
ALTER TABLE "property_documents" ADD COLUMN     "cloudinary_delivery_type" TEXT DEFAULT 'private',
ADD COLUMN     "cloudinary_public_id" TEXT,
ADD COLUMN     "cloudinary_resource_type" TEXT;
