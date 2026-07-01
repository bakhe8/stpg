const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { test, expect } = require("@playwright/test");

const FRONTEND_ROOT = path.resolve(__dirname, "..");
const API_URL = process.env.API_URL || "http://localhost:3001/api";
const LEGACY_PORT = Number(process.env.PHASE_D_LEGACY_PORT || 3100);
const NEW_FLOW_PORT = Number(process.env.PHASE_D_NEW_PORT || 3333);
const DEFAULT_FLOW_PORT = Number(process.env.PHASE_D_DEFAULT_PORT || 3100);
const USERNAME = process.env.PHASE_D_SMOKE_USER || "seed.ahmed.family";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_DIR =
  process.env.STGP_PHASE_D_SMOKE_OUT_DIR ||
  path.join(os.tmpdir(), `stgp-phase-d-create-flow-smoke-${STAMP}`);

const READINESS_TIMEOUT_MS = Number(
  process.env.PHASE_D_READINESS_TIMEOUT_MS || 90000,
);
const RETRY_LIMIT = Number(process.env.PHASE_D_RETRY_LIMIT || 3);
const RETRY_BASE_MS = Number(process.env.PHASE_D_RETRY_BASE_MS || 700);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function pushLog(logs, source, chunk) {
  const text = chunk.toString().trim();
  if (!text) return;
  logs.push(
    ...text
      .split(/\r?\n/)
      .map((line) => `[${source}] ${line}`)
      .slice(-80),
  );
  if (logs.length > 160) logs.splice(0, logs.length - 160);
}

function assertValidPort(port, name) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a valid TCP port, got ${port}`);
  }
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    let settled = false;

    function done(value) {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    }

    socket.once("connect", () => done(false));
    socket.once("error", () => done(true));
    socket.setTimeout(1000, () => done(true));
  });
}

function nextCommandArgs(port) {
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/c", `npm exec -- next dev -p ${port}`],
    };
  }

  return {
    command: "npm",
    args: ["exec", "--", "next", "dev", "-p", String(port)],
  };
}

async function waitForReady(baseUrl, child, logs) {
  const started = Date.now();
  let lastError = "";

  while (Date.now() - started < READINESS_TIMEOUT_MS) {
    if (child.exitCode !== null) {
      throw new Error(
        `Next dev server exited before becoming ready.\n${logs.join("\n")}`,
      );
    }

    try {
      const response = await fetch(`${baseUrl}/login`, {
        redirect: "manual",
        signal: AbortSignal.timeout(2500),
      });
      if (response.status < 500) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await sleep(600);
  }

  throw new Error(
    `Timed out waiting for ${baseUrl}. Last error: ${lastError}\n${logs.join(
      "\n",
    )}`,
  );
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;

  await new Promise((resolve) => {
    let settled = false;
    function done() {
      if (settled) return;
      settled = true;
      resolve();
    }

    child.once("exit", done);

    if (process.platform === "win32" && child.pid) {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      killer.once("exit", done);
      killer.once("error", () => {
        child.kill();
        setTimeout(done, 1000);
      });
    } else {
      child.kill("SIGTERM");
      setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
      }, 2500);
    }

    setTimeout(done, 6000);
  });
}

async function withNextServer({ port, enableFundFlow }, callback) {
  const portName =
    enableFundFlow === false
      ? "PHASE_D_LEGACY_PORT"
      : enableFundFlow === true
        ? "PHASE_D_NEW_PORT"
        : "PHASE_D_DEFAULT_PORT";
  assertValidPort(port, portName);

  if (!(await isPortFree(port))) {
    throw new Error(
      `Port ${port} is already in use. Stop that listener or set ${
        portName
      } to a free port allowed by backend CORS.`,
    );
  }

  const logs = [];
  const { command, args } = nextCommandArgs(port);
  const childEnv = {
    ...process.env,
    API_URL,
    NEXT_PUBLIC_API_URL: API_URL,
    NEXT_PUBLIC_ENABLE_DEV_LOGIN: "true",
  };

  if (enableFundFlow === false) {
    childEnv.NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW = "false";
  } else if (enableFundFlow === true) {
    childEnv.NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW = "true";
  } else {
    childEnv.NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW = "";
  }

  const child = spawn(command, args, {
    cwd: FRONTEND_ROOT,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => pushLog(logs, "next", chunk));
  child.stderr.on("data", (chunk) => pushLog(logs, "next:err", chunk));

  const baseUrl = `http://localhost:${port}`;

  try {
    await waitForReady(baseUrl, child, logs);
    return await callback(baseUrl, logs);
  } finally {
    await stopProcess(child);
  }
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

async function login(page, baseUrl) {
  await gotoWithRetry(page, `${baseUrl}/login`, {
    waitUntil: "domcontentloaded",
  });

  const usernameInput = page.locator("#username-input");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await usernameInput.isVisible().catch(() => false)) break;
    await page
      .getByRole("button", { name: /دخول المطورين|Developer Sign In/i })
      .click();
    await usernameInput.waitFor({ state: "visible", timeout: 2500 }).catch(
      () => null,
    );
  }

  await expect(usernameInput).toBeVisible({ timeout: 10000 });
  await page.locator("#username-input").fill(USERNAME);
  await page.getByRole("button", { name: /دخول تطويري|Developer Sign In/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("aside nav", { timeout: 15000 });
}

async function passPreGateIfPresent(page) {
  const button = page.getByRole("button", {
    name: /فهمت.*ابدأ الإنشاء|Understood.*start creating/i,
  });
  if (await button.isVisible().catch(() => false)) {
    await button.click();
  }
}

function collectPageHealth(page, label) {
  const issues = [];

  page.on("pageerror", (error) => {
    issues.push({ label, type: "pageerror", text: error.message });
  });
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/favicon|Failed to load resource: the server responded with a status of 404/i.test(text)) {
      return;
    }
    issues.push({ label, type: "console", text });
  });
  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 500 && !/_next\/static|favicon/.test(url)) {
      issues.push({ label, type: "http", status, url });
    }
  });

  return issues;
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText?.trim() || "";
    const overlayText =
      /Unhandled Runtime Error|Application error|This page could not be found|NEXT_REDIRECT/i.test(
        text,
      );
    const overlayDom = Boolean(
      document.querySelector(
        "[data-nextjs-dialog-overlay], [data-nextjs-error-overlay]",
      ),
    );

    return {
      title: document.title,
      url: window.location.href,
      textLength: text.length,
      overlay: overlayText || overlayDom,
      sample: text.replace(/\s+/g, " ").slice(0, 500),
    };
  });
}

async function expectHealthyRenderedPage(page, label) {
  const inspection = await inspectPage(page);
  expect(inspection.textLength, `${label}: page should not be blank`).toBeGreaterThan(80);
  expect(inspection.overlay, `${label}: should not show framework overlay`).toBe(false);
  return inspection;
}

async function writeScreenshot(page, name) {
  ensureOutDir();
  const filePath = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
}

async function writeSummary(name, payload) {
  ensureOutDir();
  fs.writeFileSync(
    path.join(OUT_DIR, `${name}.json`),
    JSON.stringify(payload, null, 2),
    "utf8",
  );
}

function fundChoiceButton(page) {
  return page
    .locator("button")
    .filter({ hasText: /صندوق|Fund/i })
    .filter({ hasText: /مساحة دائمة|durable space/i });
}

function campaignChoiceButton(page) {
  return page
    .locator("button")
    .filter({ hasText: /حملة|Campaign/i })
    .filter({ hasText: /مبادرة مؤقتة|time-limited initiative/i });
}

async function expectNewCreateChoice(page) {
  await expect(page.getByText(/ماذا تريد أن تنشئ|What do you want to create/i)).toBeVisible();
  await expect(fundChoiceButton(page)).toBeVisible();
  await expect(campaignChoiceButton(page)).toBeVisible();
  await expect(page.getByRole("button", { name: /استخدام النموذج القديم|Use legacy form/i })).toBeVisible();
  await expect(page.getByText(/اختر نوع الكيان|Choose entity type/i)).toHaveCount(0);
}

test.describe.configure({ mode: "serial" });
test.use({ locale: "ar-SA", viewport: { width: 1280, height: 900 } });

test.describe("Phase D create flow feature flag smoke", () => {
  test("flag off keeps the legacy entity wizard", async ({ page }) => {
    test.setTimeout(140000);
    const healthIssues = collectPageHealth(page, "flag-off");

    await withNextServer({ port: LEGACY_PORT, enableFundFlow: false }, async (baseUrl) => {
      await login(page, baseUrl);
      await gotoWithRetry(page, `${baseUrl}/entities/new`, {
        waitUntil: "domcontentloaded",
      });
      await passPreGateIfPresent(page);

      await expect(page.getByText(/اختر نوع الكيان|Choose entity type/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /عائلة|Family/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /عمارة|Building/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /حي|Neighborhood/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /قبيلة|Tribe/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /حملة مؤقتة|Temporary Campaign/i })).toBeVisible();
      await expect(page.getByText(/ماذا تريد أن تنشئ|What do you want to create/i)).toHaveCount(0);

      const inspection = await expectHealthyRenderedPage(page, "flag-off legacy wizard");
      const screenshot = await writeScreenshot(page, "flag-off-legacy-wizard");
      await writeSummary("flag-off", {
        baseUrl,
        apiUrl: API_URL,
        screenshot,
        inspection,
        healthIssues,
      });
    });

    expect(healthIssues).toEqual([]);
  });

  test("flag on exposes fund and campaign paths without removing fallback", async ({
    page,
  }) => {
    test.setTimeout(170000);
    const healthIssues = collectPageHealth(page, "flag-on");

    await withNextServer({ port: NEW_FLOW_PORT, enableFundFlow: true }, async (baseUrl) => {
      await login(page, baseUrl);
      await gotoWithRetry(page, `${baseUrl}/entities/new`, {
        waitUntil: "domcontentloaded",
      });
      await passPreGateIfPresent(page);

      await expectNewCreateChoice(page);
      const choiceInspection = await expectHealthyRenderedPage(page, "flag-on choice screen");
      const choiceScreenshot = await writeScreenshot(page, "flag-on-choice");

      await fundChoiceButton(page).click();
      await expect(page.getByText(/طريقة بدء الصندوق|Fund starting mode/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /ابدأ فارغاً|Start empty/i })).toBeVisible();
      await expect(page.getByText(/تكافل ومساعدات|Mutual aid/i)).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/خدمات مشتركة|Shared services/i)).toBeVisible();
      await expect(page.getByText(/دعم وتبرعات|Support/i)).toBeVisible();
      await expect(page.getByText(/اختر قالباً جاهزاً|Choose a Ready Template/i)).toHaveCount(0);
      const fundInspection = await expectHealthyRenderedPage(page, "flag-on fund form");
      const fundScreenshot = await writeScreenshot(page, "flag-on-fund-form");

      await gotoWithRetry(page, `${baseUrl}/entities/new`, {
        waitUntil: "domcontentloaded",
      });
      await passPreGateIfPresent(page);
      await campaignChoiceButton(page).click();
      await expect(page.getByText(/خريطة تشغيل الحملة|Campaign operating map/i)).toBeVisible();
      await expect(page.getByText(/الصندوق الأب|Parent fund/i)).toBeVisible();
      await expect(page.getByText(/بعد الإنشاء|After creation/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /إنشاء الحملة|Create campaign/i })).toBeVisible();
      const campaignInspection = await expectHealthyRenderedPage(page, "flag-on campaign form");
      const campaignScreenshot = await writeScreenshot(page, "flag-on-campaign-form");

      await writeSummary("flag-on", {
        baseUrl,
        apiUrl: API_URL,
        screenshots: [choiceScreenshot, fundScreenshot, campaignScreenshot],
        inspections: [choiceInspection, fundInspection, campaignInspection],
        healthIssues,
      });
    });

    expect(healthIssues).toEqual([]);
  });

  test("default value uses the new fund and campaign choice screen", async ({
    page,
  }) => {
    test.setTimeout(140000);
    const healthIssues = collectPageHealth(page, "default");

    await withNextServer({ port: DEFAULT_FLOW_PORT, enableFundFlow: undefined }, async (baseUrl) => {
      await login(page, baseUrl);
      await gotoWithRetry(page, `${baseUrl}/entities/new`, {
        waitUntil: "domcontentloaded",
      });
      await passPreGateIfPresent(page);

      await expectNewCreateChoice(page);
      const inspection = await expectHealthyRenderedPage(page, "default choice screen");
      const screenshot = await writeScreenshot(page, "default-choice");
      await writeSummary("default", {
        baseUrl,
        apiUrl: API_URL,
        screenshot,
        inspection,
        healthIssues,
      });
    });

    expect(healthIssues).toEqual([]);
  });
});
