-- CreateEnum
CREATE TYPE "beneficiary_type" AS ENUM ('MEMBER', 'DEPENDENT', 'EXTERNAL');

-- CreateTable
CREATE TABLE "beneficiaries" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "type" "beneficiary_type" NOT NULL DEFAULT 'EXTERNAL',
    "membershipId" UUID,
    "dependentId" UUID,
    "displayName" TEXT NOT NULL,
    "notes" TEXT,
    "annualCap" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

-- Seed dependent-backed beneficiaries so existing request links stay valid.
INSERT INTO "beneficiaries" (
    "id",
    "entityId",
    "type",
    "dependentId",
    "displayName",
    "notes",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    d."id",
    m."entityId",
    'DEPENDENT'::"beneficiary_type",
    d."id",
    d."name",
    d."notes",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "dependents" d
JOIN "memberships" m ON m."id" = d."membershipId";

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_membershipId_key" ON "beneficiaries"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_dependentId_key" ON "beneficiaries"("dependentId");

-- CreateIndex
CREATE INDEX "beneficiaries_entityId_idx" ON "beneficiaries"("entityId");

-- CreateIndex
CREATE INDEX "beneficiaries_membershipId_idx" ON "beneficiaries"("membershipId");

-- CreateIndex
CREATE INDEX "beneficiaries_dependentId_idx" ON "beneficiaries"("dependentId");

-- DropForeignKey
ALTER TABLE "disbursement_requests" DROP CONSTRAINT "disbursement_requests_beneficiaryId_fkey";

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "dependents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursement_requests" ADD CONSTRAINT "disbursement_requests_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
