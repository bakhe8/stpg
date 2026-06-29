import { EntityPlatformStatus, PlatformRole } from '@prisma/client';

export type PlatformSurfacePriority = 'critical' | 'urgent' | 'normal' | 'info';
export type PlatformSurfaceTone = 'positive' | 'attention' | 'blocked' | 'neutral';

export interface PlatformSurfaceCtaDto {
  label: string;
  href: string;
}

export interface PlatformSurfaceMessageDto {
  tone: PlatformSurfaceTone;
  title: string;
  body: string;
  nextStep: string;
}

export interface PlatformSurfaceMetricDto {
  id: string;
  label: string;
  value: number;
  caption: string;
  tone: PlatformSurfaceTone;
}

export interface PlatformSurfaceCapabilityDto {
  key:
    | 'MANAGE_ENTITY_STATUS'
    | 'RESPOND_TO_APPEALS'
    | 'VIEW_SUPPORT_SCOPE'
    | 'OPEN_SUPPORT_SESSION'
    | 'VIEW_AGGREGATES'
    | 'VIEW_ENTITY_NAMES';
  label: string;
  isAllowed: boolean;
  reason: string;
}

export interface PlatformSurfaceActionDto {
  id: string;
  priority: PlatformSurfacePriority;
  title: string;
  body: string;
  scopeText?: string;
  expectedAfterAction: string;
  cta?: PlatformSurfaceCtaDto;
}

export interface PlatformSurfaceSupportSessionDto {
  id: string;
  entityId?: string;
  entityName?: string;
  operatorName?: string;
  operatorRoleLabel?: string;
  scope: string;
  expiresAt: string;
  statusLabel: string;
  isOwnSession: boolean;
  whyShown: string;
  cta?: PlatformSurfaceCtaDto;
}

export interface PlatformSurfaceEntityReviewDto {
  id: string;
  entityId: string;
  entityName: string;
  entityTypeLabel: string;
  status: EntityPlatformStatus;
  statusLabel: string;
  memberCount: number;
  reason: string;
  title: string;
  body: string;
  canAct: boolean;
  cta?: PlatformSurfaceCtaDto;
}

export interface PlatformSurfaceAccessEventDto {
  id: string;
  title: string;
  body: string;
  accessTypeLabel: string;
  entityName: string;
  operatorName: string;
  scope: string;
  reason: string;
  startedAt: string;
  needsReview: boolean;
}

export interface PlatformSurfaceAggregateInsightDto {
  id: string;
  title: string;
  body: string;
  value: number;
  tone: PlatformSurfaceTone;
}

export interface PlatformSurfaceAdvancedToolDto {
  href: string;
  label: string;
  reason: string;
  requiredRole: PlatformRole | 'ANY';
}

export interface PlatformSurfaceResponseDto {
  generatedAt: string;
  account: {
    id: string;
    name: string;
    email?: string;
    role: PlatformRole;
    roleLabel: string;
    isActive: boolean;
  };
  primaryMessage: PlatformSurfaceMessageDto;
  metrics: PlatformSurfaceMetricDto[];
  requiredActions: PlatformSurfaceActionDto[];
  activeSupportSessions: PlatformSurfaceSupportSessionDto[];
  entityReviews: PlatformSurfaceEntityReviewDto[];
  accessEvents: PlatformSurfaceAccessEventDto[];
  aggregateInsights: PlatformSurfaceAggregateInsightDto[];
  capabilities: PlatformSurfaceCapabilityDto[];
  advancedTools: PlatformSurfaceAdvancedToolDto[];
  diagnostics: {
    source: 'platform-surface-v1';
    legacyEntityTableAvailable: boolean;
  };
}
