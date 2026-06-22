/*
  Warnings:

  - The `targetType` column on the `notifications` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `subjectType` on the `decisions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `votersScope` on the `decisions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `notifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `ruleType` on the `rules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `relationshipType` on the `wallet_relationships` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "subject_type" AS ENUM ('ENTITY', 'WALLET', 'PATH', 'SPENDING_ITEM', 'MEMBERSHIP');

-- CreateEnum
CREATE TYPE "voters_scope" AS ENUM ('ALL_MEMBERS', 'PATH_SUBSCRIBERS', 'COMMITTEE');

-- CreateEnum
CREATE TYPE "rule_type" AS ENUM ('SPENDING_LIMIT', 'REQUIRES_DOCUMENTS', 'QUORUM', 'TRANSFER', 'ELIGIBILITY');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('VOTE_REQUIRED', 'PAYMENT_CONFIRMED', 'PAYMENT_DUE', 'APPEAL_UPDATE', 'POLICY_CHANGED', 'GOVERNANCE_CHANGED', 'RELATIONSHIP_REQUEST');

-- CreateEnum
CREATE TYPE "notification_target_type" AS ENUM ('DECISION', 'APPEAL', 'SUBSCRIPTION', 'WALLET', 'GOVERNANCE_PATH', 'ENTITY', 'ENTITY_RELATIONSHIP');

-- CreateEnum
CREATE TYPE "wallet_relationship_type" AS ENUM ('SHARED', 'SUPPORT', 'REPORT_ONLY');

-- AlterTable
ALTER TABLE "decisions" DROP COLUMN "subjectType",
ADD COLUMN     "subjectType" "subject_type" NOT NULL,
DROP COLUMN "votersScope",
ADD COLUMN     "votersScope" "voters_scope" NOT NULL;

-- AlterTable
ALTER TABLE "disputes" ADD COLUMN     "governancePathId" UUID,
ADD COLUMN     "walletId" UUID;

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "type",
ADD COLUMN     "type" "notification_type" NOT NULL,
DROP COLUMN "targetType",
ADD COLUMN     "targetType" "notification_target_type";

-- AlterTable
ALTER TABLE "rules" DROP COLUMN "ruleType",
ADD COLUMN     "ruleType" "rule_type" NOT NULL;

-- AlterTable
ALTER TABLE "wallet_relationships" DROP COLUMN "relationshipType",
ADD COLUMN     "relationshipType" "wallet_relationship_type" NOT NULL;

-- CreateIndex
CREATE INDEX "decisions_subjectType_subjectId_idx" ON "decisions"("subjectType", "subjectId");
