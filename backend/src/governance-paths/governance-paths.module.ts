import { Module } from '@nestjs/common';
import { GovernancePathsService } from './governance-paths.service';
import { GovernancePathsController } from './governance-paths.controller';
import { WalletPathsController } from './wallet-paths.controller';

@Module({
  controllers: [GovernancePathsController, WalletPathsController],
  providers: [GovernancePathsService],
  exports: [GovernancePathsService],
})
export class GovernancePathsModule {}
