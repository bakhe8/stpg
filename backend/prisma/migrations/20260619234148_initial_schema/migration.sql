-- CreateEnum
CREATE TYPE "entity_type" AS ENUM ('FAMILY', 'TRIBE', 'BUILDING', 'NEIGHBORHOOD', 'COMMUNITY', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "member_role" AS ENUM ('FOUNDER', 'ADMIN', 'TREASURER', 'AUDITOR', 'COMMITTEE_MEMBER', 'MEMBER');

-- CreateEnum
CREATE TYPE "governance_path_type" AS ENUM ('BOARD', 'COMMITTEE', 'INDIVIDUAL_WITH_CAP', 'PUBLIC_VOTE', 'DONATION_ONLY', 'EMERGENCY_FAST');

-- CreateEnum
CREATE TYPE "subscription_state" AS ENUM ('INTERESTED', 'CONDITIONAL', 'ACTIVE', 'SUSPENDED', 'EXITED', 'SUPPORTER_ONLY');

-- CreateEnum
CREATE TYPE "transparency_level" AS ENUM ('PUBLIC_TO_MEMBERS', 'VISIBLE_TO_PARTICIPANTS', 'VISIBLE_TO_COMMITTEE', 'VISIBLE_TO_AUDITOR', 'HIDDEN_SENSITIVE', 'AGGREGATED_ONLY');

-- CreateEnum
CREATE TYPE "money_type" AS ENUM ('SUBSCRIPTION', 'DONATION', 'SERVICE_FEE', 'PROJECT_CONTRIBUTION', 'ENTITY_SUPPORT', 'CASE_DONATION');

-- CreateEnum
CREATE TYPE "wallet_benefit_type" AS ENUM ('SEPARABLE', 'SHARED');

-- CreateEnum
CREATE TYPE "subscription_frequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "exit_refund_policy" AS ENUM ('NO_REFUND', 'PARTIAL_REFUND', 'FULL_REFUND');

-- CreateEnum
CREATE TYPE "decision_type" AS ENUM ('CREATE_WALLET', 'CREATE_PATH', 'DISBURSE_FUNDS', 'MODIFY_SUBSCRIPTION', 'MODIFY_GOVERNANCE', 'TRANSFER_BALANCE', 'ACCEPT_MEMBER', 'OPEN_DISPUTE', 'CLOSE_WALLET', 'MERGE_PATHS');

-- CreateEnum
CREATE TYPE "decision_result" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "decision_status" AS ENUM ('OPEN', 'CLOSED', 'APPEALED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "vote_type" AS ENUM ('ONE_MEMBER_ONE_VOTE', 'ONE_FAMILY_ONE_VOTE', 'SUBSCRIBERS_ONLY', 'BY_CONTRIBUTION', 'SIMPLE_MAJORITY', 'TWO_THIRDS', 'SECRET', 'COMMITTEE_APPROVAL', 'INDIVIDUAL_WITH_CAP', 'EMERGENCY_THEN_REVIEW');

-- CreateEnum
CREATE TYPE "vote_choice" AS ENUM ('APPROVE', 'REJECT', 'ABSTAIN');

-- CreateEnum
CREATE TYPE "appeal_type" AS ENUM ('CLARIFICATION_REQUEST', 'APPEAL', 'FORMAL_REVIEW', 'ESCALATION', 'INTERNAL_DISPUTE', 'POLICY_VIOLATION', 'LEGAL_CONCERN');

-- CreateEnum
CREATE TYPE "appeal_status" AS ENUM ('OPEN', 'UNDER_REVIEW', 'CLOSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "entity_relationship_type" AS ENUM ('MEMBERSHIP_OVERLAP', 'FINANCIAL_SUPPORT', 'SHARED_WALLET', 'MANAGEMENT_DELEGATION', 'MERGER', 'CONTRIBUTION_NO_VOTE', 'CONTRIBUTION_WITH_OVERSIGHT', 'REPORT_SHARING');

-- CreateEnum
CREATE TYPE "ledger_account_type" AS ENUM ('ENTITY', 'WALLET', 'PATH', 'SPENDING_ITEM', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ledger_transaction_type" AS ENUM ('SUBSCRIPTION_PAYMENT', 'DONATION', 'SERVICE_FEE', 'PROJECT_CONTRIBUTION', 'DISBURSEMENT', 'TRANSFER', 'ADJUSTMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "ledger_entry_type" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "dispute_type" AS ENUM ('FINANCIAL_MISCONDUCT', 'GOVERNANCE_VIOLATION', 'MEMBER_CONFLICT', 'POLICY_BREACH', 'UNFAIR_DECISION', 'TRANSPARENCY_ISSUE', 'LEGAL_MATTER');

-- CreateEnum
CREATE TYPE "dispute_status" AS ENUM ('OPEN', 'UNDER_MEDIATION', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "rule_target_type" AS ENUM ('ENTITY', 'WALLET', 'PATH', 'SPENDING_ITEM', 'MEMBERSHIP');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'VOTE', 'APPEAL', 'LOGIN', 'LOGOUT');

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "avatarUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "role" "member_role" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_preferences" (
    "id" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "acceptedGovernanceTypes" "governance_path_type"[],
    "maxSpendingCapAccepted" DECIMAL(12,2),
    "requiresAuditAccess" BOOLEAN NOT NULL DEFAULT false,
    "requiresCommitteeApproval" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependents" (
    "id" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dependents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "entity_type" NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "foundedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_policies" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "allowOpenMembership" BOOLEAN NOT NULL DEFAULT false,
    "requiresMemberApproval" BOOLEAN NOT NULL DEFAULT true,
    "allowMultiplePaths" BOOLEAN NOT NULL DEFAULT true,
    "allowSubEntities" BOOLEAN NOT NULL DEFAULT false,
    "allowEntityRelations" BOOLEAN NOT NULL DEFAULT true,
    "allowedGovernanceTypes" "governance_path_type"[],
    "defaultVoteType" "vote_type" NOT NULL DEFAULT 'SIMPLE_MAJORITY',
    "decisionQuorumPercent" INTEGER NOT NULL DEFAULT 50,
    "defaultTransparency" "transparency_level" NOT NULL DEFAULT 'VISIBLE_TO_PARTICIPANTS',
    "allowAppeals" BOOLEAN NOT NULL DEFAULT true,
    "appealTimeoutDays" INTEGER NOT NULL DEFAULT 14,
    "extraRules" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "benefitType" "wallet_benefit_type" NOT NULL DEFAULT 'SEPARABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_policies" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "subscriptionAmount" DECIMAL(12,2),
    "subscriptionFrequency" "subscription_frequency" NOT NULL DEFAULT 'MONTHLY',
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 30,
    "minimumActiveMonths" INTEGER NOT NULL DEFAULT 3,
    "maxBenefitPerYear" DECIMAL(12,2),
    "exitNoticeDays" INTEGER NOT NULL DEFAULT 30,
    "exitRefundPolicy" "exit_refund_policy" NOT NULL DEFAULT 'NO_REFUND',
    "balanceTransparency" "transparency_level" NOT NULL DEFAULT 'VISIBLE_TO_PARTICIPANTS',
    "transactionTransparency" "transparency_level" NOT NULL DEFAULT 'VISIBLE_TO_PARTICIPANTS',
    "beneficiaryTransparency" "transparency_level" NOT NULL DEFAULT 'VISIBLE_TO_COMMITTEE',
    "extraRules" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_paths" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "governance_path_type" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "governance_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "path_policies" (
    "id" UUID NOT NULL,
    "governancePathId" UUID NOT NULL,
    "voteType" "vote_type" NOT NULL,
    "individualSpendingCap" DECIMAL(12,2),
    "requiresDocuments" BOOLEAN NOT NULL DEFAULT true,
    "quorumPercent" INTEGER NOT NULL DEFAULT 50,
    "approvalPercent" INTEGER NOT NULL DEFAULT 51,
    "votingDurationHours" INTEGER NOT NULL DEFAULT 72,
    "allowAppeals" BOOLEAN NOT NULL DEFAULT true,
    "appealWindowDays" INTEGER NOT NULL DEFAULT 7,
    "allowBalanceTransfer" BOOLEAN NOT NULL DEFAULT false,
    "extraRules" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "path_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spending_items" (
    "id" UUID NOT NULL,
    "governancePathId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "eligibilityCriteria" JSONB,
    "requiredDocuments" TEXT[],
    "maxAmountPerRequest" DECIMAL(12,2),
    "maxAmountPerYear" DECIMAL(12,2),
    "privacyLevel" "transparency_level" NOT NULL DEFAULT 'VISIBLE_TO_PARTICIPANTS',
    "requiresCommitteeApproval" BOOLEAN NOT NULL DEFAULT false,
    "allowsException" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spending_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "governancePathId" UUID NOT NULL,
    "state" "subscription_state" NOT NULL DEFAULT 'INTERESTED',
    "policySnapshot" JSONB NOT NULL,
    "interestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "exitedAt" TIMESTAMP(3),
    "agreedAmount" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_relationships" (
    "id" UUID NOT NULL,
    "sourceEntityId" UUID NOT NULL,
    "targetEntityId" UUID NOT NULL,
    "type" "entity_relationship_type" NOT NULL,
    "terms" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_relationships" (
    "id" UUID NOT NULL,
    "sourceWalletId" UUID NOT NULL,
    "targetWalletId" UUID NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "contributionPercent" DECIMAL(5,2),
    "hasVotingRights" BOOLEAN NOT NULL DEFAULT false,
    "hasOversightRights" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" UUID NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" UUID NOT NULL,
    "decisionType" "decision_type" NOT NULL,
    "governancePathId" UUID,
    "spendingItemId" UUID,
    "createdById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2),
    "voteType" "vote_type" NOT NULL,
    "votersScope" TEXT NOT NULL,
    "quorumPercent" INTEGER NOT NULL DEFAULT 50,
    "approvalPercent" INTEGER NOT NULL DEFAULT 51,
    "result" "decision_result" NOT NULL DEFAULT 'PENDING',
    "status" "decision_status" NOT NULL DEFAULT 'OPEN',
    "opensAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "attachments" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" UUID NOT NULL,
    "decisionId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "choice" "vote_choice" NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "notes" TEXT,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeals" (
    "id" UUID NOT NULL,
    "decisionId" UUID NOT NULL,
    "appealedById" UUID NOT NULL,
    "type" "appeal_type" NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" TEXT[],
    "requestedAction" TEXT,
    "reviewerId" UUID,
    "reviewerNotes" TEXT,
    "status" "appeal_status" NOT NULL DEFAULT 'OPEN',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseDeadline" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "initiatorId" UUID NOT NULL,
    "respondentId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "dispute_type" NOT NULL,
    "evidence" TEXT[],
    "arbitratorId" UUID,
    "arbitratorNotes" TEXT,
    "resolution" TEXT,
    "status" "dispute_status" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "linkedAppealId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_accounts" (
    "id" UUID NOT NULL,
    "type" "ledger_account_type" NOT NULL,
    "entityId" UUID,
    "walletId" UUID,
    "governancePathId" UUID,
    "spendingItemId" UUID,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_transactions" (
    "id" UUID NOT NULL,
    "type" "ledger_transaction_type" NOT NULL,
    "moneyType" "money_type" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "decisionId" UUID,
    "approvedById" UUID,
    "reversedTransactionId" UUID,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "type" "ledger_entry_type" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_snapshots" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL,
    "period" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "entityId" UUID,
    "privacyLevel" "transparency_level" NOT NULL DEFAULT 'VISIBLE_TO_COMMITTEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "action" "audit_action" NOT NULL,
    "personId" UUID,
    "entityId" UUID,
    "targetType" TEXT NOT NULL,
    "targetId" UUID NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" UUID,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules" (
    "id" UUID NOT NULL,
    "targetType" "rule_target_type" NOT NULL,
    "targetId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" TEXT NOT NULL,
    "ruleData" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_versions" (
    "id" UUID NOT NULL,
    "entityPolicyId" UUID,
    "walletPolicyId" UUID,
    "pathPolicyId" UUID,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedById" UUID NOT NULL,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "persons_username_key" ON "persons"("username");

-- CreateIndex
CREATE UNIQUE INDEX "persons_phoneNumber_key" ON "persons"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_personId_idx" ON "refresh_tokens"("personId");

-- CreateIndex
CREATE INDEX "otp_codes_phoneNumber_idx" ON "otp_codes"("phoneNumber");

-- CreateIndex
CREATE INDEX "memberships_personId_idx" ON "memberships"("personId");

-- CreateIndex
CREATE INDEX "memberships_entityId_idx" ON "memberships"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_personId_entityId_key" ON "memberships"("personId", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "member_preferences_membershipId_key" ON "member_preferences"("membershipId");

-- CreateIndex
CREATE INDEX "dependents_membershipId_idx" ON "dependents"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "entity_policies_entityId_key" ON "entity_policies"("entityId");

-- CreateIndex
CREATE INDEX "wallets_entityId_idx" ON "wallets"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_policies_walletId_key" ON "wallet_policies"("walletId");

-- CreateIndex
CREATE INDEX "governance_paths_walletId_idx" ON "governance_paths"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "path_policies_governancePathId_key" ON "path_policies"("governancePathId");

-- CreateIndex
CREATE INDEX "spending_items_governancePathId_idx" ON "spending_items"("governancePathId");

-- CreateIndex
CREATE INDEX "subscriptions_governancePathId_idx" ON "subscriptions"("governancePathId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_membershipId_governancePathId_key" ON "subscriptions"("membershipId", "governancePathId");

-- CreateIndex
CREATE INDEX "entity_relationships_sourceEntityId_idx" ON "entity_relationships"("sourceEntityId");

-- CreateIndex
CREATE INDEX "entity_relationships_targetEntityId_idx" ON "entity_relationships"("targetEntityId");

-- CreateIndex
CREATE INDEX "decisions_governancePathId_idx" ON "decisions"("governancePathId");

-- CreateIndex
CREATE INDEX "decisions_subjectType_subjectId_idx" ON "decisions"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "votes_decisionId_idx" ON "votes"("decisionId");

-- CreateIndex
CREATE UNIQUE INDEX "votes_decisionId_personId_key" ON "votes"("decisionId", "personId");

-- CreateIndex
CREATE INDEX "appeals_decisionId_idx" ON "appeals"("decisionId");

-- CreateIndex
CREATE INDEX "appeals_appealedById_idx" ON "appeals"("appealedById");

-- CreateIndex
CREATE INDEX "disputes_entityId_idx" ON "disputes"("entityId");

-- CreateIndex
CREATE INDEX "disputes_initiatorId_idx" ON "disputes"("initiatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_entityId_key" ON "ledger_accounts"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_walletId_key" ON "ledger_accounts"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_governancePathId_key" ON "ledger_accounts"("governancePathId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_spendingItemId_key" ON "ledger_accounts"("spendingItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_reversedTransactionId_key" ON "ledger_transactions"("reversedTransactionId");

-- CreateIndex
CREATE INDEX "ledger_transactions_decisionId_idx" ON "ledger_transactions"("decisionId");

-- CreateIndex
CREATE INDEX "ledger_entries_transactionId_idx" ON "ledger_entries"("transactionId");

-- CreateIndex
CREATE INDEX "ledger_entries_accountId_idx" ON "ledger_entries"("accountId");

-- CreateIndex
CREATE INDEX "balance_snapshots_accountId_period_idx" ON "balance_snapshots"("accountId", "period");

-- CreateIndex
CREATE INDEX "documents_entityId_idx" ON "documents"("entityId");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_logs_personId_idx" ON "audit_logs"("personId");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "notifications_personId_isRead_idx" ON "notifications"("personId", "isRead");

-- CreateIndex
CREATE INDEX "rules_targetType_targetId_idx" ON "rules"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "policy_versions_entityPolicyId_idx" ON "policy_versions"("entityPolicyId");

-- CreateIndex
CREATE INDEX "policy_versions_walletPolicyId_idx" ON "policy_versions"("walletPolicyId");

-- CreateIndex
CREATE INDEX "policy_versions_pathPolicyId_idx" ON "policy_versions"("pathPolicyId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_preferences" ADD CONSTRAINT "member_preferences_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependents" ADD CONSTRAINT "dependents_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_policies" ADD CONSTRAINT "entity_policies_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_policies" ADD CONSTRAINT "wallet_policies_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_paths" ADD CONSTRAINT "governance_paths_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path_policies" ADD CONSTRAINT "path_policies_governancePathId_fkey" FOREIGN KEY ("governancePathId") REFERENCES "governance_paths"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_items" ADD CONSTRAINT "spending_items_governancePathId_fkey" FOREIGN KEY ("governancePathId") REFERENCES "governance_paths"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_governancePathId_fkey" FOREIGN KEY ("governancePathId") REFERENCES "governance_paths"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_targetEntityId_fkey" FOREIGN KEY ("targetEntityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_relationships" ADD CONSTRAINT "wallet_relationships_sourceWalletId_fkey" FOREIGN KEY ("sourceWalletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_relationships" ADD CONSTRAINT "wallet_relationships_targetWalletId_fkey" FOREIGN KEY ("targetWalletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_governancePathId_fkey" FOREIGN KEY ("governancePathId") REFERENCES "governance_paths"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_spendingItemId_fkey" FOREIGN KEY ("spendingItemId") REFERENCES "spending_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_appealedById_fkey" FOREIGN KEY ("appealedById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_governancePathId_fkey" FOREIGN KEY ("governancePathId") REFERENCES "governance_paths"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_spendingItemId_fkey" FOREIGN KEY ("spendingItemId") REFERENCES "spending_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_entityPolicyId_fkey" FOREIGN KEY ("entityPolicyId") REFERENCES "entity_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_walletPolicyId_fkey" FOREIGN KEY ("walletPolicyId") REFERENCES "wallet_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_pathPolicyId_fkey" FOREIGN KEY ("pathPolicyId") REFERENCES "path_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
