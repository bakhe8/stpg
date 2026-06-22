import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';

import { JwtStrategy } from './auth/jwt.strategy';
import { SmsModule } from './sms/sms.module';
import { getAccessTokenSecret } from './auth/jwt-secrets';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      global: true,
      secret: getAccessTokenSecret(),
      signOptions: { expiresIn: '15m' },
    }),
    SmsModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class IdentityModule {}
