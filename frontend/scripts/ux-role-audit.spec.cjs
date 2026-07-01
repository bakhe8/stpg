const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_URL = process.env.API_URL || "http://localhost:3001/api";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_DIR =
  process.env.STGP_UX_OUT_DIR ||
  path.join(os.tmpdir(), `stgp-ux-role-surface-audit-${STAMP}`);

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

const TEST_TIMEOUT_MS = Number(process.env.STGP_UX_TEST_TIMEOUT_MS || 180000);
const RETRY_LIMIT = Number(process.env.STGP_UX_RETRY_LIMIT || 3);
const RETRY_BASE_MS = Number(process.env.STGP_UX_RETRY_BASE_MS || 700);

const MEMBER_SURFACES = new Set([
  "MEMBER",
  "MULTI_ENTITY_MEMBER",
  "CONDITIONAL_MEMBER",
  "SUSPENDED_MEMBER",
  "EXITED_MEMBER",
  "SUPPORTER_ONLY",
  "READ_ONLY_MEMBER",
  "PENDING_REVIEW_MEMBER",
]);

const DAILY_NAV_BY_SURFACE = {
  FOUNDER: {
    required: ["حالتك الآن", "مركز المراجعات", "الإشعارات"],
    forbidden: [
      "المالية",
      "المراجع",
      "النزاعات",
      "القرارات",
      "اللجان",
      "الصرف",
      "الصناديق",
      "المستفيدون",
      "التحليلات",
      "القواعد",
      "المستندات",
    ],
  },
  ADMIN: {
    required: ["حالتك الآن", "مركز المراجعات", "الإشعارات"],
    forbidden: [
      "المالية",
      "المراجع",
      "النزاعات",
      "القرارات",
      "اللجان",
      "الصرف",
      "الصناديق",
      "المستفيدون",
      "التحليلات",
      "القواعد",
      "المستندات",
    ],
  },
  TREASURER: {
    required: ["حالتك الآن", "المالية", "الإشعارات"],
    forbidden: [
      "مركز المراجعات",
      "المراجع",
      "النزاعات",
      "القرارات",
      "اللجان",
      "الصرف",
      "الصناديق",
      "المستفيدون",
      "التحليلات",
      "القواعد",
      "المستندات",
    ],
  },
  AUDITOR: {
    required: ["حالتك الآن", "المراجع", "الإشعارات"],
    forbidden: [
      "مركز المراجعات",
      "المالية",
      "النزاعات",
      "القرارات",
      "اللجان",
      "الصرف",
      "الصناديق",
      "المستفيدون",
      "التحليلات",
      "القواعد",
      "المستندات",
    ],
  },
  COMMITTEE_MEMBER: {
    required: ["حالتك الآن", "اللجان", "الإشعارات"],
    forbidden: [
      "مركز المراجعات",
      "المالية",
      "المراجع",
      "النزاعات",
      "القرارات",
      "الصرف",
      "الصناديق",
      "المستفيدون",
      "التحليلات",
      "القواعد",
      "المستندات",
    ],
  },
  MEMBER: {
    required: ["حالتك الآن", "الإشعارات"],
    forbidden: [
      "مركز المراجعات",
      "المالية",
      "المراجع",
      "النزاعات",
      "القرارات",
      "اللجان",
      "الصرف",
      "الصناديق",
      "المستفيدون",
      "التحليلات",
      "القواعد",
      "المستندات",
    ],
  },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitize(name) {
  return name
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function includesText(haystack, needle) {
  const cleanNeedle = normalizeText(needle);
  if (!cleanNeedle) return false;
  return normalizeText(haystack).includes(cleanNeedle);
}

function containsAny(bodyText, candidates) {
  return candidates.some((candidate) => includesText(bodyText, candidate));
}

function navLabel(item) {
  return normalizeText(item).replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

function hasNavLabel(items, label) {
  return items.some((item) => navLabel(item) === label);
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

async function login(page, username) {
  await gotoWithRetry(page, `${BASE_URL}/login`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: /دخول المطورين|Developer/i }).click();
  await page.locator("#username-input").fill(username);
  await page.getByRole("button", { name: /دخول تطويري|Dev/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("aside nav", { timeout: 15000 });
  await page.waitForTimeout(900);
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

async function readSession(page) {
  const token = await page.evaluate(() => localStorage.getItem("accessToken"));
  if (!token) throw new Error("missing access token after login");

  const [surface, entities] = await Promise.all([
    apiGet(token, "/work-surface/me"),
    apiGet(token, "/entities/mine"),
  ]);

  return { token, surface, entities };
}

async function visibleChromeState(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    };
    const clean = (el) => el.innerText.replace(/\s+/g, " ").trim();

    return {
      dailyLinks: Array.from(document.querySelectorAll("aside nav a"))
        .filter(visible)
        .map(clean)
        .filter(Boolean),
      advancedSummaries: Array.from(
        document.querySelectorAll("aside nav summary"),
      )
        .filter(visible)
        .map(clean)
        .filter(Boolean),
      bottomNav: Array.from(
        document.querySelectorAll("nav[class*='bar'] a, nav[class*='bar'] button"),
      )
        .filter(visible)
        .map(clean)
        .filter(Boolean),
      bodyText: document.body?.innerText || "",
    };
  });
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
      if (type === "hidden" || el.getAttribute("aria-hidden") === "true") {
        continue;
      }
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

function navRuleFor(surfaceKind) {
  if (MEMBER_SURFACES.has(surfaceKind)) return DAILY_NAV_BY_SURFACE.MEMBER;
  return DAILY_NAV_BY_SURFACE[surfaceKind] || DAILY_NAV_BY_SURFACE.MEMBER;
}

function addIssue(issues, question, type, detail) {
  issues.push({ question, type, detail });
}

function verifyDailyNavigation(issues, surface, chrome, viewportName) {
  const rule = navRuleFor(surface.surfaceKind);
  const visibleLinks =
    viewportName === "mobile" ? chrome.bottomNav : chrome.dailyLinks;
  const joined = visibleLinks.join(" | ");

  for (const label of rule.required) {
    if (!hasNavLabel(visibleLinks, label)) {
      addIssue(issues, "daily-navigation", "missing-daily-link", {
        viewport: viewportName,
        label,
        visibleLinks,
        surfaceKind: surface.surfaceKind,
      });
    }
  }

  for (const label of rule.forbidden) {
    if (hasNavLabel(visibleLinks, label)) {
      addIssue(issues, "daily-navigation", "deep-tool-visible-daily", {
        viewport: viewportName,
        label,
        visibleLinks,
        surfaceKind: surface.surfaceKind,
      });
    }
  }

  if (visibleLinks.length > (viewportName === "mobile" ? 4 : 3)) {
    addIssue(issues, "daily-navigation", "too-many-daily-links", {
      viewport: viewportName,
      count: visibleLinks.length,
      visibleLinks,
      surfaceKind: surface.surfaceKind,
      joined,
    });
  }
}

function verifySurfaceQuestions(issues, surface, bodyText) {
  const body = normalizeText(bodyText);
  const primaryTitle = surface.primaryMessage?.title;

  if (!primaryTitle || !includesText(body, primaryTitle)) {
    addIssue(issues, "what-now", "primary-message-not-visible", {
      primaryTitle,
      surfaceKind: surface.surfaceKind,
    });
  }

  const actionCandidates = [
    ...(surface.requiredActions || []).flatMap((item) => [
      item.title,
      item.body,
      item.nextStep,
      item.cta?.label,
    ]),
    ...(surface.exceptions || []).flatMap((item) => [
      item.title,
      item.body,
      item.impact,
      item.whyShown,
      item.cta?.label,
    ]),
  ].filter(Boolean);

  if (actionCandidates.length > 0 && !containsAny(body, actionCandidates)) {
    addIssue(issues, "what-is-required", "action-or-exception-not-visible", {
      sample: actionCandidates.slice(0, 6),
      surfaceKind: surface.surfaceKind,
    });
  }

  if (
    actionCandidates.length === 0 &&
    !primaryTitle &&
    !/لا يوجد مطلوب|متابعة هادئة|للمتابعة فقط/.test(body)
  ) {
    addIssue(issues, "what-is-required", "quiet-state-not-clear", {
      primaryTitle,
      surfaceKind: surface.surfaceKind,
    });
  }

  const benefitCandidates = [
    ...(surface.benefitSummary?.items || []).flatMap((item) => [
      item.title,
      item.body,
    ]),
    ...(surface.sharedBenefitSummary?.items || []).flatMap((item) => [
      item.title,
      item.benefitText,
      item.coverageText,
      item.userContributionText,
    ]),
    ...(surface.contextSummaries || []).flatMap((item) => [
      item.label,
      item.benefitText,
      item.moneyText,
      item.attentionText,
    ]),
  ].filter(Boolean);

  if (benefitCandidates.length > 0 && !containsAny(body, benefitCandidates)) {
    addIssue(issues, "what-do-i-benefit", "benefit-context-not-visible", {
      sample: benefitCandidates.slice(0, 8),
      surfaceKind: surface.surfaceKind,
    });
  }

  const blockedCandidates = [
    ...(surface.blockedCapabilities || []).flatMap((item) => [
      item.title,
      item.reason,
      item.contextLabel,
      item.fixCta?.label,
    ]),
    ...(surface.nonOperationalSummary?.items || []).flatMap((item) => [
      item.title,
      item.whatThisMeans,
      item.nextStep,
      item.whyShown,
      ...(item.blockedActions || []),
      ...(item.allowedActions || []),
    ]),
  ].filter(Boolean);

  if (blockedCandidates.length > 0 && !containsAny(body, blockedCandidates)) {
    addIssue(issues, "what-is-blocked-and-why", "blocked-reason-not-visible", {
      sample: blockedCandidates.slice(0, 8),
      surfaceKind: surface.surfaceKind,
    });
  }

  const contexts = surface.contextSummaries || [];
  if (contexts.length > 1) {
    const labelsShown = contexts.filter((item) => includesText(body, item.label));
    const uniqueIds = new Set(contexts.map((item) => item.id));

    if (labelsShown.length < Math.min(2, contexts.length)) {
      addIssue(issues, "entity-mixing", "multi-context-labels-not-visible", {
        expectedLabels: contexts.map((item) => item.label),
        labelsShown: labelsShown.map((item) => item.label),
        surfaceKind: surface.surfaceKind,
      });
    }
    if (uniqueIds.size !== contexts.length) {
      addIssue(issues, "entity-mixing", "duplicate-context-ids", {
        contextIds: contexts.map((item) => item.id),
        surfaceKind: surface.surfaceKind,
      });
    }
  }
}

function verifySeedStoryCoverage(issues, username, surface, entities) {
  const entityTags = entities.map(
    (entity) =>
      `${entity.type}:${entity.myRole}:${entity.platformStatus || "ACTIVE"}`,
  );
  const contextLabels = (surface.contextSummaries || []).map((item) => item.label);
  const contextKinds = (surface.activeContexts || []).map((item) => item.kind);
  const nonOperational = surface.nonOperationalSummary || {};

  const checks = {
    "seed.faisal.overlap": [
      (surface.contextSummaries || []).length >= 2,
      "multi-entity member must show more than one context",
    ],
    "seed.khaled.suspended": [
      surface.surfaceKind === "SUSPENDED_MEMBER" ||
        (nonOperational.suspendedCount || 0) > 0 ||
        (surface.blockedCapabilities || []).some((item) =>
          /موقوف|معل/.test(`${item.title} ${item.reason}`),
        ),
      "suspended member state must be represented",
    ],
    "seed.abdullah.building": [
      surface.surfaceKind === "FOUNDER" &&
        entities.some(
          (entity) => entity.type === "BUILDING" && entity.myRole === "FOUNDER",
        ),
      "building founder story must be represented",
    ],
    "seed.yahya.neighborhood": [
      surface.surfaceKind === "FOUNDER" &&
        (nonOperational.pendingReviewCount || 0) > 0,
      "neighborhood founder with pending review entity must be represented",
    ],
    "seed.fahad.case": [
      surface.surfaceKind === "READ_ONLY_MEMBER" ||
        (nonOperational.readOnlyCount || 0) > 0 ||
        contextKinds.includes("CAMPAIGN"),
      "read-only medical campaign story must be represented",
    ],
    "seed.omar.youth": [
      (nonOperational.suspendedCount || 0) > 0 ||
        entities.some((entity) => entity.platformStatus === "SUSPENDED"),
      "suspended community admin story must be represented",
    ],
    "seed.huda.exited": [
      surface.surfaceKind === "EXITED_MEMBER" ||
        (surface.blockedCapabilities || []).some((item) =>
          /خارج|Exited|منته/.test(`${item.title} ${item.reason}`),
        ),
      "exited member story must be represented",
    ],
    "seed.amal.conditional": [
      surface.surfaceKind === "CONDITIONAL_MEMBER" ||
        (surface.blockedCapabilities || []).some((item) =>
          /مشروط|شرط/.test(`${item.title} ${item.reason}`),
        ),
      "conditional member story must be represented",
    ],
    "seed.mariam.family": [
      (nonOperational.suspendedCount || 0) > 0 ||
        entities.some((entity) => entity.platformStatus === "SUSPENDED"),
      "suspended community member story must be represented",
    ],
    "seed.abdulrahman.tribe": [
      surface.surfaceKind === "FOUNDER" &&
        entities.some(
          (entity) => entity.type === "TRIBE" && entity.myRole === "FOUNDER",
        ),
      "tribe founder story must be represented",
    ],
    "seed.mona.building": [
      ["ADMIN", "TREASURER"].includes(surface.surfaceKind) ||
        entities.some(
          (entity) =>
            entity.type === "BUILDING" &&
            ["ADMIN", "TREASURER"].includes(entity.myRole),
        ),
      "building admin/treasurer story must be represented",
    ],
    "seed.reem.overlap": [
      (surface.contextSummaries || []).length >= 4,
      "wide overlap member must show four or more contexts",
    ],
  };

  const check = checks[username];
  if (check && !check[0]) {
    addIssue(issues, "seed-story-coverage", "seed-story-not-covered", {
      message: check[1],
      surfaceKind: surface.surfaceKind,
      entityTags,
      contextLabels,
      nonOperational,
    });
  }
}

async function verifyAdvancedTools(page, issues, surface) {
  if (!surface.advancedTools?.length) return [];

  const summary = page.locator("aside nav summary").first();
  if (!(await summary.isVisible().catch(() => false))) {
    addIssue(issues, "advanced-tools", "advanced-summary-missing", {
      expectedTools: surface.advancedTools.map((item) => item.label),
    });
    return [];
  }

  await summary.click();
  await page.waitForTimeout(250);
  const state = await visibleChromeState(page);
  const missing = surface.advancedTools
    .map((item) => item.label)
    .filter((label) => !state.dailyLinks.some((link) => link.includes(label)));

  if (missing.length > 0) {
    addIssue(issues, "advanced-tools", "advanced-tool-link-missing", {
      missing,
      visibleLinks: state.dailyLinks,
    });
  }

  return state.dailyLinks;
}

async function verifyDirectDenyForMember(page, issues, surface) {
  if (!MEMBER_SURFACES.has(surface.surfaceKind)) return null;

  await gotoWithRetry(page, `${BASE_URL}/finance`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(700);
  const state = await visibleChromeState(page);
  const denied = /ليست ضمن صلاحيات دورك|لا تملك صلاحية|not within your role/i.test(
    state.bodyText,
  );

  if (!denied) {
    addIssue(issues, "direct-route-permission", "finance-not-denied", {
      surfaceKind: surface.surfaceKind,
      bodySample: normalizeText(state.bodyText).slice(0, 500),
    });
  }

  return { route: "/finance", denied };
}

function addInspectionIssues(issues, question, inspection, detail) {
  if (inspection.bodyTextLength < 25) {
    addIssue(issues, question, "blank-or-thin-page", {
      ...detail,
      bodyTextLength: inspection.bodyTextLength,
    });
  }
  if (inspection.overlay) {
    addIssue(issues, question, "framework-overlay", detail);
  }
  if (inspection.rawPlaceholder) {
    addIssue(issues, question, "raw-placeholder", detail);
  }
  if (inspection.horizontalOverflow > 2) {
    addIssue(issues, question, "horizontal-overflow", {
      ...detail,
      horizontalOverflow: inspection.horizontalOverflow,
    });
  }
  for (const target of inspection.smallTargets) {
    addIssue(issues, question, "small-click-target", {
      ...detail,
      target,
    });
  }
}

async function auditUser(browser, username) {
  const userOutDir = path.join(OUT_DIR, sanitize(username));
  fs.mkdirSync(userOutDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const logs = [];
  const responses = [];
  const pageErrors = [];
  const issues = [];
  const screenshots = [];
  const checks = [];
  let current = "bootstrap";

  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      logs.push({ route: current, type: msg.type(), text: msg.text() });
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push({ route: current, text: err.message });
  });
  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !/favicon|_next\/image/.test(url)) {
      responses.push({ route: current, status, url });
    }
  });

  try {
    current = `${username}:login`;
    await login(page, username);
    const { surface, entities } = await readSession(page);

    current = `${username}:desktop-dashboard`;
    await gotoWithRetry(page, `${BASE_URL}/dashboard`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1100);
    const desktopChrome = await visibleChromeState(page);
    const desktopInspection = await inspectPage(page);
    verifyDailyNavigation(issues, surface, desktopChrome, "desktop");
    verifySurfaceQuestions(issues, surface, desktopChrome.bodyText);
    verifySeedStoryCoverage(issues, username, surface, entities);
    addInspectionIssues(issues, "desktop-dashboard-health", desktopInspection, {
      viewport: "desktop",
      surfaceKind: surface.surfaceKind,
    });

    const desktopScreenshot = path.join(userOutDir, "desktop-dashboard.png");
    await page.screenshot({ path: desktopScreenshot, fullPage: false });
    screenshots.push(desktopScreenshot);

    current = `${username}:advanced-tools`;
    const advancedLinks = await verifyAdvancedTools(page, issues, surface);
    const advancedScreenshot = path.join(userOutDir, "desktop-advanced.png");
    await page.screenshot({ path: advancedScreenshot, fullPage: false });
    screenshots.push(advancedScreenshot);

    current = `${username}:mobile-dashboard`;
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoWithRetry(page, `${BASE_URL}/dashboard`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1100);
    const mobileChrome = await visibleChromeState(page);
    const mobileInspection = await inspectPage(page);
    verifyDailyNavigation(issues, surface, mobileChrome, "mobile");
    addInspectionIssues(issues, "mobile-dashboard-health", mobileInspection, {
      viewport: "mobile",
      surfaceKind: surface.surfaceKind,
    });

    const mobileScreenshot = path.join(userOutDir, "mobile-dashboard.png");
    await page.screenshot({ path: mobileScreenshot, fullPage: false });
    screenshots.push(mobileScreenshot);

    current = `${username}:direct-route-permission`;
    const directDeny = await verifyDirectDenyForMember(page, issues, surface);
    const directScreenshot = path.join(userOutDir, "direct-route-check.png");
    await page.screenshot({ path: directScreenshot, fullPage: false }).catch(
      () => null,
    );
    screenshots.push(directScreenshot);

    checks.push({
      surfaceKind: surface.surfaceKind,
      primaryMessage: surface.primaryMessage?.title,
      dailyLinks: desktopChrome.dailyLinks,
      advancedSummaries: desktopChrome.advancedSummaries,
      advancedLinks,
      mobileBottomNav: mobileChrome.bottomNav,
      advancedToolCount: surface.advancedTools?.length || 0,
      requiredActionCount: surface.requiredActions?.length || 0,
      exceptionCount: surface.exceptions?.length || 0,
      contextCount: surface.contextSummaries?.length || 0,
      blockedCapabilityCount: surface.blockedCapabilities?.length || 0,
      nonOperationalVisible: Boolean(surface.nonOperationalSummary?.isVisible),
      sharedBenefitVisible: Boolean(surface.sharedBenefitSummary?.isVisible),
      directDeny,
    });
  } catch (error) {
    addIssue(issues, "audit-runtime", "audit-crash", {
      route: current,
      message: error instanceof Error ? error.message : String(error),
    });
    const crashScreenshot = path.join(userOutDir, "audit-crash.png");
    await page.screenshot({ path: crashScreenshot, fullPage: false }).catch(
      () => null,
    );
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
    addIssue(issues, "console-health", "console", log);
  }
  for (const error of pageErrors) {
    addIssue(issues, "console-health", "pageerror", error);
  }
  for (const response of responses) {
    if (response.status === 429 || response.status >= 500) {
      addIssue(issues, "http-health", "http-status", response);
    } else if (
      response.status === 403 &&
      !String(response.route).includes("direct-route-permission")
    ) {
      addIssue(issues, "http-health", "unexpected-403", response);
    }
  }

  const payload = {
    username,
    baseUrl: BASE_URL,
    apiUrl: API_URL,
    outDir: userOutDir,
    checkedStates: checks.length,
    issueCount: issues.length,
    issues,
    checks,
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
    surfaceKind: result.checks[0]?.surfaceKind || "UNKNOWN",
    dailyLinks: result.checks[0]?.dailyLinks || [],
    mobileBottomNav: result.checks[0]?.mobileBottomNav || [],
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
    questionsCovered: [
      "what-now",
      "what-is-required",
      "what-do-i-benefit",
      "what-is-blocked-and-why",
      "entity-mixing",
      "daily-navigation",
      "advanced-tools",
      "direct-route-permission",
      "mobile-dashboard-health",
      "http-health",
    ],
    userSummaries,
  };

  fs.writeFileSync(
    path.join(OUT_DIR, "summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );

  const index = [
    "# STGP UX Role Surface Audit",
    "",
    `- Base URL: ${BASE_URL}`,
    `- API URL: ${API_URL}`,
    `- Generated at: ${summary.generatedAt}`,
    `- Users: ${summary.passedUsers}/${summary.totalUsers} passed`,
    `- Total issues: ${summary.totalIssues}`,
    "",
    "## Questions Covered",
    "",
    ...summary.questionsCovered.map((item) => `- ${item}`),
    "",
    "| User | Surface | Daily links | Mobile nav | Issues | Result directory |",
    "|---|---|---|---|---:|---|",
    ...userSummaries.map(
      (item) =>
        `| ${item.username} | ${item.surfaceKind} | ${item.dailyLinks.join(" / ")} | ${item.mobileBottomNav.join(" / ")} | ${item.issueCount} | ${item.outDir} |`,
    ),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(OUT_DIR, "index.md"), index, "utf8");

  return summary;
}

test.describe("STGP UX role surface audit", () => {
  test("all configured users answer the daily surface questions", async ({
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
