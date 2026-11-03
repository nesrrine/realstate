-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('BUYER', 'SELLER', 'RENTER', 'OWNER');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "clientType" "ClientType";
