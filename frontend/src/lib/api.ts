// في الإنتاج: /api (مسار نسبي — Caddy يوجّه /api* للباكند)
// في التطوير المحلي: http://localhost:3001/api
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "/api"
    : "http://localhost:3001/api");

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly originalMessage: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ARABIC_RE = /[\u0600-\u06ff]/;

const FIELD_LABELS_AR: Record<string, string> = {
  name: "الاسم",
  title: "العنوان",
  description: "الوصف",
  amount: "المبلغ",
  reference: "المرجع",
  phone: "رقم الجوال",
  password: "كلمة المرور",
  entityId: "الكيان",
  walletId: "المحفظة",
  pathId: "المسار",
  governancePathId: "المسار",
  decisionId: "القرار",
  spendingItemId: "بند الصرف",
  paymentDueId: "الدفعة المستحقة",
  reason: "السبب",
  notes: "الملاحظات",
  role: "الدور",
  status: "الحالة",
};

const FIELD_LABELS_EN: Record<string, string> = {
  entityId: "entity",
  walletId: "wallet",
  pathId: "path",
  governancePathId: "path",
  decisionId: "decision",
  spendingItemId: "spending item",
  paymentDueId: "due payment",
};

function preferredLocale(): "ar" | "en" {
  if (typeof document !== "undefined") {
    const lang = document.documentElement.lang || navigator.language;
    if (lang.toLowerCase().startsWith("en")) return "en";
  }
  return "ar";
}

function fieldLabel(field: string, locale: "ar" | "en") {
  if (locale === "en") return FIELD_LABELS_EN[field] ?? field;
  return FIELD_LABELS_AR[field] ?? field;
}

function humanizeValidationMessage(message: string, locale: "ar" | "en") {
  const trimmed = message.trim();
  const minLength = trimmed.match(
    /^([A-Za-z0-9_]+) must be longer than or equal to (\d+) characters$/,
  );
  if (minLength) {
    const [, field, count] = minLength;
    return locale === "en"
      ? `${fieldLabel(field, locale)} must be at least ${count} characters.`
      : `يجب أن يكون ${fieldLabel(field, locale)} ${count} أحرف على الأقل.`;
  }

  const maxLength = trimmed.match(
    /^([A-Za-z0-9_]+) must be shorter than or equal to (\d+) characters$/,
  );
  if (maxLength) {
    const [, field, count] = maxLength;
    return locale === "en"
      ? `${fieldLabel(field, locale)} must be ${count} characters or fewer.`
      : `يجب ألا يتجاوز ${fieldLabel(field, locale)} ${count} حرفاً.`;
  }

  const notEmpty = trimmed.match(/^([A-Za-z0-9_]+) should not be empty$/);
  if (notEmpty) {
    const [, field] = notEmpty;
    return locale === "en"
      ? `${fieldLabel(field, locale)} is required.`
      : `${fieldLabel(field, locale)} مطلوب.`;
  }

  const uuid = trimmed.match(/^([A-Za-z0-9_]+) must be a UUID$/);
  if (uuid) {
    const [, field] = uuid;
    return locale === "en"
      ? `${fieldLabel(field, locale)} is not valid.`
      : `${fieldLabel(field, locale)} غير صالح.`;
  }

  const positive = trimmed.match(
    /^([A-Za-z0-9_]+) must be a positive number$/,
  );
  if (positive) {
    const [, field] = positive;
    return locale === "en"
      ? `${fieldLabel(field, locale)} must be greater than zero.`
      : `يجب أن يكون ${fieldLabel(field, locale)} أكبر من صفر.`;
  }

  const minNumber = trimmed.match(/^([A-Za-z0-9_]+) must not be less than (.+)$/);
  if (minNumber) {
    const [, field, min] = minNumber;
    return locale === "en"
      ? `${fieldLabel(field, locale)} must be at least ${min}.`
      : `يجب ألا يقل ${fieldLabel(field, locale)} عن ${min}.`;
  }

  const enumValue = trimmed.match(
    /^([A-Za-z0-9_]+) must be one of the following values:/,
  );
  if (enumValue) {
    const [, field] = enumValue;
    return locale === "en"
      ? `${fieldLabel(field, locale)} contains an unsupported value.`
      : `${fieldLabel(field, locale)} يحتوي على قيمة غير مدعومة.`;
  }

  return trimmed;
}

export function humanizeApiError(
  message: string,
  status: number,
  locale: "ar" | "en" = preferredLocale(),
) {
  const raw = String(message || "").trim();
  const isEn = locale === "en";

  if (status === 429) {
    return isEn
      ? "Too many requests. Wait a moment, then try again."
      : "عدد الطلبات كبير مؤقتاً. انتظر قليلاً ثم حاول مرة أخرى.";
  }
  if (status === 401 || raw === "SESSION_EXPIRED") {
    return isEn
      ? "Your session expired. Please sign in again."
      : "انتهت الجلسة. سجّل الدخول مرة أخرى.";
  }
  if (status === 403) {
    return isEn
      ? "You do not have permission to perform this action."
      : "لا تملك صلاحية تنفيذ هذا الإجراء.";
  }
  if (status === 404) {
    return isEn
      ? "The requested record was not found or is no longer available."
      : "لم يتم العثور على السجل المطلوب أو لم يعد متاحاً.";
  }
  if (status >= 500) {
    return isEn
      ? "A server error occurred. Try again, and contact support if it repeats."
      : "حدث خطأ في الخادم. حاول مرة أخرى، وإن تكرر الخطأ تواصل مع الدعم.";
  }

  if (!raw) {
    return isEn ? "An unexpected error occurred." : "حدث خطأ غير متوقع.";
  }
  if (ARABIC_RE.test(raw)) return raw;

  const parts = raw
    .split(/\s*,\s*/)
    .map((part) => humanizeValidationMessage(part, locale))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(isEn ? " " : " ") : raw;
}

function inferEntityIdFromEndpoint(
  endpoint: string,
  method = "GET",
): string | null {
  const [, queryString] = endpoint.split("?");
  if (queryString) {
    const queryEntityId = new URLSearchParams(queryString).get("entityId");
    if (queryEntityId && UUID_RE.test(queryEntityId)) return queryEntityId;
  }

  const path = endpoint.split("?")[0];
  if (
    method.toUpperCase() === "POST" &&
    /^\/entities\/[0-9a-f-]{36}\/(?:join|memberships)$/i.test(path)
  ) {
    return null;
  }

  const patterns = [
    /^\/entities\/([0-9a-f-]{36})(?:\/|$)/i,
    /^\/analytics\/entities\/([0-9a-f-]{36})(?:\/|$)/i,
    /^\/auditor\/([0-9a-f-]{36})(?:\/|$)/i,
    /^\/support\/sessions\/([0-9a-f-]{36})(?:\/|$)/i,
    /^\/membership-applications\/entity\/([0-9a-f-]{36})(?:\/|$)/i,
  ];

  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match?.[1] && UUID_RE.test(match[1])) return match[1];
  }

  return null;
}

function persistAccessToken(accessToken: string) {
  localStorage.setItem("accessToken", accessToken);
  document.cookie = `accessToken=${accessToken}; path=/; max-age=900; samesite=lax`;
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return null;

  const data = (await response.json()) as { accessToken: string };
  persistAccessToken(data.accessToken);
  return data.accessToken;
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const authToken = token ?? getToken();
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  if (typeof window !== "undefined") {
    const inferredEntityId = inferEntityIdFromEndpoint(
      endpoint,
      options.method,
    );
    const currentEntityId =
      inferredEntityId ?? localStorage.getItem("currentEntityId");
    if (currentEntityId && !headers.has("X-Entity-ID")) {
      headers.set("X-Entity-ID", currentEntityId);
    }
  }

  let response = await fetch(url, { ...options, headers });
  if (response.status === 401 && !endpoint.startsWith("/auth/")) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      headers.set("Authorization", `Bearer ${refreshedToken}`);
      response = await fetch(url, { ...options, headers });
    } else {
      // Refresh failed — clear session and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("personId");
        window.location.replace("/login");
      }
      throw new ApiError(
        humanizeApiError("SESSION_EXPIRED", 401),
        401,
        "SESSION_EXPIRED",
      );
    }
  }
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const msg = data?.message;
    const originalMessage = Array.isArray(msg)
      ? msg.join(", ")
      : msg || response.statusText || "UNEXPECTED_ERROR";
    throw new ApiError(
      humanizeApiError(String(originalMessage), response.status),
      response.status,
      String(originalMessage),
    );
  }

  return data as T;
}
