import { ForbiddenException } from '@nestjs/common';
import { TransparencyLevel, MemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface PrivacyContext {
  isEntityMember: boolean;
  isPathSubscriber: boolean;
  isCommitteeMember: boolean;
  isAuditor: boolean;
  isAdmin: boolean;
  isDirectlyAffected: boolean;
}

export function canView(
  level: TransparencyLevel,
  ctx: PrivacyContext,
): boolean {
  switch (level) {
    case TransparencyLevel.PUBLIC_TO_MEMBERS:
      return ctx.isEntityMember;
    case TransparencyLevel.VISIBLE_TO_PARTICIPANTS:
      return ctx.isPathSubscriber || ctx.isAdmin || ctx.isAuditor;
    case TransparencyLevel.VISIBLE_TO_COMMITTEE:
      return ctx.isCommitteeMember || ctx.isAdmin || ctx.isAuditor;
    case TransparencyLevel.VISIBLE_TO_AUDITOR:
      return ctx.isAuditor || ctx.isAdmin;
    case TransparencyLevel.HIDDEN_SENSITIVE:
      return ctx.isDirectlyAffected || ctx.isAdmin;
    case TransparencyLevel.AGGREGATED_ONLY:
      return false;
    default:
      return false;
  }
}

export function assertCanView(
  level: TransparencyLevel,
  ctx: PrivacyContext,
): void {
  if (!canView(level, ctx)) {
    throw new ForbiddenException(
      'غير مصرح بالوصول — مستوى الخصوصية يمنع هذا الطلب',
    );
  }
}

export async function buildPrivacyContext(
  prisma: PrismaService,
  entityId: string,
  personId: string,
  options?: {
    pathId?: string | null;
    directlyAffectedPersonId?: string | null;
  },
): Promise<PrivacyContext> {
  const [membership, pathSubscription] = await Promise.all([
    prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
      select: { role: true },
    }),
    options?.pathId
      ? prisma.subscription.findFirst({
          where: {
            governancePathId: options.pathId,
            membership: { personId },
            state: 'ACTIVE',
          },
        })
      : Promise.resolve(null),
  ]);

  const role = membership?.role;

  return {
    isEntityMember: !!membership,
    isPathSubscriber:
      !!pathSubscription ||
      role === MemberRole.ADMIN ||
      role === MemberRole.FOUNDER,
    isCommitteeMember:
      role === MemberRole.COMMITTEE_MEMBER ||
      role === MemberRole.ADMIN ||
      role === MemberRole.FOUNDER,
    isAuditor: role === MemberRole.AUDITOR,
    isAdmin: role === MemberRole.ADMIN || role === MemberRole.FOUNDER,
    isDirectlyAffected:
      !!options?.directlyAffectedPersonId &&
      options.directlyAffectedPersonId === personId,
  };
}
