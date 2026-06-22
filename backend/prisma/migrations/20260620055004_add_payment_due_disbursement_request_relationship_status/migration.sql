-- CreateEnum
CREATE TYPE "payment_due_status" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "disbursement_request_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "relationship_status" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'ENDED');

-- AlterTable
ALTER TABLE "decisions" ADD COLUMN     "relatedDecisionId" UUID;

-- AlterTable
ALTER TABLE "entity_relationships" ADD COLUMN     "approvalStatus" "relationship_status" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" UUID,
ALTER COLUMN "isActive" SET DEFAULT false;

-- CreateTable
CREATE TABLE "payment_dues" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "status" "payment_due_status" NOT NULL DEFAULT 'PENDING',
    "settledAt" TIMESTAMP(3),
    "transactionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_dues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disbursement_requests" (
    "id" UUID NOT NULL,
    "governancePathId" UUID NOT NULL,
    "spendingItemId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "beneficiaryName" TEXT NOT NULL,
    "beneficiaryNotes" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "attachments" TEXT[],
    "status" "disbursement_request_status" NOT NULL DEFAULT 'PENDING',
    "reviewedById" UUID,
    "reviewerNotes" TEXT,
    "decisionId" UUID,
    "transactionId" UUID,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disbursement_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_dues_subscriptionId_idx" ON "payment_dues"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_dues_subscriptionId_periodLabel_key" ON "payment_dues"("subscriptionId", "periodLabel");

-- CreateIndex
CREATE UNIQUE INDEX "disbursement_requests_transactionId_key" ON "disbursement_requests"("transactionId");

-- CreateIndex
CREATE INDEX "disbursement_requests_governancePathId_idx" ON "disbursement_requests"("governancePathId");

-- CreateIndex
CREATE INDEX "disbursement_requests_requestedById_idx" ON "disbursement_requests"("requestedById");

-- AddForeignKey
ALTER TABLE "payment_dues" ADD CONSTRAINT "payment_dues_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursement_requests" ADD CONSTRAINT "disbursement_requests_governancePathId_fkey" FOREIGN KEY ("governancePathId") REFERENCES "governance_paths"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursement_requests" ADD CONSTRAINT "disbursement_requests_spendingItemId_fkey" FOREIGN KEY ("spendingItemId") REFERENCES "spending_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
