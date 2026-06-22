import { Module } from '@nestjs/common';
import { SpendingItemsService } from './spending-items.service';
import { SpendingItemsController } from './spending-items.controller';
import { PathSpendingItemsController } from './path-spending-items.controller';

@Module({
  controllers: [SpendingItemsController, PathSpendingItemsController],
  providers: [SpendingItemsService],
  exports: [SpendingItemsService],
})
export class SpendingItemsModule {}
