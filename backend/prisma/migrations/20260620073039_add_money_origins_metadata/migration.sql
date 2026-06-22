-- CreateEnum
CREATE TYPE "money_origin_kind" AS ENUM ('UNSPECIFIED', 'SUBSCRIPTION_PAYMENT', 'PATH_DISBURSEMENT', 'PATH_TRANSFER', 'REVERSAL', 'MANUAL_ADJUSTMENT');

-- AlterTable
ALTER TABLE "ledger_transactions" ADD COLUMN     "originEntityId" UUID,
ADD COLUMN     "originGovernancePathId" UUID,
ADD COLUMN     "originKind" "money_origin_kind" NOT NULL DEFAULT 'UNSPECIFIED',
ADD COLUMN     "originMembershipId" UUID,
ADD COLUMN     "originNote" TEXT,
ADD COLUMN     "originPersonId" UUID,
ADD COLUMN     "originWalletId" UUID;

-- CreateIndex
CREATE INDEX "ledger_transactions_originEntityId_idx" ON "ledger_transactions"("originEntityId");

-- CreateIndex
CREATE INDEX "ledger_transactions_originMembershipId_idx" ON "ledger_transactions"("originMembershipId");

-- CreateIndex
CREATE INDEX "ledger_transactions_originPersonId_idx" ON "ledger_transactions"("originPersonId");
