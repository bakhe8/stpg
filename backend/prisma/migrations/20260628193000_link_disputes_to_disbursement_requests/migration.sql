-- Link formal disputes directly to the disbursement request that triggered them.
-- This keeps the decision -> disbursement request -> dispute timeline queryable instead of relying on free-text descriptions.
ALTER TABLE "disputes" ADD COLUMN "disbursementRequestId" UUID;

CREATE INDEX "disputes_disbursementRequestId_idx" ON "disputes"("disbursementRequestId");

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_disbursementRequestId_fkey"
  FOREIGN KEY ("disbursementRequestId")
  REFERENCES "disbursement_requests"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
