import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createPublicKey, createVerify, randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthProvider } from './dto/oauth-login.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

import { AuditAction, Person, Prisma } from '@prisma/client';
import { getRefreshTokenSecret } from './jwt-secrets';

type OAuthJwtHeader = {
  alg?: string;
  kid?: string;
};

type OAuthJwtPayload = {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
};

type OAuthProviderConfig = {
  provider: OAuthProvider;
  issuers: string[];
  audiences: string[];
  jwksUrl: string;
};

type PublicJwk = {
  kid?: string;
  kty?: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
};

type JwksResponse = {
  keys?: PublicJwk[];
};

type VerifiedOAuthIdentity = {
  provider: OAuthProvider;
  providerId: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
};

const oauthJwksCache = new Map<
  string,
  { expiresAt: number; keys: PublicJwk[] }
>();
const CLOCK_SKEW_SECONDS = 60;

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
    const {
      name,
      phoneNumber,
      password,
      entityId,
      branchOrFamily,
      recommenderName,
      notes,
    } = dto;

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
        ...(entityId && {
          membershipApplications: {
            create: {
              entityId,
              relationshipDescription: branchOrFamily,
              sponsorName: recommenderName,
              note: notes,
            },
          },
        }),
      },
      include: {
        membershipApplications: true,
      },
    });

    return this.issueTokenPair(person);
  }

  async login(dto: LoginDto) {
    const { phoneNumber, password } = dto;
    const phoneCandidates = this.getPhoneLoginCandidates(phoneNumber);

    const person = await this.prisma.person.findFirst({
      where: {
        phoneNumber: { in: phoneCandidates },
      },
    });

    if (!person || !person.passwordHash) {
      await this.auditFailedLogin(phoneNumber, 'NO_ACCOUNT_OR_PASSWORD');
      throw new BadRequestException('رقم الجوال أو كلمة المرور غير صحيحة');
    }

    const isMatch = await bcrypt.compare(password, person.passwordHash);
    if (!isMatch) {
      await this.auditFailedLogin(phoneNumber, 'PASSWORD_MISMATCH', person.id);
      throw new BadRequestException('رقم الجوال أو كلمة المرور غير صحيحة');
    }

    return this.issueTokenPair(person);
  }

  // ── OAuth: مصادقة ──────────────────────────────────────────────────
  async oauthLogin(provider: OAuthProvider, idToken: string, name?: string) {
    const identity = await this.verifyOAuthIdToken(provider, idToken);

    const oauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: identity.provider,
          providerId: identity.providerId,
        },
      },
      include: { person: true },
    });

    let person: Person | null = null;

    if (oauthAccount) {
      person = oauthAccount.person;
    } else {
      const verifiedEmail =
        identity.email && identity.emailVerified ? identity.email : undefined;
      if (verifiedEmail) {
        person = await this.prisma.person.findUnique({
          where: { email: verifiedEmail },
        });
      }

      if (!person) {
        if (!verifiedEmail) {
          throw new BadRequestException(
            'OAuth token does not include a verified email',
          );
        }

        person = await this.prisma.person.create({
          data: {
            username: verifiedEmail,
            name:
              identity.name ||
              name ||
              verifiedEmail.split('@')[0] ||
              identity.provider,
            email: verifiedEmail,
            isVerified: true,
          },
        });
      }

      await this.prisma.oAuthAccount.create({
        data: {
          personId: person.id,
          provider: identity.provider,
          providerId: identity.providerId,
          email: verifiedEmail,
        },
      });
    }

    return this.issueTokenPair(person);
  }

  private async verifyOAuthIdToken(
    provider: OAuthProvider,
    idToken: string,
  ): Promise<VerifiedOAuthIdentity> {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new BadRequestException('Invalid OAuth ID token');
    }

    const header = this.decodeJwtPart<OAuthJwtHeader>(parts[0]);
    const payload = this.decodeJwtPart<OAuthJwtPayload>(parts[1]);
    const config = this.getOAuthProviderConfig(provider);

    if (header.alg !== 'RS256' || !header.kid) {
      throw new BadRequestException('Unsupported OAuth token signature');
    }

    if (!payload.sub) {
      throw new BadRequestException('OAuth token is missing subject');
    }

    if (!payload.iss || !config.issuers.includes(payload.iss)) {
      throw new BadRequestException('OAuth token issuer is not trusted');
    }

    const tokenAudiences = Array.isArray(payload.aud)
      ? payload.aud
      : payload.aud
        ? [payload.aud]
        : [];
    if (
      tokenAudiences.length === 0 ||
      !tokenAudiences.some((audience) => config.audiences.includes(audience))
    ) {
      throw new BadRequestException('OAuth token audience is not allowed');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp + CLOCK_SKEW_SECONDS < nowSeconds) {
      throw new BadRequestException('OAuth token is expired');
    }
    if (payload.nbf && payload.nbf - CLOCK_SKEW_SECONDS > nowSeconds) {
      throw new BadRequestException('OAuth token is not active yet');
    }

    await this.verifyJwtSignature(idToken, header.kid, config.jwksUrl);

    const email = payload.email?.trim().toLowerCase();
    return {
      provider: config.provider,
      providerId: payload.sub,
      email,
      emailVerified: this.isEmailVerified(payload.email_verified),
      name: payload.name?.trim() || undefined,
    };
  }

  private getOAuthProviderConfig(provider: OAuthProvider): OAuthProviderConfig {
    if (provider === OAuthProvider.GOOGLE) {
      return {
        provider,
        issuers: ['https://accounts.google.com', 'accounts.google.com'],
        audiences: this.getEnvList([
          'GOOGLE_OAUTH_CLIENT_ID',
          'GOOGLE_CLIENT_ID',
        ]),
        jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
      };
    }

    if (provider === OAuthProvider.APPLE) {
      return {
        provider,
        issuers: ['https://appleid.apple.com'],
        audiences: this.getEnvList([
          'APPLE_OAUTH_CLIENT_ID',
          'APPLE_CLIENT_ID',
          'APPLE_BUNDLE_ID',
        ]),
        jwksUrl: 'https://appleid.apple.com/auth/keys',
      };
    }

    throw new BadRequestException('Unsupported OAuth provider');
  }

  private getEnvList(names: string[]): string[] {
    const values = names.flatMap((name) =>
      (process.env[name] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );

    if (values.length === 0) {
      throw new ServiceUnavailableException(
        `OAuth client ID is not configured (${names.join(' or ')})`,
      );
    }

    return values;
  }

  private decodeJwtPart<T>(part: string): T {
    try {
      return JSON.parse(this.base64UrlDecode(part).toString('utf8')) as T;
    } catch {
      throw new BadRequestException('Invalid OAuth ID token encoding');
    }
  }

  private async verifyJwtSignature(
    idToken: string,
    kid: string,
    jwksUrl: string,
  ): Promise<void> {
    const parts = idToken.split('.');
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new BadRequestException('Invalid OAuth ID token');
    }

    const jwk = await this.getJwk(jwksUrl, kid);
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();

    const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
    const signature = this.base64UrlDecode(encodedSignature);
    if (!verifier.verify(publicKey, signature)) {
      throw new BadRequestException('Invalid OAuth token signature');
    }
  }

  private async getJwk(jwksUrl: string, kid: string): Promise<PublicJwk> {
    const cached = oauthJwksCache.get(jwksUrl);
    if (cached && cached.expiresAt > Date.now()) {
      const cachedKey = cached.keys.find((key) => key.kid === kid);
      if (cachedKey) return cachedKey;
    }

    const response = await fetch(jwksUrl);
    if (!response.ok) {
      throw new ServiceUnavailableException('OAuth JWKS endpoint unavailable');
    }

    const body = (await response.json()) as JwksResponse;
    if (!Array.isArray(body.keys)) {
      throw new ServiceUnavailableException('OAuth JWKS response is invalid');
    }

    const maxAgeMatch = /max-age=(\d+)/i.exec(
      response.headers.get('cache-control') ?? '',
    );
    const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 300;
    oauthJwksCache.set(jwksUrl, {
      keys: body.keys,
      expiresAt: Date.now() + Math.max(60, maxAgeSeconds) * 1000,
    });

    const jwk = body.keys.find((key) => key.kid === kid);
    if (!jwk) {
      throw new BadRequestException('OAuth signing key was not found');
    }

    return jwk;
  }

  private base64UrlDecode(value: string): Buffer {
    const padded = value.padEnd(
      value.length + ((4 - (value.length % 4)) % 4),
      '=',
    );
    return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  }

  private isEmailVerified(value: OAuthJwtPayload['email_verified']): boolean {
    return value === true || value === 'true';
  }

  // ── Push Notifications: تسجيل جهاز ──────────────────────────────────
  async registerDeviceToken(
    personId: string,
    token: string,
    deviceOs?: string,
  ) {
    const existing = await this.prisma.deviceToken.findUnique({
      where: { token },
    });
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
  private getPhoneLoginCandidates(phoneNumber: string): string[] {
    const trimmed = phoneNumber.trim();
    const digits = trimmed.replace(/\D/g, '');
    const candidates = new Set<string>([trimmed]);

    if (/^05\d{8}$/.test(digits)) {
      candidates.add(`+9665${digits.slice(2)}`);
    }

    if (/^5\d{8}$/.test(digits)) {
      candidates.add(`+966${digits}`);
    }

    if (/^\d{8}$/.test(digits)) {
      candidates.add(`+9665${digits}`);
    }

    return [...candidates].filter(Boolean);
  }

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

  private async auditFailedLogin(
    phoneNumber: string,
    reason: string,
    personId?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.LOGIN,
          personId,
          targetType: 'auth_attempts',
          targetId: randomUUID(),
          newValue: {
            status: 'FAILED',
            reason,
            phoneHint: this.maskPhoneForAudit(phoneNumber),
          },
        },
      });
    } catch {
      // Login failure auditing must not change the public auth response.
    }
  }

  private maskPhoneForAudit(phoneNumber: string) {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length <= 4) return '****';
    return `****${digits.slice(-4)}`;
  }
}
