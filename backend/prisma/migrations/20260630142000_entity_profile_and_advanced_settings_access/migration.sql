-- Phase C preflight:
-- keep Entity.type as legacy/coarse data, add optional user-facing profile,
-- and add a narrow advanced-settings delegation flag on memberships.

ALTER TABLE "memberships"
  ADD COLUMN "canManageAdvancedSettings" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "entities"
  ADD COLUMN "profileKey" TEXT,
  ADD COLUMN "profileLabel" TEXT;

CREATE INDEX "entities_profileKey_idx" ON "entities"("profileKey");
