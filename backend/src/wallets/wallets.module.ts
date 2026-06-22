import { Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { EntityWalletsController } from './entity-wallets.controller';

@Module({
  controllers: [WalletsController, EntityWalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
