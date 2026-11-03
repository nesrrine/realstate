/*
  Warnings:

  - You are about to drop the column `type` on the `clients` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "clients_type_idx";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "type";

-- DropEnum
DROP TYPE "ClientType";
