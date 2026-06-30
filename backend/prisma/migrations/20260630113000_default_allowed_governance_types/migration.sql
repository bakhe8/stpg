UPDATE "entity_policies"
SET "allowedGovernanceTypes" = ARRAY[]::governance_path_type[]
WHERE "allowedGovernanceTypes" IS NULL;

ALTER TABLE "entity_policies"
ALTER COLUMN "allowedGovernanceTypes"
SET DEFAULT ARRAY[]::governance_path_type[];

ALTER TABLE "entity_policies"
ALTER COLUMN "allowedGovernanceTypes"
SET NOT NULL;
