import { describe, expect, it } from "vitest";
import type { Entity } from "../../lib/api/entities";
import {
  buildRouteAccessItems,
  canAccessNavItem,
  findActiveNavItem,
  type SurfaceNavLabels,
} from "./surfaceNavigation";

const labels: SurfaceNavLabels = {
  dailySurface: "حالتك الآن",
  notifications: "الإشعارات",
  entities: "الصناديق",
  reviewCenter: "المراجعة",
  finance: "المالية",
  auditor: "المراجعة المالية",
  committees: "اللجان",
  legacyDashboard: "تفصيلي",
};

const memberEntities: Entity[] = [
  {
    id: "entity-id",
    name: "صندوق قائم",
    type: "COMMUNITY",
    isActive: true,
    createdAt: "2026-07-02T00:00:00.000Z",
    myRole: "MEMBER",
  },
];

describe("surface route access", () => {
  it("allows verified members to reach the standalone fund creation route", () => {
    const items = buildRouteAccessItems(labels);
    const activeItem = findActiveNavItem("/entities/new", items);

    expect(activeItem?.href).toBe("/entities/new");
    expect(canAccessNavItem(activeItem, memberEntities)).toBe(true);
  });

  it("keeps the entity management index scoped to founders", () => {
    const items = buildRouteAccessItems(labels);
    const activeItem = findActiveNavItem("/entities", items);

    expect(activeItem?.href).toBe("/entities");
    expect(canAccessNavItem(activeItem, memberEntities)).toBe(false);
  });
});
