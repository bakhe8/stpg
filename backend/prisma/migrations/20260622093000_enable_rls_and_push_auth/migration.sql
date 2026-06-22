/*
  Warnings:

  - You are about to drop the `otp_codes` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "invitations" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "token" DROP DEFAULT;

-- DropTable
DROP TABLE "otp_codes";

-- CreateTable
CREATE TABLE "platform_suspension_appeals" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_suspension_appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "deviceOs" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_suspension_appeals_entityId_idx" ON "platform_suspension_appeals"("entityId");

-- CreateIndex
CREATE INDEX "platform_suspension_appeals_status_idx" ON "platform_suspension_appeals"("status");

-- CreateIndex
CREATE INDEX "oauth_accounts_personId_idx" ON "oauth_accounts"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_providerId_key" ON "oauth_accounts"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_personId_idx" ON "device_tokens"("personId");

-- AddForeignKey
ALTER TABLE "platform_suspension_appeals" ADD CONSTRAINT "platform_suspension_appeals_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS (Row Level Security) Implementation

ALTER TABLE "entities" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "entities"
    AS PERMISSIVE FOR ALL
    USING (
        current_setting('app.current_entity_id', true) IS NULL OR
        current_setting('app.current_entity_id', true) = '' OR
        "id"::text = current_setting('app.current_entity_id', true)
    );

ALTER TABLE "wallets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "wallets"
    AS PERMISSIVE FOR ALL
    USING (
        current_setting('app.current_entity_id', true) IS NULL OR
        current_setting('app.current_entity_id', true) = '' OR
        "entityId"::text = current_setting('app.current_entity_id', true)
    );

ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "memberships"
    AS PERMISSIVE FOR ALL
    USING (
        current_setting('app.current_entity_id', true) IS NULL OR
        current_setting('app.current_entity_id', true) = '' OR
        "entityId"::text = current_setting('app.current_entity_id', true)
    );

ALTER TABLE "membership_applications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "membership_applications"
    AS PERMISSIVE FOR ALL
    USING (
        current_setting('app.current_entity_id', true) IS NULL OR
        current_setting('app.current_entity_id', true) = '' OR
        "entityId"::text = current_setting('app.current_entity_id', true)
    );