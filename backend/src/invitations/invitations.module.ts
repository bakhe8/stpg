import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { getAccessTokenSecret } from '../identity/auth/jwt-secrets';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: getAccessTokenSecret(),
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule {}
