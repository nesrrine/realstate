-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionPaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- Transaction: date + status
ALTER TABLE "transactions" RENAME COLUMN "signedAt" TO "date";
ALTER TABLE "transactions" ADD COLUMN "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING';

-- Commission: split amounts + payment status
ALTER TABLE "commissions" ADD COLUMN "commissionRate" DECIMAL(5,4);
ALTER TABLE "commissions" ADD COLUMN "agencyAmount" DECIMAL(10,2);
ALTER TABLE "commissions" ADD COLUMN "agentAmount" DECIMAL(10,2);
ALTER TABLE "commissions" ADD COLUMN "agentShareRate" DECIMAL(5,4);
ALTER TABLE "commissions" ADD COLUMN "paymentStatus" "CommissionPaymentStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "commissions"
SET
  "commissionRate" = COALESCE("rate", 0.02),
  "agentShareRate" = 0.5,
  "agencyAmount" = ROUND(COALESCE("amount", 0) * 0.5, 2),
  "agentAmount" = COALESCE("amount", 0) - ROUND(COALESCE("amount", 0) * 0.5, 2),
  "paymentStatus" = CASE WHEN "isPaid" = true THEN 'PAID'::"CommissionPaymentStatus" ELSE 'PENDING'::"CommissionPaymentStatus" END
WHERE "commissionRate" IS NULL;

ALTER TABLE "commissions" ALTER COLUMN "commissionRate" SET NOT NULL;
ALTER TABLE "commissions" ALTER COLUMN "agencyAmount" SET NOT NULL;
ALTER TABLE "commissions" ALTER COLUMN "agentAmount" SET NOT NULL;
ALTER TABLE "commissions" ALTER COLUMN "agentShareRate" SET NOT NULL;

ALTER TABLE "commissions" DROP COLUMN "rate";
ALTER TABLE "commissions" DROP COLUMN "isPaid";

CREATE INDEX "commissions_paymentStatus_idx" ON "commissions"("paymentStatus");
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- App settings (commission rate configuration)
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

INSERT INTO "app_settings" ("key", "value", "updatedAt")
VALUES
  ('COMMISSION_RATE', '0.02', CURRENT_TIMESTAMP),
  ('AGENT_SHARE_RATE', '0.5', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
