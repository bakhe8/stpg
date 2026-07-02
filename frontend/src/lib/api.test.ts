import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchApi, humanizeApiError } from "./api";

describe("fetchApi", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("does not attach a stored entity context when creating a new fund", async () => {
    localStorage.setItem("accessToken", "test-token");
    localStorage.setItem(
      "currentEntityId",
      "11111111-1111-4111-8111-111111111111",
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "new-entity-id" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchApi("/entities", {
      method: "POST",
      body: JSON.stringify({ name: "New Fund", type: "COMMUNITY" }),
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-token");
    expect(headers.get("X-Entity-ID")).toBeNull();
  });
});

describe("humanizeApiError", () => {
  it("translates common class-validator messages to Arabic", () => {
    expect(
      humanizeApiError(
        "name must be longer than or equal to 2 characters",
        400,
        "ar",
      ),
    ).toBe("يجب أن يكون الاسم 2 أحرف على الأقل.");
  });

  it("shows clear permission and rate-limit messages", () => {
    expect(humanizeApiError("Forbidden", 403, "ar")).toBe(
      "لا تملك صلاحية تنفيذ هذا الإجراء.",
    );
    expect(humanizeApiError("Too Many Requests", 429, "ar")).toBe(
      "عدد الطلبات كبير مؤقتاً. انتظر قليلاً ثم حاول مرة أخرى.",
    );
  });

  it("keeps already Arabic backend messages", () => {
    expect(humanizeApiError("يتطلب الصرف قراراً صالحاً", 400, "ar")).toBe(
      "يتطلب الصرف قراراً صالحاً",
    );
  });
});
