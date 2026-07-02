const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const READINESS_PATH = process.env.FRONTEND_READINESS_PATH || "/login";
const TIMEOUT_MS = Number(process.env.FRONTEND_READINESS_TIMEOUT_MS || 60000);
const INTERVAL_MS = Number(process.env.FRONTEND_READINESS_INTERVAL_MS || 1000);
const REQUEST_TIMEOUT_MS = Number(
  process.env.FRONTEND_READINESS_REQUEST_TIMEOUT_MS || 3000,
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readinessUrl() {
  return `${BASE_URL}${READINESS_PATH.startsWith("/") ? "" : "/"}${READINESS_PATH}`;
}

async function probe(url) {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();

  return {
    ok: response.status >= 200 && response.status < 500 && text.length > 0,
    status: response.status,
    bytes: text.length,
  };
}

async function waitForFrontend() {
  const url = readinessUrl();
  const started = Date.now();
  let lastError = "not attempted";

  while (Date.now() - started <= TIMEOUT_MS) {
    try {
      const result = await probe(url);
      if (result.ok) {
        console.log(
          JSON.stringify(
            {
              status: "ready",
              url,
              httpStatus: result.status,
              responseBytes: result.bytes,
            },
            null,
            2,
          ),
        );
        return;
      }
      lastError = `HTTP ${result.status}, bytes=${result.bytes}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await sleep(INTERVAL_MS);
  }

  throw new Error(
    `Frontend readiness failed for ${url}. Last error: ${lastError}. ` +
      "Start Docker frontend with `docker compose up -d frontend` and verify HOSTNAME=0.0.0.0 in frontend/Dockerfile.",
  );
}

waitForFrontend().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: "not-ready",
        baseUrl: BASE_URL,
        path: READINESS_PATH,
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
