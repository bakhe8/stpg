import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerTransactionType, MoneyType } from '@prisma/client';

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async executeAutomatedTransfer(sourceWalletId: string, targetWalletId: string, amount: number, reason: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    // Execute via transaction to guarantee atomicity
    return this.prisma.$transaction(async (tx) => {
      // 1. Check source wallet balance via LedgerAccount
      const sourceLedger = await tx.ledgerAccount.findUnique({ where: { walletId: sourceWalletId } });
      const targetLedger = await tx.ledgerAccount.findUnique({ where: { walletId: targetWalletId } });

      if (!sourceLedger || !targetLedger) {
        throw new BadRequestException('Invalid wallets or ledger accounts not initialized');
      }

      if (Number(sourceLedger.balance) < amount) {
        throw new BadRequestException('Insufficient funds for automated transfer');
      }

      // 2. Deduct from source, add to target
      await tx.ledgerAccount.update({
        where: { id: sourceLedger.id },
        data: { balance: { decrement: amount } },
      });

      await tx.ledgerAccount.update({
        where: { id: targetLedger.id },
        data: { balance: { increment: amount } },
      });

      // 3. Create Ledger Transaction
      const ledgerTx = await tx.ledgerTransaction.create({
        data: {
          type: LedgerTransactionType.TRANSFER,
          moneyType: MoneyType.ENTITY_SUPPORT,
          amount,
          currency: 'SAR',
          reference: `TRF-${Date.now()}`,
          description: reason,
        },
      });

      return ledgerTx;
    });
  }
}
