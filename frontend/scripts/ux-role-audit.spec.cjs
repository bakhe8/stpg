const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_URL = process.env.API_URL || "http://localhost:3001/api";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_DIR =
  process.env.STGP_UX_OUT_DIR ||
  path.join(os.tmpdir(), `stgp-ux-role-audit-${STAMP}`);

const DEFAULT_USERS = [
  "seed.ahmed.family",
  "seed.sara.family",
  "seed.nasser.family",
  "seed.layan.audit",
  "seed.majed.medical",
  "seed.noura.social",
  "seed.faisal.overlap",
  "seed.khaled.suspended",
  "seed.abdullah.building",
  "seed.yahya.neighborhood",
  "seed.fahad.case",
  "seed.omar.youth",
  "seed.huda.exited",
  "seed.amal.conditional",
  "seed.mariam.family",
  "seed.abdulrahman.tribe",
  "seed.mona.building",
  "seed.reem.overlap",
];

const USERS = (process.env.STGP_UX_USERS || DEFAULT_USERS.join(","))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const TEST_TIMEOUT_MS = Number(process.env.STGP_UX_TEST_TIMEOUT_MS || 240000);
const RETRY_LIMIT = Number(process.env.STGP_UX_RETRY_LIMIT || 3);
const RETRY_BASE_MS = Number(process.env.STGP_UX_RETRY_BASE_MS || 700);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login(page, username) {
  await gotoWithRetry(page, `${BASE_URL}/login`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: /دخول المطورين|Developer/i }).click();
  await page.locator("#username-input").fill(username);
  await page.getByRole("button", { name: /دخول تطويري|Dev/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(600);
}

async function apiGet(token, endpoint, entityId) {
  const headers = { Authorization: `Bearer ${token}` };
  if (entityId) headers["X-Entity-ID"] = entityId;

  for (let attempt = 0; attempt <= RETRY_LIMIT; attempt += 1) {
    const response = await fetch(`${API_URL}${endpoint}`, { headers });
    if (response.status === 429 && attempt < RETRY_LIMIT) {
      await sleep(RETRY_BASE_MS * (attempt + 1));
      continue;
    }
    if (!response.ok) {
      throw new Error(
        `${endpoint} returned ${response.status} after ${attempt + 1} attempt(s)`,
      );
    }
    return response.json();
  }

  throw new Error(`${endpoint} exhausted retry attempts`);
}

function isOperational(entity) {
  return !entity.platformStatus || entity.platformStatus === "ACTIVE";
}

function isReadableDetail(entity) {
  return entity.isActive !== false && entity.platformStatus !== "SUSPENDED";
}

function hasActiveRole(entities, roles) {
  return entities.some(
    (entity) => isOperational(entity) && roles.includes(entity.myRole),
  );
}

async function firstAccessibleWalletAndPath(token, entities) {
  for (const entity of entities.filter(isOperational)) {
    const wallets = await apiGet(
      token,
      `/entities/${entity.id}/wallets`,
      entity.id,
    ).catch(() => []);
    if (!wallets.length) continue;

    for (const wallet of wallets) {
      const paths = await apiGet(
        token,
        `/wallets/${wallet.id}/paths`,
        entity.id,
      ).catch(() => []);
      if (paths.length) return { entity, wallet, path: paths[0] };
    }
    return { entity, wallet: wallets[0], path: null };
  }
  return { entity: null, wallet: null, path: null };
}

async function discoverRoutes(page, username) {
  const token = await page.evaluate(() => localStorage.getItem("accessToken"));
  if (!token) throw new Error("missing access token after login");

  const entities = await apiGet(token, "/entities/mine");
  if (!entities.length) throw new Error("no entities discovered for audit");

  const subscriptions = await apiGet(token, "/subscriptions")
    .then((value) => (Array.isArray(value) ? value : [value]))
    .catch(() => []);

  const primary =
    entities.find(
      (entity) =>
        isOperational(entity) &&
        (entity.myRole === "FOUNDER" || entity.myRole === "ADMIN"),
    ) ||
    entities.find(isOperational) ||
    entities[0];

  const routes = [
    { label: "dashboard", url: "/dashboard" },
    { label: "profile", url: "/profile" },
    { label: "notifications", url: "/notifications" },
    { label: "wallets", url: "/wallets" },
    { label: "entities", url: "/entities" },
  ];

  for (const entity of entities.filter(isReadableDetail)) {
    routes.push({
      label: `entity-detail-${entity.type}-${entity.myRole}-${entity.platformStatus || "ACTIVE"}`,
      url: `/entities/${entity.id}`,
    });
  }

  if (
    isOperational(primary) &&
    (primary.myRole === "FOUNDER" || primary.myRole === "ADMIN")
  ) {
    routes.push(
      {
        label: "platform-access",
        url: `/entities/${primary.id}/platform-access`,
      },
      { label: "entity-settings", url: `/entities/${primary.id}/settings` },
      { label: "review", url: `/entities/${primary.id}/review` },
    );
  }

  if (hasActiveRole(entities, ["TREASURER"])) {
    routes.push({ label: "finance", url: "/finance" });
  }

  if (hasActiveRole(entities, ["AUDITOR"])) {
    routes.push({ label: "auditor", url: "/auditor" });
  }

  if (hasActiveRole(entities, ["COMMITTEE_MEMBER"])) {
    routes.push({ label: "committees", url: "/committees" });
    routes.push({ label: "disbursements", url: "/disbursements" });
  }

  if (entities.some((entity) => entity.myRole === "MEMBER")) {
    routes.push({ label: "portal", url: "/portal" });
    routes.push({ label: "subscriptions", url: "/subscriptions" });
  }

  const walletContext = await firstAccessibleWalletAndPath(token, entities);
  if (walletContext.wallet?.id) {
    routes.push({
      label: "wallet-detail",
      url: `/wallets/${walletContext.wallet.id}`,
    });
  }
  if (walletContext.path?.id) {
    routes.push({
      label: "path-detail",
      url: `/paths/${walletContext.path.id}`,
    });
  }

  const disputes = primary?.id
    ? await apiGet(token, `/disputes?entityId=${primary.id}`, primary.id).catch(
        () => [],
      )
    : [];
  if (disputes[0]?.id) {
    routes.push({
      label: "dispute-detail",
      url: `/disputes/${disputes[0].id}`,
    });
  }

  const expectations = buildExpectations(username, entities, subscriptions);
  return { routes: dedupeRoutes(routes), expectations };
}

function buildExpectations(username, entities, subscriptions) {
  const expectations = [];
  const entityTags = entities.map(
    (entity) =>
      `${entity.type}:${entity.myRole}:${entity.platformStatus || "ACTIVE"}`,
  );

  const push = (type, ok, detail) => expectations.push({ type, ok, detail });

  if (username === "seed.faisal.overlap") {
    push(
      "multi-entity",
      entities.length >= 2,
      entities.map((entity) => entity.name),
    );
  }
  if (username === "seed.khaled.suspended") {
    push(
      "suspended-subscription",
      subscriptions.some((item) => item?.state === "SUSPENDED"),
      subscriptions.map((item) => item?.state),
    );
  }
  if (username === "seed.abdullah.building") {
    push(
      "building-founder",
      entities.some(
        (entity) => entity.type === "BUILDING" && entity.myRole === "FOUNDER",
      ),
      entityTags,
    );
  }
  if (username === "seed.yahya.neighborhood") {
    push(
      "neighborhood-founder",
      entities.some(
        (entity) =>
          entity.type === "NEIGHBORHOOD" && entity.myRole === "FOUNDER",
      ),
      entityTags,
    );
    push(
      "pending-review-entity",
      entities.some((entity) => entity.platformStatus === "PENDING_REVIEW"),
      entityTags,
    );
  }
  if (username === "seed.fahad.case") {
    push(
      "case-campaign-readonly",
      entities.some(
        (entity) =>
          entity.type === "CAMPAIGN" && entity.platformStatus === "READ_ONLY",
      ),
      entityTags,
    );
  }
  if (username === "seed.omar.youth") {
    push(
      "community-suspended-admin",
      entities.some(
        (entity) =>
          entity.type === "COMMUNITY" &&
          entity.myRole === "ADMIN" &&
          entity.platformStatus === "SUSPENDED",
      ),
      entityTags,
    );
  }
  if (username === "seed.huda.exited") {
    push(
      "exited-subscription-covered",
      subscriptions.every((item) => item?.state !== "EXITED"),
      subscriptions.map((item) => item?.state),
    );
  }
  if (username === "seed.amal.conditional") {
    push(
      "conditional-subscription",
      subscriptions.some((item) => item?.state === "CONDITIONAL"),
      subscriptions.map((item) => item?.state),
    );
  }
  if (username === "seed.mariam.family") {
    push(
      "suspended-community-member",
      entities.some(
        (entity) =>
          entity.type === "COMMUNITY" &&
          entity.myRole === "MEMBER" &&
          entity.platformStatus === "SUSPENDED",
      ),
      entityTags,
    );
  }
  if (username === "seed.abdulrahman.tribe") {
    push(
      "tribe-founder",
      entities.some(
        (entity) => entity.type === "TRIBE" && entity.myRole === "FOUNDER",
      ),
      entityTags,
    );
  }
  if (username === "seed.mona.building") {
    push(
      "building-admin-or-treasurer",
      entities.some(
        (entity) =>
          entity.type === "BUILDING" &&
          (entity.myRole === "ADMIN" || entity.myRole === "TREASURER"),
      ),
      entityTags,
    );
  }
  if (username === "seed.reem.overlap") {
    push(
      "wide-overlap",
      entities.length >= 4,
      entities.map((entity) => entity.name),
    );
  }

  return expectations;
}

function dedupeRoutes(routes) {
  const seen = new Set();
  return routes.filter((route) => {
    const key = `${route.label}:${route.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sanitize(name) {
  return name
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function gotoWithRetry(page, url, options) {
  for (let attempt = 0; attempt <= RETRY_LIMIT; attempt += 1) {
    const response = await page.goto(url, options);
    if (response?.status() === 429 && attempt < RETRY_LIMIT) {
      await sleep(RETRY_BASE_MS * (attempt + 1));
      continue;
    }

    return response;
  }

  return null;
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText?.trim() || "";
    const doc = document.documentElement;
    const overlayText =
      /Unhandled Runtime Error|Application error|This page could not be found|NEXT_REDIRECT/i.test(
        text,
      );
    const overlayDom = Boolean(
      document.querySelector(
        "nextjs-portal, [data-nextjs-dialog-overlay], [data-nextjs-toast]",
      ),
    );
    const rawPlaceholder = /\{[a-zA-Z][a-zA-Z0-9_]*\}/.test(text);
    const horizontalOverflow = Math.max(0, doc.scrollWidth - doc.clientWidth);
    const clickables = Array.from(
      document.querySelectorAll(
        'button, a, select, input, textarea, [role="button"], summary, [tabindex]:not([tabindex="-1"])',
      ),
    );

    const smallTargets = [];
    for (const el of clickables) {
      const style = window.getComputedStyle(el);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) === 0
      ) {
        continue;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const type = (el.getAttribute("type") || "").toLowerCase();
      if (type === "hidden" || el.getAttribute("aria-hidden") === "true")
        continue;
      if ((type === "checkbox" || type === "radio") && el.closest("label")) {
        const labelRect = el.closest("label").getBoundingClientRect();
        if (labelRect.height >= 40 && labelRect.width >= 40) continue;
      }

      const isFormControl = ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(
        el.tagName,
      );
      const isInteractiveLink =
        el.tagName === "A" ||
        el.getAttribute("role") === "button" ||
        el.hasAttribute("tabindex");
      if (!isFormControl && !isInteractiveLink) continue;

      if (rect.height < 40 || rect.width < 32) {
        smallTargets.push({
          tag: el.tagName.toLowerCase(),
          className: String(el.className || "").slice(0, 90),
          label: (
            el.innerText ||
            el.getAttribute("aria-label") ||
            el.getAttribute("title") ||
            el.getAttribute("placeholder") ||
            el.id ||
            el.tagName
          )
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 90),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    }

    return {
      title: document.title,
      bodyTextLength: text.length,
      overlay: overlayText || overlayDom,
      rawPlaceholder,
      horizontalOverflow,
      smallTargets: smallTargets.slice(0, 25),
    };
  });
}

async function runInteractions(page, routeLabel) {
  const interactions = [];

  if (routeLabel.startsWith("entity-detail")) {
    const health = page.locator('[class*="healthBadgeWrap"]').first();
    if (await health.isVisible().catch(() => false)) {
      await health.click();
      const tooltipVisible = await page
        .getByText(/مكونات مؤشر الصحة|Health/i)
        .first()
        .isVisible()
        .catch(() => false);
      interactions.push({ action: "click health badge", ok: tooltipVisible });
    }
  }

  if (routeLabel === "review") {
    const tab = page
      .getByRole("button", { name: /إثباتات الدفع|Payment/i })
      .first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(250);
      interactions.push({
        action: "switch review tab",
        ok: await tab.isVisible().catch(() => false),
      });
    }
  }

  if (routeLabel === "wallets") {
    const filter = page.locator("select").first();
    if (await filter.isVisible().catch(() => false)) {
      const options = await filter
        .locator("option")
        .count()
        .catch(() => 0);
      interactions.push({
        action: "wallet entity filter visible",
        ok: options > 0,
        options,
      });
    }
  }

  return interactions;
}

async function auditUser(browser, username) {
  const userOutDir = path.join(OUT_DIR, sanitize(username));
  fs.mkdirSync(userOutDir, { recursive: true });

  const context = await browser.newContext();
  const page = await context.newPage();
  const logs = [];
  const responses = [];
  const pageErrors = [];
  const results = [];
  const screenshots = [];
  const issues = [];
  let current = "bootstrap";

  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      logs.push({ route: current, type: msg.type(), text: msg.text() });
    }
  });
  page.on("pageerror", (err) =>
    pageErrors.push({ route: current, text: err.message }),
  );
  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !/favicon|_next\/image/.test(url)) {
      responses.push({ route: current, status, url });
    }
  });

  try {
    await login(page, username);
    const { routes, expectations } = await discoverRoutes(page, username);
    const viewports = [
      { name: "desktop", width: 1280, height: 900 },
      { name: "mobile", width: 390, height: 844 },
    ];

    for (const expectation of expectations) {
      if (!expectation.ok) {
        issues.push({
          route: "data-expectations",
          type: expectation.type,
          detail: expectation.detail,
        });
      }
    }

    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      for (const route of routes) {
        current = `${username}:${viewport.name}:${route.label}`;
        await gotoWithRetry(page, `${BASE_URL}${route.url}`, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForTimeout(900);

        const inspection = await inspectPage(page);
        const interactions = await runInteractions(page, route.label);
        const screenshotPath = path.join(
          userOutDir,
          `${viewport.name}-${sanitize(route.label)}.png`,
        );
        await page.screenshot({ path: screenshotPath, fullPage: false });
        screenshots.push(screenshotPath);

        results.push({
          route: route.url,
          label: route.label,
          viewport,
          url: page.url(),
          inspection,
          interactions,
          screenshotPath,
        });

        if (inspection.bodyTextLength < 25) {
          issues.push({
            route: current,
            type: "blank-or-thin-page",
            detail: inspection.bodyTextLength,
          });
        }
        if (inspection.overlay) {
          issues.push({ route: current, type: "framework-overlay" });
        }
        if (inspection.rawPlaceholder) {
          issues.push({ route: current, type: "raw-placeholder" });
        }
        if (inspection.horizontalOverflow > 2) {
          issues.push({
            route: current,
            type: "horizontal-overflow",
            detail: inspection.horizontalOverflow,
          });
        }
        for (const target of inspection.smallTargets) {
          issues.push({
            route: current,
            type: "small-click-target",
            detail: target,
          });
        }
        for (const interaction of interactions) {
          if (!interaction.ok) {
            issues.push({
              route: current,
              type: "interaction-failed",
              detail: interaction,
            });
          }
        }
      }
    }
  } catch (error) {
    issues.push({
      route: current,
      type: "audit-crash",
      detail: error instanceof Error ? error.message : String(error),
    });
    const crashScreenshot = path.join(userOutDir, "audit-crash.png");
    await page
      .screenshot({ path: crashScreenshot, fullPage: false })
      .catch(() => null);
    screenshots.push(crashScreenshot);
  } finally {
    await context.close().catch(() => null);
  }

  const relevantLogs = logs.filter((entry) =>
    /MISSING_MESSAGE|Unhandled|hydration|TypeError|ReferenceError|SyntaxError|Failed to load resource/i.test(
      entry.text,
    ),
  );
  for (const log of relevantLogs) {
    issues.push({ route: log.route, type: "console", detail: log });
  }
  for (const error of pageErrors) {
    issues.push({ route: error.route, type: "pageerror", detail: error });
  }
  for (const response of responses) {
    issues.push({
      route: response.route,
      type: "http-status",
      detail: response,
    });
  }

  const payload = {
    username,
    baseUrl: BASE_URL,
    apiUrl: API_URL,
    outDir: userOutDir,
    checkedStates: results.length,
    issueCount: issues.length,
    issues,
    results,
    logs,
    responses,
    pageErrors,
    screenshots,
  };
  fs.writeFileSync(
    path.join(userOutDir, "result.json"),
    JSON.stringify(payload, null, 2),
    "utf8",
  );

  return payload;
}

function writeRunSummary(userResults) {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const userSummaries = userResults.map((result) => ({
    username: result.username,
    outDir: result.outDir,
    checkedStates: result.checkedStates,
    issueCount: result.issueCount,
    firstIssues: result.issues.slice(0, 5),
  }));
  const summary = {
    baseUrl: BASE_URL,
    apiUrl: API_URL,
    outDir: OUT_DIR,
    generatedAt: new Date().toISOString(),
    totalUsers: userResults.length,
    passedUsers: userSummaries.filter((item) => item.issueCount === 0).length,
    failedUsers: userSummaries.filter((item) => item.issueCount > 0).length,
    totalIssues: userSummaries.reduce((sum, item) => sum + item.issueCount, 0),
    userSummaries,
  };

  fs.writeFileSync(
    path.join(OUT_DIR, "summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );

  const index = [
    "# STGP UX Role Audit",
    "",
    `- Base URL: ${BASE_URL}`,
    `- API URL: ${API_URL}`,
    `- Generated at: ${summary.generatedAt}`,
    `- Users: ${summary.passedUsers}/${summary.totalUsers} passed`,
    `- Total issues: ${summary.totalIssues}`,
    "",
    "| User | Checked states | Issues | Result directory |",
    "|---|---:|---:|---|",
    ...userSummaries.map(
      (item) =>
        `| ${item.username} | ${item.checkedStates} | ${item.issueCount} | ${item.outDir} |`,
    ),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(OUT_DIR, "index.md"), index, "utf8");

  return summary;
}

test.describe("STGP UX role audit", () => {
  test("STGP UX role audit - all configured users", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(
      Math.max(TEST_TIMEOUT_MS, TEST_TIMEOUT_MS * USERS.length),
    );
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const userResults = [];
    for (const username of USERS) {
      userResults.push(await auditUser(browser, username));
    }

    const summary = writeRunSummary(userResults);
    const failures = summary.userSummaries.filter(
      (item) => item.issueCount > 0,
    );

    expect(
      failures,
      JSON.stringify(
        {
          outDir: OUT_DIR,
          passedUsers: summary.passedUsers,
          failedUsers: summary.failedUsers,
          totalIssues: summary.totalIssues,
          failures,
        },
        null,
        2,
      ),
    ).toEqual([]);
  });
});
