-- CreateEnum
CREATE TYPE "decision_execution_status" AS ENUM ('NOT_STARTED', 'PARTIAL', 'COMPLETED', 'REVERSED', 'FAILED');

-- AlterTable
ALTER TABLE "decisions"
ADD COLUMN     "executionStatus" "decision_execution_status" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "executionUpdatedAt" TIMESTAMP(3);
