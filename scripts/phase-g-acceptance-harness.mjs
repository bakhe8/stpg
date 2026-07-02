import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const API_URL = (process.env.API_URL ?? 'http://localhost:3001/api').replace(
  /\/$/,
  '',
);
const USERNAME = process.env.ACCEPTANCE_USER ?? 'seed.ahmed.family';
const STAMP =
  process.env.ACCEPTANCE_STAMP ??
  new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const OUT_DIR =
  process.env.ACCEPTANCE_OUT_DIR ??
  path.join(os.tmpdir(), `stgp-phase-g-acceptance-${STAMP}`);

const PROFILE_KEY = 'ACCEPTANCE';
const PROFILE_LABEL = 'Acceptance Harness';

const templates = [
  {
    key: 'CUSTOM_FUND',
    id: 'fba96d5c-f6b8-52fb-92c9-0659b0e99211',
    expectedBenefit: 'SEPARABLE',
    expectedPath: 'BOARD',
  },
  {
    key: 'MUTUAL_AID',
    id: '4050dc87-bea3-539d-beb9-09554fb1cf4d',
    expectedBenefit: 'SEPARABLE',
    expectedPath: 'COMMITTEE',
  },
  {
    key: 'SHARED_SERVICES',
    id: '7e2c14c7-8826-56c2-9849-2702ec0ce7f1',
    expectedBenefit: 'SHARED',
    expectedPath: 'COMMITTEE',
  },
  {
    key: 'SUPPORTER_ONLY',
    id: 'f22aefba-58f1-5879-9a6a-5c64b01920c5',
    expectedBenefit: 'SEPARABLE',
    expectedPath: 'DONATION_ONLY',
  },
];

function backendOrigin() {
  return API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
}

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function request(pathname, options = {}) {
  const response = await fetch(`${API_URL}${pathname}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    throw new Error(
      `${options.method ?? 'GET'} ${pathname} failed with ${response.status}: ${JSON.stringify(body)}`,
    );
  }
  return body;
}

async function login() {
  const session = await request('/auth/dev-login', {
    method: 'POST',
    body: JSON.stringify({ username: USERNAME }),
  });
  assert(session?.accessToken, 'dev login did not return an access token', {
    username: USERNAME,
  });
  return { Authorization: `Bearer ${session.accessToken}` };
}

async function createEntity(headers, payload) {
  return request('/entities', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

async function entityWallets(headers, entityId) {
  const wallets = await request(`/entities/${entityId}/wallets`, { headers });
  assert(Array.isArray(wallets), 'entity wallets response is not an array', {
    entityId,
    wallets,
  });
  return wallets;
}

async function walletPaths(headers, walletId) {
  const paths = await request(`/wallets/${walletId}/paths`, { headers });
  assert(Array.isArray(paths), 'wallet paths response is not an array', {
    walletId,
    paths,
  });
  return paths;
}

async function collectPaths(headers, wallets) {
  const allPaths = [];
  for (const wallet of wallets) {
    allPaths.push(...(await walletPaths(headers, wallet.id)));
  }
  return allPaths;
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });

  const healthResponse = await fetch(`${backendOrigin()}/health`);
  assert(healthResponse.ok, 'backend health check failed', {
    url: `${backendOrigin()}/health`,
    status: healthResponse.status,
  });

  const headers = await login();

  const emptyFund = await createEntity(headers, {
    name: `Acceptance Empty Fund ${STAMP}`,
    type: 'COMMUNITY',
    description: 'Phase G acceptance harness empty fund',
    profileKey: PROFILE_KEY,
    profileLabel: PROFILE_LABEL,
  });
  assert(emptyFund?.id, 'empty fund creation did not return an id', emptyFund);
  assert(emptyFund.type === 'COMMUNITY', 'empty fund type mismatch', {
    entityId: emptyFund.id,
    type: emptyFund.type,
  });
  const emptyWallets = await entityWallets(headers, emptyFund.id);
  assert(emptyWallets.length === 0, 'empty fund should not create wallets', {
    entityId: emptyFund.id,
    walletCount: emptyWallets.length,
  });

  const templateResults = [];
  for (const template of templates) {
    const fund = await createEntity(headers, {
      name: `Acceptance Template ${template.key} ${STAMP}`,
      type: 'COMMUNITY',
      description: `Phase G acceptance harness ${template.key}`,
      templateId: template.id,
      profileKey: PROFILE_KEY,
      profileLabel: PROFILE_LABEL,
    });
    assert(fund?.id, `${template.key} creation did not return an id`, fund);
    const wallets = await entityWallets(headers, fund.id);
    const paths = await collectPaths(headers, wallets);
    const benefitTypes = wallets.map((wallet) => wallet.benefitType);
    const pathTypes = paths.map((governancePath) => governancePath.type);

    assert(wallets.length === 1, `${template.key} wallet count mismatch`, {
      entityId: fund.id,
      walletCount: wallets.length,
    });
    assert(paths.length === 1, `${template.key} path count mismatch`, {
      entityId: fund.id,
      pathCount: paths.length,
    });
    assert(
      benefitTypes.includes(template.expectedBenefit),
      `${template.key} benefit type mismatch`,
      { entityId: fund.id, benefitTypes, expected: template.expectedBenefit },
    );
    assert(pathTypes.includes(template.expectedPath), `${template.key} path type mismatch`, {
      entityId: fund.id,
      pathTypes,
      expected: template.expectedPath,
    });

    templateResults.push({
      template: template.key,
      templateId: template.id,
      entityId: fund.id,
      walletCount: wallets.length,
      walletBenefitTypes: benefitTypes,
      pathCount: paths.length,
      pathTypes,
      expectedBenefit: template.expectedBenefit,
      expectedPath: template.expectedPath,
      accepted: true,
    });
  }

  const campaignEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const campaign = await request(`/entities/${emptyFund.id}/campaigns`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: `Acceptance Campaign ${STAMP}`,
      description: 'Phase G acceptance harness campaign',
      campaignEndsAt,
    }),
  });
  assert(campaign?.id, 'campaign creation did not return an id', campaign);
  assert(campaign.type === 'CAMPAIGN', 'campaign type mismatch', {
    campaignId: campaign.id,
    type: campaign.type,
  });
  assert(campaign.parentEntityId === emptyFund.id, 'campaign parent mismatch', {
    campaignId: campaign.id,
    parentEntityId: campaign.parentEntityId,
    expectedParentEntityId: emptyFund.id,
  });
  const campaignWallets = await entityWallets(headers, campaign.id);

  const summary = {
    status: 'passed',
    apiUrl: API_URL,
    user: USERNAME,
    stamp: STAMP,
    outDir: OUT_DIR,
    profileKey: PROFILE_KEY,
    emptyFund: {
      entityId: emptyFund.id,
      type: emptyFund.type,
      walletCount: emptyWallets.length,
      accepted: true,
    },
    templates: templateResults,
    campaign: {
      entityId: campaign.id,
      parentEntityId: campaign.parentEntityId,
      type: campaign.type,
      walletCount: campaignWallets.length,
      campaignEndsAt,
      accepted: true,
    },
  };

  const summaryPath = path.join(OUT_DIR, 'phase-g-acceptance-summary.json');
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ...summary, summaryPath }, null, 2));
}

run().catch((error) => {
  const failure = {
    status: 'failed',
    apiUrl: API_URL,
    user: USERNAME,
    stamp: STAMP,
    message: error instanceof Error ? error.message : String(error),
    details: error?.details,
  };
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
});
