-- AlterTable
ALTER TABLE "disbursement_requests" ADD COLUMN     "beneficiaryId" UUID;

-- AlterTable
ALTER TABLE "governance_paths" ADD COLUMN     "committeeId" UUID;

-- CreateTable
CREATE TABLE "committees" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "committees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_memberships" (
    "committeeId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,

    CONSTRAINT "committee_memberships_pkey" PRIMARY KEY ("committeeId","membershipId")
);

-- CreateIndex
CREATE INDEX "committees_entityId_idx" ON "committees"("entityId");

-- CreateIndex
CREATE INDEX "disbursement_requests_beneficiaryId_idx" ON "disbursement_requests"("beneficiaryId");

-- CreateIndex
CREATE INDEX "governance_paths_committeeId_idx" ON "governance_paths"("committeeId");

-- AddForeignKey
ALTER TABLE "governance_paths" ADD CONSTRAINT "governance_paths_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursement_requests" ADD CONSTRAINT "disbursement_requests_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "dependents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committees" ADD CONSTRAINT "committees_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_memberships" ADD CONSTRAINT "committee_memberships_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_memberships" ADD CONSTRAINT "committee_memberships_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
