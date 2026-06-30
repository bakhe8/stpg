import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RulesService } from '../rules/rules.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { HouseholdsService } from '../households/households.service';
import { LedgerService } from '../ledger/ledger.service';
import {
  AuditAction,
  DecisionExecutionStatus,
  DecisionResult,
  DecisionStatus,
  DecisionType,
  MemberRole,
  SubjectType,
  SubscriptionState,
  VoteChoice,
  VoteType,
  VotersScope,
  Prisma,
} from '@prisma/client';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { CastVoteDto } from './dto/cast-vote.dto';

@Injectable()
export class DecisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: RulesService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly householdsService: HouseholdsService,
    private readonly ledgerService: LedgerService,
  ) {}

  async createDecision(creatorId: string, dto: CreateDecisionDto) {
    if (dto.type === DecisionType.DISBURSE_FUNDS) {
      this.validateDisbursementDecision(dto);
    }

    const context = await this.resolveDecisionContext(dto);
    const entityId = context.entityId;
    await this.requireAdmin(entityId, creatorId);

    const voteType =
      context.pathPolicy?.voteType ??
      context.entityPolicy?.defaultVoteType ??
      dto.voteType;
    const votersScope = this.resolveVotersScope(voteType, dto.votersScope);
    if (voteType === VoteType.ONE_FAMILY_ONE_VOTE) {
      const householdCount = await this.countEligibleVoters(
        {
          governancePathId: context.pathId,
          votersScope,
          voteType,
        },
        entityId,
      );
      if (householdCount === 0) {
        throw new BadRequestException(
          'لا توجد أسر مسجلة في هذا الكيان — يجب تسجيل الأسر قبل استخدام هذا النوع من التصويت',
        );
      }
    }

    if (
      voteType === VoteType.INDIVIDUAL_WITH_CAP &&
      dto.type !== DecisionType.DISBURSE_FUNDS
    ) {
      throw new BadRequestException(
        'القرار الفردي بسقف متاح حالياً لقرارات الصرف فقط',
      );
    }

    if (
      voteType === VoteType.INDIVIDUAL_WITH_CAP &&
      dto.type === DecisionType.DISBURSE_FUNDS
    ) {
      await this.validateIndividualCapDecision(dto);
    }

    const quorumPercent =
      context.pathPolicy?.quorumPercent ??
      context.entityPolicy?.decisionQuorumPercent ??
      dto.quorumPercent ??
      50;
    const approvalPercent =
      voteType === VoteType.TWO_THIRDS
        ? 67
        : (context.pathPolicy?.approvalPercent ?? dto.approvalPercent ?? 51);

    const rulesResult = await this.rulesService.evaluateDecisionRules({
      entityId,
      walletId: context.walletId,
      pathId: context.pathId,
      spendingItemId: dto.spendingItemId,
      decisionType: dto.type,
      amount: dto.amount,
      attachmentsCount: dto.attachments?.length ?? 0,
      quorumPercent,
      approvalPercent,
      voteType,
      votersScope,
    });
    if (!rulesResult.allowed) {
      throw new BadRequestException(
        `يخالف القرار القواعد المحددة: ${rulesResult.violations.join('؛ ')}`,
      );
    }

    const closesAt = context.pathPolicy
      ? new Date(
          Date.now() + context.pathPolicy.votingDurationHours * 60 * 60 * 1000,
        )
      : new Date(dto.closesAt);
    if (closesAt <= new Date()) {
      throw new BadRequestException('موعد إغلاق القرار يجب أن يكون مستقبلياً');
    }

    const decision = await this.prisma.decision.create({
      data: {
        decisionType: dto.type,
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        governancePathId: dto.governancePathId,
        spendingItemId: dto.spendingItemId,
        createdById: creatorId,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        voteType,
        votersScope,
        quorumPercent,
        approvalPercent,
        closesAt,
        attachments: dto.attachments ?? [],
        result: DecisionResult.PENDING,
        status: DecisionStatus.OPEN,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    if (voteType === VoteType.INDIVIDUAL_WITH_CAP) {
      return this.autoApproveIndividualCap(
        decision.id,
        creatorId,
        entityId,
        decision.decisionType,
      );
    }

    if (voteType === VoteType.EMERGENCY_THEN_REVIEW) {
      return this.handleEmergencyThenReview(
        decision.id,
        creatorId,
        entityId,
        dto,
        votersScope,
        quorumPercent,
        approvalPercent,
      );
    }

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        personId: creatorId,
        entityId,
        targetType: 'decisions',
        targetId: decision.id,
        newValue: { title: decision.title, type: decision.decisionType },
      },
    });

    return decision;
  }

  async findById(id: string, requesterId: string) {
    await this.expireDecisionIfOverdue(id);
    const decision = await this.prisma.decision.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        votes: {
          include: {
            person: { select: { id: true, name: true } },
          },
        },
        appeals: { select: { id: true, type: true, status: true } },
        governancePath: {
          select: {
            id: true,
            name: true,
            wallet: { select: { entityId: true } },
          },
        },
      },
    });
    if (!decision) throw new NotFoundException('القرار غير موجود');

    const entityId = await this.resolveDecisionEntityId(decision);
    await this.requireMember(entityId, requesterId);

    // التصويت السري: لا يُظهر الأصوات إلا للمسؤولين
    if (decision.voteType === VoteType.SECRET) {
      const isAdmin = await this.isAdminOrFounder(entityId, requesterId);
      if (!isAdmin) {
        const votingState = await this.resolveVotingState(
          decision,
          entityId,
          requesterId,
        );
        return { ...decision, ...votingState, votes: [] };
      }
    }

    const votingState = await this.resolveVotingState(
      decision,
      entityId,
      requesterId,
    );

    return { ...decision, ...votingState };
  }

  async findPathDecisions(pathId: string, requesterId: string) {
    const path = await this.prisma.governancePath.findUnique({
      where: { id: pathId },
      include: { wallet: { select: { entityId: true } } },
    });
    if (!path) throw new NotFoundException('مسار الحوكمة غير موجود');

    await this.requireMember(path.wallet.entityId, requesterId);
    await this.expireOverduePathDecisions(pathId);

    const decisions = await this.prisma.decision.findMany({
      where: { governancePathId: pathId },
      include: {
        createdBy: { select: { id: true, name: true } },
        governancePath: {
          select: {
            id: true,
            name: true,
            wallet: { select: { entityId: true } },
          },
        },
        _count: { select: { votes: true, appeals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.attachVotingState(decisions, requesterId);
  }

  async findAccessibleDecisions(requesterId: string) {
    const decisions = await this.prisma.decision.findMany({
      where: {
        governancePath: {
          wallet: {
            entity: {
              memberships: {
                some: { personId: requesterId, isActive: true },
              },
            },
          },
        },
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        governancePath: {
          select: {
            id: true,
            name: true,
            wallet: { select: { entityId: true } },
          },
        },
        _count: { select: { votes: true, appeals: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return this.attachVotingState(decisions, requesterId);
  }

  async getVotes(decisionId: string, requesterId: string) {
    const decision = await this.findById(decisionId, requesterId);
    return {
      decisionId,
      status: decision.status,
      result: decision.result,
      votes: decision.votes,
    };
  }

  async castVote(decisionId: string, voterId: string, dto: CastVoteDto) {
    const decision = await this.prisma.decision.findUnique({
      where: { id: decisionId },
      include: {
        governancePath: {
          include: { wallet: { select: { entityId: true } } },
        },
      },
    });
    if (!decision) throw new NotFoundException('القرار غير موجود');
    if (decision.status !== DecisionStatus.OPEN) {
      throw new BadRequestException('القرار مغلق ولا يقبل التصويت');
    }
    if (decision.closesAt < new Date()) {
      await this.expireDecisionIfOverdue(decisionId);
      throw new BadRequestException('انتهت مدة التصويت');
    }

    // BL-011 — يجب تأكيد رقم الجوال قبل التصويت
    const voter = await this.prisma.person.findUnique({
      where: { id: voterId },
      select: { isVerified: true },
    });
    if (!voter?.isVerified) {
      throw new ForbiddenException(
        'يجب تأكيد رقم جوالك قبل التصويت — اذهب لإعدادات الملف الشخصي',
      );
    }

    const entityId = await this.resolveDecisionEntityId(decision);
    await this.ensureVoterIsNotDecisionSubject(decision, entityId, voterId);

    // التحقق من أهلية الناخب
    const eligible = await this.isEligibleVoter(decision, entityId, voterId);
    if (!eligible)
      throw new ForbiddenException('غير مؤهل للتصويت في هذا القرار');

    // التحقق من عدم التصويت مسبقاً
    const existingVote = await this.prisma.vote.findUnique({
      where: { decisionId_personId: { decisionId, personId: voterId } },
    });
    if (existingVote)
      throw new ConflictException('لقد صوّت بالفعل في هذا القرار');

    const weight = await this.resolveVoteWeight(decision, voterId);

    // استرجاع householdId لقرارات ONE_FAMILY_ONE_VOTE لتطبيق الـ unique constraint
    let householdId: string | null = null;
    if (decision.voteType === VoteType.ONE_FAMILY_ONE_VOTE) {
      const membership = await this.prisma.membership.findFirst({
        where: { entityId, personId: voterId, isActive: true },
        include: { householdMember: { select: { householdId: true } } },
      });
      householdId = membership?.householdMember?.householdId ?? null;
    }

    let vote;
    try {
      vote = await this.prisma.vote.create({
        data: {
          decisionId,
          personId: voterId,
          householdId,
          choice: dto.choice,
          isSecret: decision.voteType === VoteType.SECRET,
          weight,
          notes: dto.notes,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('لقد صوّت بالفعل في هذا القرار');
      }
      throw err;
    }

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.VOTE,
        personId: voterId,
        entityId,
        targetType: 'decisions',
        targetId: decisionId,
        newValue: {
          choice: decision.voteType === VoteType.SECRET ? 'HIDDEN' : dto.choice,
        },
      },
    });

    // تحقق من إغلاق تلقائي بعد كل تصويت
    await this.checkAutoClose(decisionId, entityId);

    return vote;
  }

  async closeDecision(decisionId: string, adminId: string) {
    const decision = await this.prisma.decision.findUnique({
      where: { id: decisionId },
      include: {
        votes: true,
        governancePath: { include: { wallet: { select: { entityId: true } } } },
      },
    });
    if (!decision) throw new NotFoundException('القرار غير موجود');
    if (decision.status !== DecisionStatus.OPEN) {
      throw new BadRequestException('القرار مغلق بالفعل');
    }

    const entityId = await this.resolveDecisionEntityId(decision);
    await this.requireAdmin(entityId, adminId);

    const outcome = await this.computeResult(decision, entityId);
    const executionStatus = this.resolveExecutionStatusOnClosure(
      decision.decisionType,
      outcome.result,
    );

    const updated = await this.prisma.decision.update({
      where: { id: decisionId },
      data: {
        status: outcome.status,
        result: outcome.result,
        executionStatus,
        executionUpdatedAt: new Date(),
        closedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action:
          outcome.result === DecisionResult.APPROVED
            ? AuditAction.APPROVE
            : AuditAction.REJECT,
        personId: adminId,
        entityId,
        targetType: 'decisions',
        targetId: decisionId,
        newValue: { result: outcome.result, status: outcome.status },
      },
    });

    if (
      decision.decisionType === DecisionType.MODIFY_GOVERNANCE &&
      outcome.result === DecisionResult.APPROVED &&
      decision.governancePathId
    ) {
      await this.subscriptionsService.onGovernanceChanged(
        decision.governancePathId,
      );
    }

    return updated;
  }

  // ── مساعدات داخلية ───────────────────────────────────────────────

  private async autoApproveIndividualCap(
    decisionId: string,
    adminId: string,
    entityId: string,
    decisionType: DecisionType,
  ) {
    const executionStatus = this.resolveExecutionStatusOnClosure(
      decisionType,
      DecisionResult.APPROVED,
    );

    const updated = await this.prisma.decision.update({
      where: { id: decisionId },
      data: {
        status: DecisionStatus.CLOSED,
        result: DecisionResult.APPROVED,
        executionStatus,
        executionUpdatedAt: new Date(),
        closedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.APPROVE,
        personId: adminId,
        entityId,
        targetType: 'decisions',
        targetId: decisionId,
        newValue: { result: 'APPROVED', autoClose: true },
      },
    });

    void this.executeDecisionSideEffects(decisionId).catch(console.error);

    return updated;
  }

  private async handleEmergencyThenReview(
    emergencyDecisionId: string,
    adminId: string,
    entityId: string,
    dto: CreateDecisionDto,
    votersScope: VotersScope,
    quorumPercent: number,
    approvalPercent: number,
  ) {
    const emergencyExecutionStatus = this.resolveExecutionStatusOnClosure(
      dto.type,
      DecisionResult.APPROVED,
    );

    // 1. الموافقة الفورية على القرار العاجل
    await this.prisma.decision.update({
      where: { id: emergencyDecisionId },
      data: {
        status: DecisionStatus.CLOSED,
        result: DecisionResult.APPROVED,
        executionStatus: emergencyExecutionStatus,
        executionUpdatedAt: new Date(),
        closedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.APPROVE,
        personId: adminId,
        entityId,
        targetType: 'decisions',
        targetId: emergencyDecisionId,
        newValue: { result: 'APPROVED', emergency: true },
      },
    });

    void this.executeDecisionSideEffects(emergencyDecisionId).catch(
      console.error,
    );

    // 2. إنشاء قرار مراجعة مرتبط (48 ساعة للتصويت عليه)
    const reviewClosesAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const reviewDecision = await this.prisma.decision.create({
      data: {
        decisionType: dto.type,
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        governancePathId: dto.governancePathId,
        spendingItemId: dto.spendingItemId,
        createdById: adminId,
        title: `[مراجعة عاجل] ${dto.title}`,
        description: `قرار مراجعة للقرار العاجل: ${dto.description ?? dto.title}`,
        amount: dto.amount,
        voteType: VoteType.SIMPLE_MAJORITY,
        votersScope,
        quorumPercent,
        approvalPercent,
        closesAt: reviewClosesAt,
        relatedDecisionId: emergencyDecisionId,
        attachments: dto.attachments ?? [],
        result: DecisionResult.PENDING,
        status: DecisionStatus.OPEN,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        personId: adminId,
        entityId,
        targetType: 'decisions',
        targetId: reviewDecision.id,
        newValue: {
          relatedDecisionId: emergencyDecisionId,
          reviewDecision: true,
        },
      },
    });

    const emergencyDecision = await this.prisma.decision.findUnique({
      where: { id: emergencyDecisionId },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    return {
      emergencyDecision,
      reviewDecision,
      message:
        'تم الموافقة على القرار العاجل فوراً. قرار المراجعة مفتوح للتصويت خلال 48 ساعة.',
    };
  }

  private async checkAutoClose(decisionId: string, entityId: string) {
    const decision = await this.prisma.decision.findUnique({
      where: { id: decisionId },
      include: { votes: true, createdBy: { select: { id: true } } },
    });
    if (!decision || decision.status !== DecisionStatus.OPEN) return;

    const eligibleCount = await this.countEligibleVoters(decision, entityId);
    if (eligibleCount === 0) return;

    const totalVoted = decision.votes.length;
    if (totalVoted < eligibleCount) return;

    const outcome = await this.computeResult(decision, entityId);
    const executionStatus = this.resolveExecutionStatusOnClosure(
      decision.decisionType,
      outcome.result,
    );
    await this.prisma.$transaction([
      this.prisma.decision.update({
        where: { id: decisionId },
        data: {
          status: outcome.status,
          result: outcome.result,
          executionStatus,
          executionUpdatedAt: new Date(),
          closedAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          action:
            outcome.result === DecisionResult.APPROVED
              ? AuditAction.APPROVE
              : AuditAction.REJECT,
          personId: decision.createdBy.id,
          entityId,
          targetType: 'decisions',
          targetId: decisionId,
          newValue: {
            result: outcome.result,
            status: outcome.status,
            autoClose: true,
          },
        },
      }),
    ]);

    if (outcome.result === DecisionResult.APPROVED) {
      void this.executeDecisionSideEffects(decisionId).catch(console.error);
    }

    if (
      decision.decisionType === DecisionType.MODIFY_GOVERNANCE &&
      outcome.result === DecisionResult.APPROVED &&
      decision.governancePathId
    ) {
      void this.subscriptionsService
        .onGovernanceChanged(decision.governancePathId)
        .catch(() => {});
    }
  }

  private async computeResult(
    decision: {
      votes: { choice: string; weight: unknown }[];
      quorumPercent: number;
      approvalPercent: number;
      votersScope: VotersScope;
      governancePathId?: string | null;
      voteType: VoteType;
      closesAt: Date;
    },
    entityId: string,
  ): Promise<{ status: DecisionStatus; result: DecisionResult }> {
    const eligibleCount = await this.countEligibleVoters(decision, entityId);
    const totalVoted = decision.votes.length;
    const quorumCount = Math.ceil(
      (eligibleCount * decision.quorumPercent) / 100,
    );
    if (eligibleCount === 0 || totalVoted < quorumCount) {
      return {
        status:
          decision.closesAt <= new Date()
            ? DecisionStatus.EXPIRED
            : DecisionStatus.CLOSED,
        result: DecisionResult.REJECTED,
      };
    }

    const countedVotes = decision.votes.filter(
      (vote) => vote.choice !== VoteChoice.ABSTAIN,
    );
    const totalWeight = countedVotes.reduce(
      (sum, vote) => sum + Number(vote.weight),
      0,
    );
    if (totalWeight === 0) {
      return {
        status: DecisionStatus.CLOSED,
        result: DecisionResult.REJECTED,
      };
    }
    const approveWeight = countedVotes
      .filter((vote) => vote.choice === VoteChoice.APPROVE)
      .reduce((sum, vote) => sum + Number(vote.weight), 0);

    const approvalRate = (approveWeight / totalWeight) * 100;
    return {
      status: DecisionStatus.CLOSED,
      result:
        approvalRate >= decision.approvalPercent
          ? DecisionResult.APPROVED
          : DecisionResult.REJECTED,
    };
  }

  private async countEligibleVoters(
    decision: {
      governancePathId?: string | null;
      votersScope: VotersScope;
      voteType?: VoteType;
    },
    entityId: string,
  ): Promise<number> {
    if (decision.voteType === VoteType.ONE_FAMILY_ONE_VOTE) {
      return this.countEligibleHouseholds(decision, entityId);
    }
    switch (decision.votersScope) {
      case VotersScope.ALL_MEMBERS:
        if (decision.governancePathId) {
          return this.countPathSubscribers(decision.governancePathId, entityId);
        }
        return this.prisma.membership.count({
          where: { entityId, isActive: true },
        });
      case VotersScope.PATH_SUBSCRIBERS:
        if (!decision.governancePathId) return 0;
        return this.countPathSubscribers(decision.governancePathId, entityId);
      case VotersScope.COMMITTEE:
        if (decision.governancePathId) {
          const committeeId = await this.resolvePathCommitteeId(
            decision.governancePathId,
          );
          if (committeeId) {
            return this.prisma.committeeMembership.count({
              where: {
                committeeId,
                membership: { entityId, isActive: true },
              },
            });
          }
        }
        return this.prisma.membership.count({
          where: {
            entityId,
            isActive: true,
            role: {
              in: [
                MemberRole.COMMITTEE_MEMBER,
                MemberRole.ADMIN,
                MemberRole.FOUNDER,
              ],
            },
          },
        });
      default:
        return 0;
    }
  }

  private async isEligibleVoter(
    decision: {
      id: string;
      votersScope: VotersScope;
      voteType: VoteType;
      governancePathId?: string | null;
    },
    entityId: string,
    personId: string,
  ): Promise<boolean> {
    const eligibleForScope = await this.isEligibleForScope(
      decision,
      entityId,
      personId,
    );
    if (!eligibleForScope) return false;

    // ONE_FAMILY_ONE_VOTE: الشخص يجب أن يكون في أسرة، وأسرته لم تصوّت بعد
    if (decision.voteType === VoteType.ONE_FAMILY_ONE_VOTE) {
      const membership = await this.prisma.membership.findFirst({
        where: { entityId, personId, isActive: true },
        include: { householdMember: true },
      });
      if (!membership?.householdMember) return false;

      const householdId = membership.householdMember.householdId;
      const householdMembers = await this.prisma.householdMembership.findMany({
        where: { householdId },
        select: { membership: { select: { personId: true } } },
      });
      const householdPersonIds = householdMembers.map(
        (m) => m.membership.personId,
      );

      const alreadyVoted = await this.prisma.vote.findFirst({
        where: {
          decisionId: decision.id,
          person: { id: { in: householdPersonIds } },
        },
      });
      return !alreadyVoted;
    }

    return true;
  }

  private async ensureVoterIsNotDecisionSubject(
    decision: {
      decisionType: DecisionType;
      subjectType: SubjectType;
      subjectId: string;
    },
    entityId: string,
    voterId: string,
  ) {
    if (
      decision.decisionType !== DecisionType.EXPEL_MEMBER ||
      decision.subjectType !== SubjectType.MEMBERSHIP
    ) {
      return;
    }

    const voterMembership = await this.prisma.membership.findFirst({
      where: { entityId, personId: voterId, isActive: true },
      select: { id: true },
    });

    if (voterMembership?.id === decision.subjectId) {
      throw new ForbiddenException(
        'لا يمكنك التصويت على قرار يمسّك مباشرة — رأيك مجروح',
      );
    }
  }

  private async isEligibleForScope(
    decision: {
      votersScope: VotersScope;
      governancePathId?: string | null;
    },
    entityId: string,
    personId: string,
  ): Promise<boolean> {
    switch (decision.votersScope) {
      case VotersScope.ALL_MEMBERS:
        if (decision.governancePathId) {
          return this.hasActivePathSubscription(
            decision.governancePathId,
            entityId,
            personId,
          );
        }
        return !!(await this.prisma.membership.findFirst({
          where: { entityId, personId, isActive: true },
        }));
      case VotersScope.PATH_SUBSCRIBERS:
        if (!decision.governancePathId) return false;
        return this.hasActivePathSubscription(
          decision.governancePathId,
          entityId,
          personId,
        );
      case VotersScope.COMMITTEE: {
        // إذا كان القرار مرتبطاً بمسار حوكمة، نتحقق من عضوية اللجنة المحددة
        if (decision.governancePathId) {
          const committeeId = await this.resolvePathCommitteeId(
            decision.governancePathId,
          );
          if (committeeId) {
            return !!(await this.prisma.committeeMembership.findFirst({
              where: {
                committeeId,
                membership: { entityId, personId, isActive: true },
              },
            }));
          }
        }
        // فولباك: أي عضو بدور لجنة أو إدارة في الكيان
        return !!(await this.prisma.membership.findFirst({
          where: {
            entityId,
            personId,
            isActive: true,
            role: {
              in: [
                MemberRole.COMMITTEE_MEMBER,
                MemberRole.ADMIN,
                MemberRole.FOUNDER,
              ],
            },
          },
        }));
      }
      default:
        return false;
    }
  }

  private async countEligibleHouseholds(
    decision: {
      governancePathId?: string | null;
      votersScope: VotersScope;
    },
    entityId: string,
  ) {
    if (
      decision.votersScope === VotersScope.ALL_MEMBERS &&
      !decision.governancePathId
    ) {
      return this.prisma.household.count({
        where: {
          entityId,
          members: { some: { membership: { isActive: true } } },
        },
      });
    }

    if (
      decision.votersScope === VotersScope.ALL_MEMBERS ||
      decision.votersScope === VotersScope.PATH_SUBSCRIBERS
    ) {
      if (!decision.governancePathId) return 0;
      return this.prisma.household.count({
        where: {
          entityId,
          members: {
            some: {
              membership: {
                isActive: true,
                subscriptions: {
                  some: {
                    governancePathId: decision.governancePathId,
                    state: SubscriptionState.ACTIVE,
                  },
                },
              },
            },
          },
        },
      });
    }

    if (decision.votersScope === VotersScope.COMMITTEE) {
      const committeeId = decision.governancePathId
        ? await this.resolvePathCommitteeId(decision.governancePathId)
        : null;
      if (committeeId) {
        return this.prisma.household.count({
          where: {
            entityId,
            members: {
              some: {
                membership: {
                  isActive: true,
                  committeeMembers: { some: { committeeId } },
                },
              },
            },
          },
        });
      }

      return this.prisma.household.count({
        where: {
          entityId,
          members: {
            some: {
              membership: {
                isActive: true,
                role: {
                  in: [
                    MemberRole.COMMITTEE_MEMBER,
                    MemberRole.ADMIN,
                    MemberRole.FOUNDER,
                  ],
                },
              },
            },
          },
        },
      });
    }

    return 0;
  }

  private countPathSubscribers(governancePathId: string, entityId: string) {
    return this.prisma.subscription.count({
      where: {
        governancePathId,
        state: SubscriptionState.ACTIVE,
        membership: { entityId, isActive: true },
      },
    });
  }

  private async hasActivePathSubscription(
    governancePathId: string,
    entityId: string,
    personId: string,
  ) {
    return !!(await this.prisma.subscription.findFirst({
      where: {
        governancePathId,
        state: SubscriptionState.ACTIVE,
        membership: { entityId, personId, isActive: true },
      },
      select: { id: true },
    }));
  }

  private async resolvePathCommitteeId(governancePathId: string) {
    const path = await this.prisma.governancePath.findUnique({
      where: { id: governancePathId },
      select: { committeeId: true },
    });
    return path?.committeeId ?? null;
  }

  private async hasPersonVoted(decisionId: string, personId: string) {
    return !!(await this.prisma.vote.findUnique({
      where: { decisionId_personId: { decisionId, personId } },
      select: { id: true },
    }));
  }

  private async resolveVotingState(
    decision: {
      id: string;
      status: DecisionStatus;
      closesAt: Date;
      votersScope: VotersScope;
      voteType: VoteType;
      governancePathId?: string | null;
    },
    entityId: string,
    personId: string,
  ) {
    const hasVoted = await this.hasPersonVoted(decision.id, personId);
    const isOpen =
      decision.status === DecisionStatus.OPEN &&
      decision.closesAt >= new Date();
    const canVote =
      isOpen && !hasVoted
        ? await this.isEligibleVoter(decision, entityId, personId)
        : false;

    return { canVote, hasVoted };
  }

  private async attachVotingState<
    T extends {
      id: string;
      status: DecisionStatus;
      closesAt: Date;
      subjectType: string;
      subjectId: string;
      votersScope: VotersScope;
      voteType: VoteType;
      governancePathId?: string | null;
      governancePath?: { wallet: { entityId: string } } | null;
    },
  >(decisions: T[], requesterId: string) {
    return Promise.all(
      decisions.map(async (decision) => {
        const entityId = await this.resolveDecisionEntityId(decision);
        const votingState = await this.resolveVotingState(
          decision,
          entityId,
          requesterId,
        );
        return { ...decision, ...votingState };
      }),
    );
  }

  private async resolveDecisionContext(dto: CreateDecisionDto) {
    let entityId: string | null = null;
    let walletId: string | null = null;
    let pathId: string | null = dto.governancePathId ?? null;

    switch (dto.subjectType) {
      case SubjectType.ENTITY: {
        const entity = await this.prisma.entity.findUnique({
          where: { id: dto.subjectId },
          select: { id: true },
        });
        entityId = entity?.id ?? null;
        break;
      }
      case SubjectType.WALLET: {
        const wallet = await this.prisma.wallet.findUnique({
          where: { id: dto.subjectId },
          select: { id: true, entityId: true },
        });
        entityId = wallet?.entityId ?? null;
        walletId = wallet?.id ?? null;
        break;
      }
      case SubjectType.PATH: {
        const path = await this.prisma.governancePath.findUnique({
          where: { id: dto.subjectId },
          select: {
            id: true,
            walletId: true,
            wallet: { select: { entityId: true } },
          },
        });
        entityId = path?.wallet.entityId ?? null;
        walletId = path?.walletId ?? null;
        pathId = path?.id ?? pathId;
        break;
      }
      case SubjectType.SPENDING_ITEM: {
        const item = await this.prisma.spendingItem.findUnique({
          where: { id: dto.subjectId },
          select: {
            governancePath: {
              select: {
                id: true,
                walletId: true,
                wallet: { select: { entityId: true } },
              },
            },
          },
        });
        entityId = item?.governancePath.wallet.entityId ?? null;
        walletId = item?.governancePath.walletId ?? null;
        pathId = item?.governancePath.id ?? pathId;
        break;
      }
      case SubjectType.MEMBERSHIP: {
        const membership = await this.prisma.membership.findUnique({
          where: { id: dto.subjectId },
          select: { entityId: true },
        });
        entityId = membership?.entityId ?? null;
        break;
      }
      default:
        throw new BadRequestException('نوع موضوع القرار غير مدعوم');
    }

    if (!entityId) {
      throw new NotFoundException('موضوع القرار غير موجود');
    }

    const entityPolicy = await this.prisma.entityPolicy.findUnique({
      where: { entityId },
    });
    let pathPolicy = null;
    if (dto.governancePathId) {
      const path = await this.prisma.governancePath.findUnique({
        where: { id: dto.governancePathId },
        include: {
          wallet: { select: { entityId: true } },
          policy: true,
        },
      });
      if (!path) throw new NotFoundException('مسار الحوكمة غير موجود');
      if (path.wallet.entityId !== entityId) {
        throw new BadRequestException('مسار الحوكمة لا ينتمي إلى موضوع القرار');
      }
      pathPolicy = path.policy;
      walletId = path.walletId;
      pathId = path.id;
    }

    if (dto.spendingItemId) {
      const item = await this.prisma.spendingItem.findUnique({
        where: { id: dto.spendingItemId },
        select: { governancePathId: true },
      });
      if (
        !item ||
        !dto.governancePathId ||
        item.governancePathId !== dto.governancePathId
      ) {
        throw new BadRequestException('بند الصرف لا ينتمي إلى مسار القرار');
      }
    }

    return { entityId, entityPolicy, pathPolicy, walletId, pathId };
  }

  private async resolveDecisionEntityId(decision: {
    subjectType: string;
    subjectId: string;
    governancePath?: { wallet: { entityId: string } } | null;
  }): Promise<string> {
    if (decision.governancePath) {
      return decision.governancePath.wallet.entityId;
    }

    const context = await this.resolveDecisionContext({
      type: DecisionType.MODIFY_GOVERNANCE,
      subjectType: decision.subjectType as SubjectType,
      subjectId: decision.subjectId,
      title: 'context',
      voteType: VoteType.SIMPLE_MAJORITY,
      votersScope: VotersScope.ALL_MEMBERS,
      closesAt: new Date(Date.now() + 60_000).toISOString(),
    });
    return context.entityId;
  }

  private resolveVotersScope(
    voteType: VoteType,
    requestedScope: VotersScope,
  ): VotersScope {
    if (voteType === VoteType.COMMITTEE_APPROVAL) return VotersScope.COMMITTEE;
    if (voteType === VoteType.SUBSCRIBERS_ONLY)
      return VotersScope.PATH_SUBSCRIBERS;
    return requestedScope;
  }

  private async resolveVoteWeight(
    decision: { voteType: VoteType; governancePathId: string | null },
    voterId: string,
  ) {
    if (decision.voteType !== VoteType.BY_CONTRIBUTION) return 1;
    if (!decision.governancePathId) {
      throw new BadRequestException('التصويت بالمساهمة يتطلب مسار حوكمة');
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        governancePathId: decision.governancePathId,
        state: 'ACTIVE',
        agreedAmount: { not: null },
      },
      select: {
        agreedAmount: true,
        membership: { select: { personId: true } },
      },
    });
    const total = subscriptions.reduce(
      (sum, subscription) => sum + Number(subscription.agreedAmount),
      0,
    );
    const voterAmount = subscriptions
      .filter((subscription) => subscription.membership.personId === voterId)
      .reduce(
        (sum, subscription) => sum + Number(subscription.agreedAmount),
        0,
      );
    if (total <= 0 || voterAmount <= 0) {
      throw new ForbiddenException('لا توجد مساهمة فعالة تمنح وزناً للتصويت');
    }
    return Number(((voterAmount / total) * 100).toFixed(2));
  }

  private async expireDecisionIfOverdue(decisionId: string) {
    const decision = await this.prisma.decision.findUnique({
      where: { id: decisionId },
      include: {
        votes: true,
        governancePath: {
          include: { wallet: { select: { entityId: true } } },
        },
      },
    });
    if (
      !decision ||
      decision.status !== DecisionStatus.OPEN ||
      decision.closesAt > new Date()
    ) {
      return;
    }

    const entityId = await this.resolveDecisionEntityId(decision);
    const outcome = await this.computeResult(decision, entityId);
    const executionStatus = this.resolveExecutionStatusOnClosure(
      decision.decisionType,
      outcome.result,
    );
    await this.prisma.$transaction([
      this.prisma.decision.update({
        where: { id: decisionId },
        data: {
          status: outcome.status,
          result: outcome.result,
          executionStatus,
          executionUpdatedAt: new Date(),
          closedAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          action:
            outcome.result === DecisionResult.APPROVED
              ? AuditAction.APPROVE
              : AuditAction.REJECT,
          entityId,
          targetType: 'decisions',
          targetId: decisionId,
          newValue: {
            status: outcome.status,
            result: outcome.result,
            expiredByClock: true,
          },
        },
      }),
    ]);

    if (outcome.result === DecisionResult.APPROVED) {
      void this.executeDecisionSideEffects(decisionId).catch(console.error);
    }
  }

  private async expireOverduePathDecisions(pathId: string) {
    const overdue = await this.prisma.decision.findMany({
      where: {
        governancePathId: pathId,
        status: DecisionStatus.OPEN,
        closesAt: { lte: new Date() },
      },
      select: { id: true },
    });
    for (const decision of overdue) {
      await this.expireDecisionIfOverdue(decision.id);
    }
  }

  private async validateIndividualCapDecision(dto: CreateDecisionDto) {
    if (!dto.governancePathId || !dto.amount) {
      throw new BadRequestException(
        'القرار الفردي بسقف يتطلب مساراً ومبلغاً محدداً',
      );
    }
    const policy = await this.prisma.pathPolicy.findUnique({
      where: { governancePathId: dto.governancePathId },
    });
    if (!policy?.individualSpendingCap) {
      throw new BadRequestException('لم يحدد المسار سقفاً للصرف الفردي');
    }
    if (dto.amount > Number(policy.individualSpendingCap)) {
      throw new BadRequestException(
        `المبلغ (${dto.amount}) يتجاوز سقف القرار الفردي (${policy.individualSpendingCap.toString()})`,
      );
    }
  }

  private validateDisbursementDecision(dto: CreateDecisionDto) {
    if (!dto.governancePathId || !dto.spendingItemId) {
      throw new BadRequestException(
        'قرار الصرف يتطلب مسار حوكمة وبند صرف محددين',
      );
    }

    if (dto.amount === undefined || dto.amount <= 0) {
      throw new BadRequestException(
        'قرار الصرف يتطلب مبلغاً معتمداً أكبر من صفر',
      );
    }
  }

  private resolveExecutionStatusOnClosure(
    decisionType: DecisionType,
    result: DecisionResult,
  ): DecisionExecutionStatus {
    if (result !== DecisionResult.APPROVED) {
      return DecisionExecutionStatus.FAILED;
    }

    // All approved decisions start as NOT_STARTED. We will execute them asynchronously right after closure.
    return DecisionExecutionStatus.NOT_STARTED;
  }

  private async requireAdminOrTreasurer(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: {
          in: [MemberRole.TREASURER, MemberRole.ADMIN, MemberRole.FOUNDER],
        },
      },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون مديراً أو أمين صندوق');
  }

  private async requireAdmin(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون مديراً للكيان');
  }

  private async requireMember(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون عضواً في الكيان');
  }

  private async isAdminOrFounder(entityId: string, personId: string) {
    return !!(await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
    }));
  }

  async executeDecisionSideEffects(decisionId: string) {
    const decision = await this.prisma.decision.findUnique({
      where: { id: decisionId },
    });
    if (!decision) return;
    if (decision.result !== DecisionResult.APPROVED) return;
    if (decision.executionStatus === DecisionExecutionStatus.COMPLETED) return;

    let executionStatus: DecisionExecutionStatus =
      DecisionExecutionStatus.FAILED;
    try {
      if (decision.decisionType === DecisionType.ACCEPT_MEMBER) {
        if (decision.subjectType === SubjectType.MEMBERSHIP) {
          await this.prisma.membership.update({
            where: { id: decision.subjectId },
            data: { isActive: true },
          });
          executionStatus = DecisionExecutionStatus.COMPLETED;
        } else {
          executionStatus = DecisionExecutionStatus.COMPLETED;
        }
      } else if (decision.decisionType === DecisionType.EXPEL_MEMBER) {
        if (decision.subjectType === SubjectType.MEMBERSHIP) {
          await this.prisma.membership.update({
            where: { id: decision.subjectId },
            data: { isActive: false },
          });
          const entityId = await this.resolveDecisionEntityId(decision);
          await this.prisma.auditLog.create({
            data: {
              action: AuditAction.EXPEL,
              entityId,
              targetType: 'memberships',
              targetId: decision.subjectId,
              newValue: { decisionId: decision.id },
            },
          });
          executionStatus = DecisionExecutionStatus.COMPLETED;
        } else {
          executionStatus = DecisionExecutionStatus.COMPLETED;
        }
      } else if (decision.decisionType === DecisionType.FREEZE_WALLET) {
        if (decision.subjectType === SubjectType.WALLET) {
          await this.prisma.wallet.update({
            where: { id: decision.subjectId },
            data: { isActive: false },
          });
          executionStatus = DecisionExecutionStatus.COMPLETED;
        } else {
          executionStatus = DecisionExecutionStatus.COMPLETED;
        }
      } else if (decision.decisionType === DecisionType.MERGE_PATHS) {
        if (
          decision.subjectType === SubjectType.PATH &&
          decision.governancePathId
        ) {
          const sourcePathId = decision.subjectId;
          const targetPathId = decision.governancePathId;

          await this.prisma.subscription.updateMany({
            where: { governancePathId: sourcePathId },
            data: { governancePathId: targetPathId },
          });

          const sourceAccount = await this.prisma.ledgerAccount.findUnique({
            where: { governancePathId: sourcePathId },
          });
          if (sourceAccount && Number(sourceAccount.balance) > 0) {
            await this.ledgerService.recordTransfer(decision.createdById, {
              sourcePathId,
              targetPathId,
              amount: Number(sourceAccount.balance),
              description: `دمج المسار ${sourcePathId} في ${targetPathId}`,
              reference: `MERGE-${decision.id.slice(0, 8)}`,
              decisionId: decision.id,
            });
          }

          await this.prisma.governancePath.update({
            where: { id: sourcePathId },
            data: { isActive: false },
          });

          executionStatus = DecisionExecutionStatus.COMPLETED;
        } else {
          executionStatus = DecisionExecutionStatus.COMPLETED;
        }
      } else if (decision.decisionType === DecisionType.MODIFY_SUBSCRIPTION) {
        executionStatus = DecisionExecutionStatus.COMPLETED;
      } else if (
        decision.decisionType === DecisionType.DISBURSE_FUNDS ||
        decision.decisionType === DecisionType.TRANSFER_BALANCE
      ) {
        executionStatus = DecisionExecutionStatus.NOT_STARTED;
      } else if (decision.decisionType === DecisionType.CLOSE_WALLET) {
        // Wallet closure requires calling POST /wallets/:id/close — not auto-executed
        executionStatus = DecisionExecutionStatus.NOT_STARTED;
      } else if (
        decision.decisionType === DecisionType.MODIFY_GOVERNANCE &&
        decision.subjectType === SubjectType.PATH
      ) {
        // Path closure requires calling POST /governance-paths/:id/close — not auto-executed
        executionStatus = DecisionExecutionStatus.NOT_STARTED;
      } else {
        executionStatus = DecisionExecutionStatus.COMPLETED;
      }
    } catch (e) {
      console.error(
        `Failed to execute side effects for decision ${decisionId}:`,
        e,
      );
      executionStatus = DecisionExecutionStatus.FAILED;
    }

    if (executionStatus !== decision.executionStatus) {
      await this.prisma.decision.update({
        where: { id: decisionId },
        data: {
          executionStatus,
          executionUpdatedAt: new Date(),
        },
      });
    }
  }

  async retryExecution(decisionId: string, adminId: string) {
    const decision = await this.prisma.decision.findUnique({
      where: { id: decisionId },
    });
    if (!decision) throw new NotFoundException('القرار غير موجود');

    const entityId = await this.resolveDecisionEntityId(decision);
    await this.requireAdminOrTreasurer(entityId, adminId);

    if (decision.result !== DecisionResult.APPROVED) {
      throw new BadRequestException('القرار غير مقبول للتنفيذ');
    }
    if (decision.executionStatus === DecisionExecutionStatus.COMPLETED) {
      throw new BadRequestException('تم تنفيذ القرار بنجاح مسبقاً');
    }

    await this.executeDecisionSideEffects(decisionId);

    return this.prisma.decision.findUnique({ where: { id: decisionId } });
  }
}
