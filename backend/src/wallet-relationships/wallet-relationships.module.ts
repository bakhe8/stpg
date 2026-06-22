import { Module } from '@nestjs/common';
import { WalletRelationshipsService } from './wallet-relationships.service';
import { WalletRelationshipsController } from './wallet-relationships.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletRelationshipsViewController } from './wallet-relationships-view.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    WalletRelationshipsController,
    WalletRelationshipsViewController,
  ],
  providers: [WalletRelationshipsService],
  exports: [WalletRelationshipsService],
})
export class WalletRelationshipsModule {}
