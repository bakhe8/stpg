-- AlterTable
ALTER TABLE "appeals"
ADD COLUMN IF NOT EXISTS "policyVersionId" UUID;

-- AlterTable
ALTER TABLE "disputes"
ADD COLUMN IF NOT EXISTS "policyVersionId" UUID;

-- AlterTable
ALTER TABLE "documents"
ADD COLUMN IF NOT EXISTS "walletId" UUID,
ADD COLUMN IF NOT EXISTS "governancePathId" UUID,
ADD COLUMN IF NOT EXISTS "decisionId" UUID,
ADD COLUMN IF NOT EXISTS "disbursementRequestId" UUID,
ADD COLUMN IF NOT EXISTS "appealId" UUID,
ADD COLUMN IF NOT EXISTS "disputeId" UUID;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "appeals_policyVersionId_idx" ON "appeals"("policyVersionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "disputes_policyVersionId_idx" ON "disputes"("policyVersionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documents_uploadedById_idx" ON "documents"("uploadedById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documents_walletId_idx" ON "documents"("walletId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documents_governancePathId_idx" ON "documents"("governancePathId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documents_decisionId_idx" ON "documents"("decisionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documents_disbursementRequestId_idx" ON "documents"("disbursementRequestId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documents_appealId_idx" ON "documents"("appealId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documents_disputeId_idx" ON "documents"("disputeId");

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'appeals_policyVersionId_fkey'
	) THEN
		ALTER TABLE "appeals"
		ADD CONSTRAINT "appeals_policyVersionId_fkey"
		FOREIGN KEY ("policyVersionId") REFERENCES "policy_versions"("id")
		ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'disputes_policyVersionId_fkey'
	) THEN
		ALTER TABLE "disputes"
		ADD CONSTRAINT "disputes_policyVersionId_fkey"
		FOREIGN KEY ("policyVersionId") REFERENCES "policy_versions"("id")
		ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'documents_uploadedById_fkey'
	) THEN
		ALTER TABLE "documents"
		ADD CONSTRAINT "documents_uploadedById_fkey"
		FOREIGN KEY ("uploadedById") REFERENCES "persons"("id")
		ON DELETE RESTRICT ON UPDATE CASCADE;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'documents_entityId_fkey'
	) THEN
		ALTER TABLE "documents"
		ADD CONSTRAINT "documents_entityId_fkey"
		FOREIGN KEY ("entityId") REFERENCES "entities"("id")
		ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'documents_walletId_fkey'
	) THEN
		ALTER TABLE "documents"
		ADD CONSTRAINT "documents_walletId_fkey"
		FOREIGN KEY ("walletId") REFERENCES "wallets"("id")
		ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'documents_governancePathId_fkey'
	) THEN
		ALTER TABLE "documents"
		ADD CONSTRAINT "documents_governancePathId_fkey"
		FOREIGN KEY ("governancePathId") REFERENCES "governance_paths"("id")
		ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'documents_decisionId_fkey'
	) THEN
		ALTER TABLE "documents"
		ADD CONSTRAINT "documents_decisionId_fkey"
		FOREIGN KEY ("decisionId") REFERENCES "decisions"("id")
		ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'documents_disbursementRequestId_fkey'
	) THEN
		ALTER TABLE "documents"
		ADD CONSTRAINT "documents_disbursementRequestId_fkey"
		FOREIGN KEY ("disbursementRequestId") REFERENCES "disbursement_requests"("id")
		ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'documents_appealId_fkey'
	) THEN
		ALTER TABLE "documents"
		ADD CONSTRAINT "documents_appealId_fkey"
		FOREIGN KEY ("appealId") REFERENCES "appeals"("id")
		ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'documents_disputeId_fkey'
	) THEN
		ALTER TABLE "documents"
		ADD CONSTRAINT "documents_disputeId_fkey"
		FOREIGN KEY ("disputeId") REFERENCES "disputes"("id")
		ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END
$$;
