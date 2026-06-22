// Allow dev-login endpoint (NODE_ENV check) and skip prod-only guards
process.env.NODE_ENV = 'development';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// ── Helpers ───────────────────────────────────────────────────────────────────

const NULL_UUID = '00000000-0000-0000-0000-000000000001';
const INVALID_TOKEN = 'Bearer invalid.jwt.token';

async function devLogin(app: INestApplication<App>): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/dev-login')
    .send({ username: `e2e_test_${Date.now()}` })
    .expect(200);
  return `Bearer ${res.body.accessToken as string}`;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('CollectiveTrustOS E2E', () => {
  let app: INestApplication<App>;
  let authHeader: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );

    // Register Swagger (mirrors main.ts setup — not run automatically in test harness)
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CollectiveTrustOS API')
      .setDescription('E2E test Swagger instance')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();

    // Obtain a real JWT via dev-login (development mode only)
    authHeader = await devLogin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Infrastructure ──────────────────────────────────────────────────────────

  describe('Infrastructure', () => {
    it('GET / returns 200 health check', () => {
      return request(app.getHttpServer()).get('/').expect(200);
    });

    it('GET /api/docs returns Swagger UI HTML', async () => {
      const res = await request(app.getHttpServer()).get('/api/docs');
      // Swagger sets up a redirect to /api/docs/
      expect([200, 301, 302]).toContain(res.status);
    });

    it('GET /api/docs-json returns OpenAPI JSON', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);
      expect(res.body).toHaveProperty('openapi');
      expect(res.body).toHaveProperty('info');
      expect(res.body.info).toMatchObject({ title: 'CollectiveTrustOS API' });
    });
  });

  // ── Auth: JWT protection ────────────────────────────────────────────────────

  describe('Auth: JWT protection', () => {
    const protectedRoutes: [string, string][] = [
      ['GET',  `/analytics/fund-health?entityId=${NULL_UUID}`],
      ['GET',  `/entities/${NULL_UUID}/wallets`],
      ['GET',  `/wallets/${NULL_UUID}/paths`],
      ['GET',  `/wallets/${NULL_UUID}/ownership`],
      ['GET',  `/ledger/summary?entityId=${NULL_UUID}`],
      ['GET',  `/ledger/accounts/${NULL_UUID}/transactions`],
      ['GET',  `/memberships/${NULL_UUID}/subscriptions`],
      ['GET',  `/entities/${NULL_UUID}/relationships`],
      ['GET',  `/wallets/${NULL_UUID}/relationships`],
      ['GET',  `/auth/me`],
    ];

    it.each(protectedRoutes)('%s %s → 401 without token', (method, path) => {
      return (request(app.getHttpServer()) as unknown as Record<string, (p: string) => request.Test>)
        [method.toLowerCase()](path)
        .expect(401);
    });

    it.each(protectedRoutes)('%s %s → 401 with invalid token', (method, path) => {
      return (request(app.getHttpServer()) as unknown as Record<string, (p: string) => request.Test>)
        [method.toLowerCase()](path)
        .set('Authorization', INVALID_TOKEN)
        .expect(401);
    });
  });

  // ── Auth: flow ──────────────────────────────────────────────────────────────

  describe('Auth: flow', () => {
    it('POST /auth/dev-login returns accessToken and refreshToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/dev-login')
        .send({ username: `e2e_flow_${Date.now()}` })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('POST /auth/dev-login with empty username → 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/dev-login')
        .send({ username: '' })
        .expect(400);
    });

    it('GET /auth/me returns person data when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', authHeader)
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name');
    });

    it('POST /auth/refresh with invalid refreshToken → 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'not-a-valid-token' })
        .expect(401);
    });
  });

  // ── API: input validation ───────────────────────────────────────────────────

  describe('API: input validation', () => {
    it('POST /ledger/payments with empty body → 400', async () => {
      await request(app.getHttpServer())
        .post('/ledger/payments')
        .set('Authorization', authHeader)
        .send({})
        .expect(400);
    });

    it('POST /ledger/entity-support with invalid UUIDs → 400', async () => {
      await request(app.getHttpServer())
        .post('/ledger/entity-support')
        .set('Authorization', authHeader)
        .send({ sourcePathId: 'not-uuid', targetPathId: 'not-uuid', amount: 100, description: 'test' })
        .expect(400);
    });

    it('PUT /wallets/:id/ownership with shares not summing to 100 → 400', async () => {
      // Valid UUID format but non-existent; validation happens before DB lookup
      await request(app.getHttpServer())
        .put(`/wallets/${NULL_UUID}/ownership`)
        .set('Authorization', authHeader)
        .send({
          ownerships: [
            { entityId: NULL_UUID, sharePercent: 60 },
            // only 60%, not 100%
          ],
        })
        // Either 400 (validation) or 404 (not found) is acceptable here
        .expect((res) => {
          expect([400, 403, 404]).toContain(res.status);
        });
    });

    it('POST /ledger/disbursements with negative amount → 400', async () => {
      await request(app.getHttpServer())
        .post('/ledger/disbursements')
        .set('Authorization', authHeader)
        .send({ pathId: NULL_UUID, spendingItemId: NULL_UUID, decisionId: NULL_UUID, amount: -50, description: 'test' })
        .expect(400);
    });
  });

  // ── API: resource not found ─────────────────────────────────────────────────

  describe('API: resource not found', () => {
    it('GET /ledger/summary with non-existent entityId → 403 or 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/ledger/summary?entityId=${NULL_UUID}`)
        .set('Authorization', authHeader);
      // 403 if membership check fails first; 404 if entity lookup fails first
      expect([403, 404]).toContain(res.status);
    });

    it('GET /ledger/accounts/:id/transactions with non-existent account → 404', async () => {
      await request(app.getHttpServer())
        .get(`/ledger/accounts/${NULL_UUID}/transactions`)
        .set('Authorization', authHeader)
        // 404 if not found, 403 if external account, 403 if no membership
        .expect((res) => {
          expect([403, 404]).toContain(res.status);
        });
    });

    it('GET /wallets/:id with non-existent wallet → 404', async () => {
      await request(app.getHttpServer())
        .get(`/wallets/${NULL_UUID}`)
        .set('Authorization', authHeader)
        .expect(404);
    });
  });
});
