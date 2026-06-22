ALTER TABLE "entities"
ADD COLUMN "bankAccountNumber" TEXT,
ADD COLUMN "bankName" TEXT;

CREATE TYPE "support_session_status" AS ENUM (
  'ACTIVE',
  'REVOKED',
  'EXPIRED'
);

CREATE TABLE "support_sessions" (
  "id" UUID NOT NULL,
  "entityId" UUID NOT NULL,
  "platformAccountId" UUID NOT NULL,
  "status" "support_session_status" NOT NULL DEFAULT 'ACTIVE',
  "scope" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "support_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_sessions_entityId_idx"
ON "support_sessions"("entityId");

CREATE INDEX "support_sessions_platformAccountId_idx"
ON "support_sessions"("platformAccountId");

ALTER TABLE "support_sessions"
ADD CONSTRAINT "support_sessions_entityId_fkey"
FOREIGN KEY ("entityId") REFERENCES "entities"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "support_sessions"
ADD CONSTRAINT "support_sessions_platformAccountId_fkey"
FOREIGN KEY ("platformAccountId") REFERENCES "platform_accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
