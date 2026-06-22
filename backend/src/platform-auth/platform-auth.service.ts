import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const account = await this.prisma.platformAccount.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!account || !account.isActive) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const accessToken = this.jwtService.sign({
      sub: account.id,
      username: account.email,
      userType: 'platform',
    });

    return {
      accessToken,
      account: { id: account.id, name: account.name, role: account.role },
    };
  }

  // يُستخدم مرة واحدة لإنشاء حساب المالك الأول
  // محمي بـ PLATFORM_BOOTSTRAP_SECRET في env
  async createFirstOwner(email: string, password: string, name: string) {
    const bootstrapSecret = process.env.PLATFORM_BOOTSTRAP_SECRET;
    if (!bootstrapSecret) {
      throw new ForbiddenException('PLATFORM_BOOTSTRAP_SECRET غير مضبوط');
    }

    const exists = await this.prisma.platformAccount.findFirst({
      where: { role: PlatformRole.OWNER },
    });
    if (exists) {
      throw new ConflictException('حساب المالك موجود بالفعل');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.platformAccount.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: PlatformRole.OWNER,
      },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async createAccount(
    email: string,
    password: string,
    name: string,
    role: PlatformRole,
  ) {
    const existing = await this.prisma.platformAccount.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.platformAccount.create({
      data: { email: email.toLowerCase(), passwordHash, name, role },
      select: { id: true, email: true, name: true, role: true },
    });
  }
}
