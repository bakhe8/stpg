import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { OAuthProvider } from './dto/oauth-login.dto';

function encodeJwtPart(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function unsignedIdToken(payload: Record<string, unknown>) {
  return [
    encodeJwtPart({ alg: 'RS256', kid: 'kid-1' }),
    encodeJwtPart(payload),
    'signature',
  ].join('.');
}

describe('AuthService OAuth', () => {
  let prisma: {
    oAuthAccount: { findUnique: jest.Mock };
    person: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
    refreshToken: { create: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: AuthService;
  const originalGoogleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const originalEnableDevLogin = process.env.ENABLE_DEV_LOGIN;

  beforeEach(() => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.ENABLE_DEV_LOGIN;
    prisma = {
      oAuthAccount: { findUnique: jest.fn() },
      person: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
      refreshToken: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new AuthService(
      prisma as never,
      new JwtService({}),
      { sendOtp: jest.fn() } as never,
    );
  });

  afterEach(() => {
    if (originalGoogleClientId === undefined) {
      delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    } else {
      process.env.GOOGLE_OAUTH_CLIENT_ID = originalGoogleClientId;
    }
    if (originalEnableDevLogin === undefined) {
      delete process.env.ENABLE_DEV_LOGIN;
    } else {
      process.env.ENABLE_DEV_LOGIN = originalEnableDevLogin;
    }
  });

  it('rejects dev login unless ENABLE_DEV_LOGIN is explicitly true', async () => {
    await expect(service.devLogin('seed.ahmed.family')).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(prisma.person.findUnique).not.toHaveBeenCalled();
  });

  it('rejects malformed OAuth tokens before any account lookup', async () => {
    await expect(
      service.oauthLogin(OAuthProvider.GOOGLE, 'not-a-jwt'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.oAuthAccount.findUnique).not.toHaveBeenCalled();
  });

  it('records failed password login attempts without exposing the password', async () => {
    prisma.person.findFirst.mockResolvedValue(null);

    await expect(
      service.login({
        phoneNumber: '0501234567',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'LOGIN',
          targetType: 'auth_attempts',
          personId: undefined,
          newValue: expect.objectContaining({
            status: 'FAILED',
            reason: 'NO_ACCOUNT_OR_PASSWORD',
            phoneHint: '****4567',
          }),
        }),
      }),
    );
    expect(JSON.stringify(prisma.auditLog.create.mock.calls)).not.toContain(
      'wrong-password',
    );
  });

  it('requires an allowlisted OAuth audience before trusting the token body', async () => {
    const token = unsignedIdToken({
      iss: 'https://accounts.google.com',
      sub: 'google-user-id',
      aud: 'client-id',
      exp: Math.floor(Date.now() / 1000) + 600,
      email: 'person@example.com',
      email_verified: true,
    });

    await expect(
      service.oauthLogin(OAuthProvider.GOOGLE, token),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(prisma.oAuthAccount.findUnique).not.toHaveBeenCalled();
  });
});
