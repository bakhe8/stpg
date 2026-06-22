import { Module } from '@nestjs/common';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformAuthController } from './platform-auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { getAccessTokenSecret } from '../identity/auth/jwt-secrets';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: getAccessTokenSecret(),
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [PlatformAuthController],
  providers: [PlatformAuthService],
  exports: [PlatformAuthService],
})
export class PlatformAuthModule {}
