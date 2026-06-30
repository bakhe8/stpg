-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_action" ADD VALUE 'DISBURSE';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER';
ALTER TYPE "audit_action" ADD VALUE 'SUSPEND';
ALTER TYPE "audit_action" ADD VALUE 'REINSTATE';
ALTER TYPE "audit_action" ADD VALUE 'EXPEL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notification_type" ADD VALUE 'DISBURSEMENT_REQUESTED';
ALTER TYPE "notification_type" ADD VALUE 'DISBURSEMENT_APPROVED';
ALTER TYPE "notification_type" ADD VALUE 'DISBURSEMENT_REJECTED';
ALTER TYPE "notification_type" ADD VALUE 'DISBURSEMENT_EXECUTED';

-- DropForeignKey
ALTER TABLE "entities" DROP CONSTRAINT "entities_templateId_fkey";

-- AlterTable
ALTER TABLE "entity_templates" RENAME CONSTRAINT "EntityTemplate_pkey" TO "entity_templates_pkey";

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_createdAt_idx" ON "audit_logs"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX "payment_records_paymentDueId_status_idx" ON "payment_records"("paymentDueId", "status");

-- CreateIndex
CREATE INDEX "subscriptions_state_idx" ON "subscriptions"("state");

-- CreateIndex
CREATE INDEX "subscriptions_governancePathId_state_idx" ON "subscriptions"("governancePathId", "state");

-- AddForeignKey
ALTER TABLE "platform_suspension_appeals" ADD CONSTRAINT "platform_suspension_appeals_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "entity_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_arbitratorId_fkey" FOREIGN KEY ("arbitratorId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_snapshots" ADD CONSTRAINT "balance_snapshots_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ledger_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
