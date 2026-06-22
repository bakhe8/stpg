-- CreateEnum
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'MEMBERSHIP_APPLICATION_APPROVED';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'MEMBERSHIP_APPLICATION_REJECTED';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'PLATFORM_ACCESS';

CREATE TYPE "membership_application_status" AS ENUM (
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

-- CreateTable
CREATE TABLE "membership_applications" (
  "id" UUID NOT NULL,
  "personId" UUID NOT NULL,
  "entityId" UUID NOT NULL,
  "invitationId" UUID,
  "status" "membership_application_status" NOT NULL DEFAULT 'PENDING',
  "requestedRole" "member_role" NOT NULL DEFAULT 'MEMBER',
  "relationshipDescription" TEXT,
  "sponsorName" TEXT,
  "note" TEXT,
  "reviewedById" UUID,
  "reviewerNotes" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "membership_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membership_applications_personId_entityId_key"
  ON "membership_applications"("personId", "entityId");

CREATE INDEX "membership_applications_entityId_status_idx"
  ON "membership_applications"("entityId", "status");

CREATE INDEX "membership_applications_personId_status_idx"
  ON "membership_applications"("personId", "status");

-- AddForeignKey
ALTER TABLE "membership_applications"
  ADD CONSTRAINT "membership_applications_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "persons"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "membership_applications"
  ADD CONSTRAINT "membership_applications_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "entities"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "membership_applications"
  ADD CONSTRAINT "membership_applications_invitationId_fkey"
  FOREIGN KEY ("invitationId") REFERENCES "invitations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "membership_applications"
  ADD CONSTRAINT "membership_applications_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "persons"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
