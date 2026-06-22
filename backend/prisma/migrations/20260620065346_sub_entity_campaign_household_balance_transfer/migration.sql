-- CreateEnum
CREATE TYPE "balance_transfer_request_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "appeals" ADD COLUMN     "policyVersionId" UUID;

-- AlterTable
ALTER TABLE "disputes" ADD COLUMN     "policyVersionId" UUID;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "appealId" UUID,
ADD COLUMN     "decisionId" UUID,
ADD COLUMN     "disbursementRequestId" UUID,
ADD COLUMN     "disputeId" UUID,
ADD COLUMN     "governancePathId" UUID,
ADD COLUMN     "walletId" UUID;

-- AlterTable
ALTER TABLE "entities" ADD COLUMN     "campaignEndsAt" TIMESTAMP(3),
ADD COLUMN     "isCampaign" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentEntityId" UUID;

-- AlterTable
ALTER TABLE "ledger_transactions" ADD COLUMN     "sourceEntityId" UUID,
ADD COLUMN     "sourceMembershipId" UUID;

-- CreateTable
CREATE TABLE "households" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_memberships" (
    "householdId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,

    CONSTRAINT "household_memberships_pkey" PRIMARY KEY ("householdId","membershipId")
);

-- CreateTable
CREATE TABLE "balance_transfer_requests" (
    "id" UUID NOT NULL,
    "fromPathId" UUID NOT NULL,
    "toPathId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "balance_transfer_request_status" NOT NULL DEFAULT 'PENDING',
    "requestedById" UUID NOT NULL,
    "decisionId" UUID,
    "transactionId" UUID,
    "reviewerNotes" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balance_transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "households_entityId_idx" ON "households"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "household_memberships_membershipId_key" ON "household_memberships"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "balance_transfer_requests_transactionId_key" ON "balance_transfer_requests"("transactionId");

-- CreateIndex
CREATE INDEX "balance_transfer_requests_fromPathId_idx" ON "balance_transfer_requests"("fromPathId");

-- CreateIndex
CREATE INDEX "balance_transfer_requests_toPathId_idx" ON "balance_transfer_requests"("toPathId");

-- CreateIndex
CREATE INDEX "appeals_policyVersionId_idx" ON "appeals"("policyVersionId");

-- CreateIndex
CREATE INDEX "disputes_policyVersionId_idx" ON "disputes"("policyVersionId");

-- CreateIndex
CREATE INDEX "documents_uploadedById_idx" ON "documents"("uploadedById");

-- CreateIndex
CREATE INDEX "documents_walletId_idx" ON "documents"("walletId");

-- CreateIndex
CREATE INDEX "documents_governancePathId_idx" ON "documents"("governancePathId");

-- CreateIndex
CREATE INDEX "documents_decisionId_idx" ON "documents"("decisionId");

-- CreateIndex
CREATE INDEX "documents_disbursementRequestId_idx" ON "documents"("disbursementRequestId");

-- CreateIndex
CREATE INDEX "documents_appealId_idx" ON "documents"("appealId");

-- CreateIndex
CREATE INDEX "documents_disputeId_idx" ON "documents"("disputeId");

-- CreateIndex
CREATE INDEX "entities_parentEntityId_idx" ON "entities"("parentEntityId");

-- CreateIndex
CREATE INDEX "ledger_transactions_sourceEntityId_idx" ON "ledger_transactions"("sourceEntityId");

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_parentEntityId_fkey" FOREIGN KEY ("parentEntityId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_governancePathId_fkey" FOREIGN KEY ("governancePathId") REFERENCES "governance_paths"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_disbursementRequestId_fkey" FOREIGN KEY ("disbursementRequestId") REFERENCES "disbursement_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_transfer_requests" ADD CONSTRAINT "balance_transfer_requests_fromPathId_fkey" FOREIGN KEY ("fromPathId") REFERENCES "governance_paths"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_transfer_requests" ADD CONSTRAINT "balance_transfer_requests_toPathId_fkey" FOREIGN KEY ("toPathId") REFERENCES "governance_paths"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_transfer_requests" ADD CONSTRAINT "balance_transfer_requests_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
