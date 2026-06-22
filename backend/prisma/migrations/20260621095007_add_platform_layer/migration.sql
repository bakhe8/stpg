-- CreateEnum
CREATE TYPE "platform_role" AS ENUM ('OWNER', 'SUPER_ADMIN', 'SUPPORT', 'ANALYST');

-- CreateEnum
CREATE TYPE "platform_access_type" AS ENUM ('READ', 'SUPPORT', 'ADMIN_ACTION', 'BREAK_GLASS');

-- CreateEnum
CREATE TYPE "entity_platform_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'READ_ONLY', 'PENDING_REVIEW');

-- AlterTable
ALTER TABLE "entities" ADD COLUMN     "platformStatus" "entity_platform_status" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedReason" TEXT;



-- CreateTable
CREATE TABLE "platform_accounts" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "platform_role" NOT NULL DEFAULT 'SUPPORT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_access_logs" (
    "id" UUID NOT NULL,
    "platformAccountId" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "accessType" "platform_access_type" NOT NULL,
    "dataScope" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "notifiedEntityAdmin" BOOLEAN NOT NULL DEFAULT false,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "platform_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_accounts_email_key" ON "platform_accounts"("email");

-- CreateIndex
CREATE INDEX "platform_access_logs_entityId_idx" ON "platform_access_logs"("entityId");

-- CreateIndex
CREATE INDEX "platform_access_logs_platformAccountId_idx" ON "platform_access_logs"("platformAccountId");

-- AddForeignKey
ALTER TABLE "platform_access_logs" ADD CONSTRAINT "platform_access_logs_platformAccountId_fkey" FOREIGN KEY ("platformAccountId") REFERENCES "platform_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
