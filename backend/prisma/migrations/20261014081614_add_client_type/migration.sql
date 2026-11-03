-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "type" "ClientType" NOT NULL DEFAULT 'PROSPECT';

-- CreateIndex
CREATE INDEX "clients_type_idx" ON "clients"("type");
