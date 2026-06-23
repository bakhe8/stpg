-- Migration: add_template_modules
-- Adds icon, isActive, sortOrder, enabledModules, suggestedGoals to EntityTemplate
-- Adds templateId, enabledModules to Entity

-- 1. Rename entity_templates table if it exists under wrong name (safety)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='entity_templates') THEN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='EntityTemplate') THEN
      ALTER TABLE "EntityTemplate" RENAME TO entity_templates;
    END IF;
  END IF;
END $$;

-- 2. Add new columns to entity_templates
ALTER TABLE "entity_templates"
  ADD COLUMN IF NOT EXISTS "icon"            TEXT,
  ADD COLUMN IF NOT EXISTS "isActive"        BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "sortOrder"       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "enabledModules"  JSONB,
  ADD COLUMN IF NOT EXISTS "suggestedGoals"  JSONB;

-- 3. Add templateId and enabledModules to entities
ALTER TABLE "entities"
  ADD COLUMN IF NOT EXISTS "templateId"      UUID,
  ADD COLUMN IF NOT EXISTS "enabledModules"  JSONB;

-- 4. Foreign key: entities.templateId → entity_templates.id (SET NULL on delete)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'entities_templateId_fkey'
      AND table_name = 'entities'
  ) THEN
    ALTER TABLE "entities"
      ADD CONSTRAINT "entities_templateId_fkey"
      FOREIGN KEY ("templateId")
      REFERENCES "entity_templates"("id")
      ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Index on entities.templateId
CREATE INDEX IF NOT EXISTS "entities_templateId_idx" ON "entities"("templateId");
