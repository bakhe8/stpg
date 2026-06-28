import { describe, expect, it } from "vitest";
import { humanizeApiError } from "./api";

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
