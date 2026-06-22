-- AlterEnum
ALTER TYPE "ledger_transaction_type" ADD VALUE 'ENTITY_SUPPORT';

-- AlterTable
ALTER TABLE "EntityTemplate" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "wallet_ownerships" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "sharePercent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_ownerships_walletId_idx" ON "wallet_ownerships"("walletId");

-- CreateIndex
CREATE INDEX "wallet_ownerships_entityId_idx" ON "wallet_ownerships"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_ownerships_walletId_entityId_key" ON "wallet_ownerships"("walletId", "entityId");

-- AddForeignKey
ALTER TABLE "wallet_ownerships" ADD CONSTRAINT "wallet_ownerships_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ownerships" ADD CONSTRAINT "wallet_ownerships_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
