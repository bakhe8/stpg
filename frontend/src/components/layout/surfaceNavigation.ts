import type { Entity } from "../../lib/api/entities";
import type {
  AdvancedToolLink,
  SurfaceKind,
  WorkSurface,
} from "../../lib/api/work-surface";
import { hasAnyRole, type MemberRole } from "../../lib/access";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: readonly MemberRole[];
}

export interface SurfaceNavLabels {
  dailySurface: string;
  notifications: string;
  entities: string;
  reviewCenter: string;
  finance: string;
  auditor: string;
  committees: string;
  legacyDashboard: string;
}

const FOUNDER_NAV_ROLES: readonly MemberRole[] = ["FOUNDER"];
const REVIEW_NAV_ROLES: readonly MemberRole[] = [
  "FOUNDER",
  "ADMIN",
];
const FINANCE_NAV_ROLES: readonly MemberRole[] = ["FOUNDER", "TREASURER"];
const COMMITTEE_NAV_ROLES: readonly MemberRole[] = [
  "FOUNDER",
  "COMMITTEE_MEMBER",
];
const OVERSIGHT_NAV_ROLES: readonly MemberRole[] = [
  "FOUNDER",
  "ADMIN",
  "AUDITOR",
];
const AUDITOR_NAV_ROLES: readonly MemberRole[] = ["FOUNDER", "AUDITOR"];
const BENEFICIARY_ACCESS_ROLES: readonly MemberRole[] = [
  "FOUNDER",
  "ADMIN",
  "TREASURER",
  "AUDITOR",
  "COMMITTEE_MEMBER",
];

const ADMIN_SURFACES: readonly SurfaceKind[] = ["FOUNDER", "ADMIN"];

function isSurfaceKind(
  surface: WorkSurface | null | undefined,
  kinds: readonly SurfaceKind[],
) {
  return surface ? kinds.includes(surface.surfaceKind) : false;
}

function shouldShowReview(surface: WorkSurface | null | undefined) {
  return isSurfaceKind(surface, ADMIN_SURFACES);
}

function shouldShowFinance(surface: WorkSurface | null | undefined) {
  return isSurfaceKind(surface, ["TREASURER"]);
}

function shouldShowAuditor(surface: WorkSurface | null | undefined) {
  return isSurfaceKind(surface, ["AUDITOR"]);
}

function shouldShowCommittee(surface: WorkSurface | null | undefined) {
  return isSurfaceKind(surface, ["COMMITTEE_MEMBER"]);
}

function advancedIconForHref(href: string) {
  if (href.startsWith("/portal")) return "◎";
  if (href.startsWith("/subscriptions")) return "◎";
  if (href.startsWith("/disbursement-requests")) return "＋";
  if (href.startsWith("/disbursements")) return "↗";
  if (href.startsWith("/review-center")) return "⚡";
  if (href.startsWith("/entities")) return "◇";
  if (href.startsWith("/wallets")) return "▣";
  if (href.startsWith("/finance")) return "◫";
  if (href.startsWith("/auditor")) return "⌕";
  if (href.startsWith("/committees")) return "◉";
  if (href.startsWith("/decisions")) return "✓";
  if (href.startsWith("/documents")) return "▤";
  if (href.startsWith("/rules")) return "§";
  if (href.startsWith("/health")) return "♡";
  if (href.startsWith("/analytics")) return "⌁";
  if (href.startsWith("/disputes")) return "↔";
  if (href.startsWith("/beneficiaries")) return "♙";
  if (href.startsWith("/dashboard/legacy")) return "▧";
  return "⋯";
}

export function buildDailyNavItems(
  surface: WorkSurface | null | undefined,
  labels: SurfaceNavLabels,
): NavItem[] {
  const items: NavItem[] = [
    { href: "/dashboard", label: labels.dailySurface, icon: "⌂" },
  ];

  if (shouldShowReview(surface)) {
    items.push({
      href: "/review-center",
      label: labels.reviewCenter,
      icon: "⚡",
      roles: REVIEW_NAV_ROLES,
    });
  }
  if (shouldShowFinance(surface)) {
    items.push({
      href: "/finance",
      label: labels.finance,
      icon: "◫",
      roles: FINANCE_NAV_ROLES,
    });
  }
  if (shouldShowCommittee(surface)) {
    items.push({
      href: "/committees",
      label: labels.committees,
      icon: "◉",
      roles: COMMITTEE_NAV_ROLES,
    });
  }
  if (shouldShowAuditor(surface)) {
    items.push({
      href: "/auditor",
      label: labels.auditor,
      icon: "⌕",
      roles: AUDITOR_NAV_ROLES,
    });
  }

  items.push({
    href: "/notifications",
    label: labels.notifications,
    icon: "◌",
  });

  return items;
}

export function buildNewUserNavItems(labels: SurfaceNavLabels): NavItem[] {
  return [
    { href: "/dashboard", label: labels.dailySurface, icon: "⌂" },
    { href: "/entities", label: labels.entities, icon: "◇" },
    { href: "/notifications", label: labels.notifications, icon: "◌" },
  ];
}

export function buildAdvancedNavItems(
  surface: WorkSurface | null | undefined,
  labels: SurfaceNavLabels,
): NavItem[] {
  const tools: AdvancedToolLink[] =
    surface?.advancedTools && surface.advancedTools.length > 0
      ? surface.advancedTools
      : [
          {
            href: "/dashboard/legacy",
            label: labels.legacyDashboard,
            reason: "",
            requiredRole: "ANY",
          },
        ];

  return tools.map((tool) => ({
    href: tool.href,
    label: tool.label,
    icon: advancedIconForHref(tool.href),
  }));
}

export function buildRouteAccessItems(labels: SurfaceNavLabels): NavItem[] {
  return [
    { href: "/dashboard", label: labels.dailySurface, icon: "⌂" },
    { href: "/dashboard/legacy", label: labels.legacyDashboard, icon: "▧" },
    { href: "/portal", label: "اشتراكاتي", icon: "◎" },
    { href: "/subscriptions", label: "الاشتراكات", icon: "◎" },
    { href: "/disbursement-requests", label: "طلبات الصرف", icon: "＋" },
    { href: "/wallets", label: "المحافظ", icon: "▣" },
    { href: "/notifications", label: labels.notifications, icon: "◌" },
    { href: "/entities/new", label: "إنشاء صندوق", icon: "＋" },
    {
      href: "/entities",
      label: labels.entities,
      icon: "◇",
      roles: FOUNDER_NAV_ROLES,
    },
    {
      href: "/review-center",
      label: labels.reviewCenter,
      icon: "⚡",
      roles: REVIEW_NAV_ROLES,
    },
    {
      href: "/finance",
      label: labels.finance,
      icon: "◫",
      roles: FINANCE_NAV_ROLES,
    },
    {
      href: "/disbursements",
      label: "الصرف",
      icon: "↗",
      roles: FINANCE_NAV_ROLES,
    },
    {
      href: "/beneficiaries",
      label: "المستفيدون",
      icon: "♙",
      roles: BENEFICIARY_ACCESS_ROLES,
    },
    {
      href: "/committees",
      label: labels.committees,
      icon: "◉",
      roles: COMMITTEE_NAV_ROLES,
    },
    {
      href: "/decisions",
      label: "القرارات",
      icon: "✓",
      roles: COMMITTEE_NAV_ROLES,
    },
    {
      href: "/rules",
      label: "القواعد",
      icon: "§",
      roles: FOUNDER_NAV_ROLES,
    },
    {
      href: "/documents",
      label: "المستندات",
      icon: "▤",
      roles: REVIEW_NAV_ROLES,
    },
    {
      href: "/health",
      label: "الصحة",
      icon: "♡",
      roles: FOUNDER_NAV_ROLES,
    },
    {
      href: "/analytics",
      label: "التحليلات",
      icon: "⌁",
      roles: OVERSIGHT_NAV_ROLES,
    },
    {
      href: "/disputes",
      label: "النزاعات",
      icon: "↔",
      roles: OVERSIGHT_NAV_ROLES,
    },
    {
      href: "/auditor",
      label: labels.auditor,
      icon: "⌕",
      roles: AUDITOR_NAV_ROLES,
    },
  ];
}

export function findActiveNavItem(
  pathname: string,
  items: readonly NavItem[],
) {
  return items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function canAccessNavItem(
  item: NavItem | undefined,
  entities: Entity[],
) {
  return !item?.roles || hasAnyRole(entities, item.roles);
}

export function selectBottomNavItems(items: readonly NavItem[]) {
  const home = items.find((item) => item.href === "/dashboard");
  const notifications = items.find((item) => item.href === "/notifications");
  const contextual = items.filter(
    (item) =>
      item.href !== "/dashboard" && item.href !== "/notifications",
  );

  return [home, ...contextual.slice(0, 2), notifications].filter(
    Boolean,
  ) as NavItem[];
}
