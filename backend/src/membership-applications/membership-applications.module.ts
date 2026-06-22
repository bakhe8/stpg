import { Module } from '@nestjs/common';
import { MembershipApplicationsController } from './membership-applications.controller';
import { MembershipApplicationsService } from './membership-applications.service';

@Module({
  controllers: [MembershipApplicationsController],
  providers: [MembershipApplicationsService],
  exports: [MembershipApplicationsService],
})
export class MembershipApplicationsModule {}
