-- AlterTable: add optional email field to persons
ALTER TABLE "persons" ADD COLUMN "email" TEXT;
CREATE UNIQUE INDEX "persons_email_key" ON "persons"("email");

-- CreateTable: invitation links for joining entities
CREATE TABLE "invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entityId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");
CREATE INDEX "invitations_entityId_idx" ON "invitations"("entityId");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_entityId_fkey"
    FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invitations" ADD CONSTRAINT "invitations_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
