/*
  Warnings:

  - You are about to drop the column `cin` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `passport` on the `clients` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "clients" DROP COLUMN "cin",
DROP COLUMN "passport",
ADD COLUMN     "cinOrPassport" TEXT;
