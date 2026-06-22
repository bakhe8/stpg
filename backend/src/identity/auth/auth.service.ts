import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

import { AuditAction, Person, Prisma } from '@prisma/client';
import { getRefreshTokenSecret } from './jwt-secrets';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Dev bypass (بيئة التطوير فقط) ─────────────────────────────────
  async devLogin(username: string) {
    const environment = process.env.NODE_ENV ?? 'development';
    if (environment !== 'development') {
      throw new ForbiddenException('الدخول التطويري غير متاح في هذه البيئة');
    }

    let person: Person | null = await this.prisma.person.findUnique({
      where: { username },
    });

    if (!person) {
      person = await this.prisma.person.create({
        data: { username, name: username, isVerified: true },
      });
    }

    return this.issueTokenPair(person);
  }

  // ── Password Auth: Register & Login ──────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const { name, phoneNumber, password, entityId, branchOrFamily, recommenderName, notes } = dto;

    const existingPerson = await this.prisma.person.findUnique({
      where: { phoneNumber },
    });

    if (existingPerson) {
      throw new BadRequestException('رقم الجوال مسجل مسبقاً');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const person = await this.prisma.person.create({
      data: {
        username: phoneNumber,
        name,
        phoneNumber,
        passwordHash,
        isVerified: false,
        membershipApplications: {
          create: {
            entityId,
            relationshipDescription: branchOrFamily,
            sponsorName: recommenderName,
            note: notes,
          },
        },
      },
      include: {
        membershipApplications: true,
      },
    });

    return this.issueTokenPair(person);
  }

  async login(dto: LoginDto) {
    const { phoneNumber, password } = dto;

    const person = await this.prisma.person.findUnique({
      where: { phoneNumber },
    });

    if (!person || !person.passwordHash) {
      throw new BadRequestException('رقم الجوال أو كلمة المرور غير صحيحة');
    }

    const isMatch = await bcrypt.compare(password, person.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('رقم الجوال أو كلمة المرور غير صحيحة');
    }

    return this.issueTokenPair(person);
  }

  // ── OAuth: مصادقة ──────────────────────────────────────────────────
  async oauthLogin(provider: string, providerId: string, email: string, name?: string) {
    let oauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { person: true },
    });

    let person: Person | null = null;

    if (oauthAccount) {
      person = oauthAccount.person;
    } else {
      // Find person by email if exists, or create new
      person = await this.prisma.person.findUnique({ where: { email } });

      if (!person) {
        person = await this.prisma.person.create({
          data: {
            username: email,
            name: name || email.split('@')[0],
            email,
            isVerified: true,
          },
        });
      }

      await this.prisma.oAuthAccount.create({
        data: {
          personId: person.id,
          provider,
          providerId,
          email,
        },
      });
    }

    return this.issueTokenPair(person);
  }

  // ── Push Notifications: تسجيل جهاز ──────────────────────────────────
  async registerDeviceToken(personId: string, token: string, deviceOs?: string) {
    const existing = await this.prisma.deviceToken.findUnique({ where: { token } });
    if (existing) {
      if (existing.personId === personId) return; // Already registered
      // Token exists but for another user (maybe transferred device), reassign it
      await this.prisma.deviceToken.update({
        where: { token },
        data: { personId, deviceOs, isActive: true },
      });
      return;
    }

    await this.prisma.deviceToken.create({
      data: {
        personId,
        token,
        deviceOs,
      },
    });
  }
  // ── تعديل بيانات الحساب ────────────────────────────────────────────
  async updateMe(
    personId: string,
    data: { name?: string; email?: string; username?: string },
  ) {
    const updates: Record<string, string> = {};
    if (data.name?.trim()) updates.name = data.name.trim();
    if (data.email?.trim()) updates.email = data.email.trim().toLowerCase();
    if (data.username?.trim()) {
      const username = data.username.trim().toLowerCase();
      const existing = await this.prisma.person.findUnique({
        where: { username },
        select: { id: true },
      });
      if (existing && existing.id !== personId) {
        throw new ConflictException('اسم المستخدم مستخدم بالفعل');
      }
      updates.username = username;
    }

    try {
      const [person] = await this.prisma.$transaction([
        this.prisma.person.update({
          where: { id: personId },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            phoneNumber: true,
            isVerified: true,
          },
          data: updates,
        }),
        this.prisma.auditLog.create({
          data: {
            action: AuditAction.UPDATE,
            personId,
            targetType: 'persons',
            targetId: personId,
            newValue: updates,
          },
        }),
      ]);
      return person;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('اسم المستخدم مستخدم بالفعل');
      }
      throw error;
    }
  }

  // ── تجديد access token ─────────────────────────────────────────────
  async refresh(token: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { person: true },
    });

    if (!record || record.isRevoked || record.expiresAt < new Date()) {
      throw new UnauthorizedException('رمز التحديث غير صالح أو منتهي');
    }

    const accessToken = this.jwtService.sign(
      {
        sub: record.person.id,
        username: record.person.username,
        userType: 'tenant',
      },
      { expiresIn: '15m' },
    );

    return { accessToken };
  }

  // ── تسجيل الخروج ───────────────────────────────────────────────────
  async logout(token: string, personId: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!record || record.personId !== personId) {
      throw new BadRequestException('الرمز غير موجود');
    }

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { token },
        data: { isRevoked: true },
      }),
      this.prisma.auditLog.create({
        data: {
          action: AuditAction.LOGOUT,
          personId,
          targetType: 'persons',
          targetId: personId,
        },
      }),
    ]);

    return { message: 'Logged out successfully' };
  }

  // ── مساعد داخلي ────────────────────────────────────────────────────
  private async issueTokenPair(person: Person) {
    const accessToken = this.jwtService.sign(
      { sub: person.id, username: person.username, userType: 'tenant' },
      { expiresIn: '15m' },
    );

    const refreshToken = this.jwtService.sign(
      { sub: person.id, jti: randomUUID() },
      {
        secret: getRefreshTokenSecret(),
        expiresIn: '7d',
      },
    );

    await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          personId: person.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          action: AuditAction.LOGIN,
          personId: person.id,
          targetType: 'persons',
          targetId: person.id,
        },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      person: { id: person.id, name: person.name, username: person.username },
    };
  }


}
