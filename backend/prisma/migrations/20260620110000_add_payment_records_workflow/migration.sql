-- CreateEnum
CREATE TYPE "payment_record_status" AS ENUM ('SUBMITTED', 'CONFIRMED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "payment_records" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "paymentDueId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "attachments" TEXT[],
    "status" "payment_record_status" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedById" UUID,
    "reviewerNotes" TEXT,
    "transactionId" UUID,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_transactionId_key" ON "payment_records"("transactionId");

-- CreateIndex
CREATE INDEX "payment_records_subscriptionId_idx" ON "payment_records"("subscriptionId");

-- CreateIndex
CREATE INDEX "payment_records_paymentDueId_idx" ON "payment_records"("paymentDueId");

-- CreateIndex
CREATE INDEX "payment_records_submittedById_idx" ON "payment_records"("submittedById");

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_paymentDueId_fkey" FOREIGN KEY ("paymentDueId") REFERENCES "payment_dues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
