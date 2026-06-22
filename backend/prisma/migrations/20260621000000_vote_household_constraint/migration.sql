-- AlterTable: Add householdId to votes for ONE_FAMILY_ONE_VOTE constraint
ALTER TABLE "votes"
ADD COLUMN IF NOT EXISTS "householdId" UUID;

-- CreateIndex: Unique constraint to prevent multiple votes from the same household
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vote_decision_household_unique'
  ) THEN
    CREATE UNIQUE INDEX "vote_decision_household_unique" ON "votes"("decisionId", "householdId");
  END IF;
END
$$;

-- AddForeignKey: Link householdId to households table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'votes_householdId_fkey'
  ) THEN
    ALTER TABLE "votes"
    ADD CONSTRAINT "votes_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "households"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- Add EntityTemplate table if not exists
CREATE TABLE IF NOT EXISTS "EntityTemplate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "type" "entity_type" NOT NULL,
  "description" TEXT,
  "defaultPolicy" JSONB,
  "defaultWallets" JSONB,
  "defaultPaths" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EntityTemplate_pkey" PRIMARY KEY ("id")
);

-- Add EXPEL_MEMBER to decision_type enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'EXPEL_MEMBER'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'decision_type')
  ) THEN
    ALTER TYPE "decision_type" ADD VALUE 'EXPEL_MEMBER';
  END IF;
END
$$;

-- Add FREEZE_WALLET to decision_type enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'FREEZE_WALLET'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'decision_type')
  ) THEN
    ALTER TYPE "decision_type" ADD VALUE 'FREEZE_WALLET';
  END IF;
END
$$;

-- Add CAMPAIGN_EXPIRED to notification_type enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'CAMPAIGN_EXPIRED'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE "notification_type" ADD VALUE 'CAMPAIGN_EXPIRED';
  END IF;
END
$$;
