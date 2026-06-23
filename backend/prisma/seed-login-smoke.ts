import 'dotenv/config';
import { createSeedDb, resolveSeedRuntimeOptions } from './seed-runtime';

async function main() {
  const runtime = resolveSeedRuntimeOptions();
  const { pool, prisma } = createSeedDb(runtime.connectionString);
  const apiUrl = process.env.SEED_SMOKE_API_URL ?? 'http://localhost:3001';

  try {
    const people = await prisma.person.findMany({
      where: { memberships: { some: { isActive: true } } },
      select: { id: true, username: true, name: true },
      orderBy: { username: 'asc' },
    });
    const platformAccounts = await prisma.platformAccount.findMany({
      select: { email: true, name: true, role: true, isActive: true },
      orderBy: { email: 'asc' },
    });
    const failures: Array<{ identity: string; reason: string }> = [];

    for (const person of people) {
      try {
        const loginResponse = await fetch(`${apiUrl}/auth/dev-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: person.username }),
        });
        if (!loginResponse.ok) {
          failures.push({
            identity: person.username,
            reason: `login returned ${loginResponse.status}`,
          });
          continue;
        }

        const login = (await loginResponse.json()) as { accessToken: string };
        const entitiesResponse = await fetch(`${apiUrl}/entities/mine`, {
          headers: { Authorization: `Bearer ${login.accessToken}` },
        });
        if (!entitiesResponse.ok) {
          failures.push({
            identity: person.username,
            reason: `entity listing returned ${entitiesResponse.status}`,
          });
          continue;
        }

        const entities = (await entitiesResponse.json()) as unknown[];
        if (entities.length === 0) {
          failures.push({
            identity: person.username,
            reason: 'no active membership context was returned',
          });
        }
      } catch (error) {
        failures.push({
          identity: person.username,
          reason: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }

    const platformPassword =
      process.env.SEED_PLATFORM_PASSWORD ?? '123456';
    const activePlatformAccounts = platformAccounts.filter(
      (account) => account.isActive,
    );

    for (const account of activePlatformAccounts) {
      try {
        const loginResponse = await fetch(`${apiUrl}/platform-auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: account.email,
            password: platformPassword,
          }),
        });
        if (!loginResponse.ok) {
          failures.push({
            identity: account.email,
            reason: `platform login returned ${loginResponse.status}`,
          });
          continue;
        }

        const login = (await loginResponse.json()) as { accessToken: string };
        const entitiesResponse = await fetch(`${apiUrl}/platform/entities`, {
          headers: { Authorization: `Bearer ${login.accessToken}` },
        });
        if (!entitiesResponse.ok) {
          failures.push({
            identity: account.email,
            reason: `platform entity listing returned ${entitiesResponse.status}`,
          });
          continue;
        }

        if (account.role === 'SUPPORT' || account.role === 'ANALYST') {
          const forbiddenCreateResponse = await fetch(
            `${apiUrl}/platform-auth/accounts`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${login.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: `forbidden-${account.email}`,
                password: platformPassword,
                name: 'حساب يجب ألا ينشأ',
                role: 'SUPPORT',
              }),
            },
          );
          if (forbiddenCreateResponse.status !== 403) {
            failures.push({
              identity: account.email,
              reason: `restricted account creation returned ${forbiddenCreateResponse.status} instead of 403`,
            });
          }
        }
      } catch (error) {
        failures.push({
          identity: account.email,
          reason: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }

    for (const account of platformAccounts.filter(
      (candidate) => !candidate.isActive,
    )) {
      const loginResponse = await fetch(`${apiUrl}/platform-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: account.email,
          password: platformPassword,
        }),
      });
      if (loginResponse.status !== 401) {
        failures.push({
          identity: account.email,
          reason: `inactive platform login returned ${loginResponse.status} instead of 401`,
        });
      }
    }

    console.table({
      apiUrl,
      activePeople: people.length,
      activePlatformAccounts: activePlatformAccounts.length,
      inactivePlatformAccounts:
        platformAccounts.length - activePlatformAccounts.length,
      attemptedLogins: people.length + platformAccounts.length,
      failures: failures.length,
    });

    if (failures.length > 0) {
      console.error('Seed login smoke test failed.');
      console.table(failures);
      process.exitCode = 1;
      return;
    }

    console.log(
      'Every active tenant and platform account passed login and visibility checks; inactive platform accounts were rejected.',
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void main();
