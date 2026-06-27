import {
  BadRequestException,
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
    person: { findUnique: jest.Mock; create: jest.Mock };
    refreshToken: { create: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: AuthService;
  const originalGoogleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;

  beforeEach(() => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    prisma = {
      oAuthAccount: { findUnique: jest.fn() },
      person: { findUnique: jest.fn(), create: jest.fn() },
      refreshToken: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new AuthService(prisma as never, new JwtService({}));
  });

  afterEach(() => {
    if (originalGoogleClientId === undefined) {
      delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    } else {
      process.env.GOOGLE_OAUTH_CLIENT_ID = originalGoogleClientId;
    }
  });

  it('rejects malformed OAuth tokens before any account lookup', async () => {
    await expect(
      service.oauthLogin(OAuthProvider.GOOGLE, 'not-a-jwt'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.oAuthAccount.findUnique).not.toHaveBeenCalled();
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
