import type { Entity } from "./api/entities";

export type MemberRole =
  | "FOUNDER"
  | "ADMIN"
  | "TREASURER"
  | "AUDITOR"
  | "COMMITTEE_MEMBER"
  | "MEMBER";

export const ADMIN_ROLES: MemberRole[] = ["FOUNDER", "ADMIN"];
export const FINANCE_ROLES: MemberRole[] = [
  "FOUNDER",
  "ADMIN",
  "TREASURER",
];
export const OVERSIGHT_ROLES: MemberRole[] = [
  "FOUNDER",
  "ADMIN",
  "TREASURER",
  "AUDITOR",
];
export const AUDITOR_ROLES: MemberRole[] = ["FOUNDER", "ADMIN", "AUDITOR"];
export const COMMITTEE_ROLES: MemberRole[] = [
  "FOUNDER",
  "ADMIN",
  "COMMITTEE_MEMBER",
];
export const BENEFICIARY_ROLES: MemberRole[] = [
  "FOUNDER",
  "ADMIN",
  "TREASURER",
  "AUDITOR",
  "COMMITTEE_MEMBER",
];

export function isReadableEntity(entity: Entity) {
  return (
    entity.isActive !== false &&
    entity.platformStatus !== "SUSPENDED"
  );
}

export function isOperationalEntity(entity: Entity) {
  return (
    isReadableEntity(entity) &&
    entity.platformStatus !== "READ_ONLY"
  );
}

export function hasRole(entity: Entity, roles: readonly MemberRole[]) {
  return (
    isOperationalEntity(entity) &&
    roles.includes(entity.myRole as MemberRole)
  );
}

export function hasAdvancedSettingsAccess(entity: Entity) {
  return (
    isOperationalEntity(entity) &&
    (entity.myRole === "FOUNDER" || entity.canManageAdvancedSettings === true)
  );
}

export function hasAnyRole(
  entities: Entity[],
  roles: readonly MemberRole[],
) {
  return entities.some((entity) => hasRole(entity, roles));
}

export function filterEntitiesByRoles(
  entities: Entity[],
  roles: readonly MemberRole[],
) {
  return entities.filter((entity) => hasRole(entity, roles));
}

export function filterEntitiesByAdvancedSettingsAccess(entities: Entity[]) {
  return entities.filter(hasAdvancedSettingsAccess);
}
