import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from './jwt-payload.interface';
import { getAccessTokenSecret } from './jwt-secrets';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getAccessTokenSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.userType === 'platform') {
      const account = await this.prisma.platformAccount.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      });
      if (!account || !account.isActive) {
        throw new UnauthorizedException();
      }
      return { ...account, userType: 'platform' as const };
    }

    // Tenant — السلوك الأصلي محفوظ كما هو
    const person = await this.prisma.person.findUnique({
      where: { id: payload.sub },
    });
    if (!person) {
      throw new UnauthorizedException();
    }
    return { ...person, userType: 'tenant' as const };
  }
}
