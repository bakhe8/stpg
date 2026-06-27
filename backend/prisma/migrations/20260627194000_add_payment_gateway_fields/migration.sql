DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE "payment_method" AS ENUM ('MANUAL', 'STRIPE', 'MOYASAR');
  END IF;
END $$;

ALTER TABLE "payment_records"
  ADD COLUMN IF NOT EXISTS "paymentMethod" "payment_method" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "gatewayTransactionId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "payment_records_gatewayTransactionId_key"
  ON "payment_records"("gatewayTransactionId");
