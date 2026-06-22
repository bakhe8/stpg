-- AlterTable
ALTER TABLE "wallet_relationships" ADD COLUMN     "approvalStatus" "relationship_status" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" UUID,
ALTER COLUMN "isActive" SET DEFAULT false;
