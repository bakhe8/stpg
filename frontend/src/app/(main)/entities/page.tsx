"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getEntities, Entity } from "../../../lib/api/entities";
import {
  getMyPaymentDues,
  getSubscriptions,
  PaymentDue,
  Subscription,
} from "../../../lib/api/subscriptions";
import { getEntityWallets } from "../../../lib/api/wallets";
import { getDecisions, Decision } from "../../../lib/api/decisions";
import { isReadableEntity } from "../../../lib/access";
import { isCampaignRecord } from "../../../lib/entity-display";
import styles from "./entities.module.css";

interface EntityOperationalSummary {
  activeWallets: number;
  activeSubscriptions: number;
  conditionalSubscriptions: number;
  supporterOnlySubscriptions: number;
  currentDueAmount: number;
  overdueAmount: number;
  currentDueCount: number;
  pendingVoteCount: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function emptySummary(): EntityOperationalSummary {
  return {
    activeWallets: 0,
    activeSubscriptions: 0,
    conditionalSubscriptions: 0,
    supporterOnlySubscriptions: 0,
    currentDueAmount: 0,
    overdueAmount: 0,
    currentDueCount: 0,
    pendingVoteCount: 0,
  };
}

function isDecisionOpen(decision: Decision) {
  return (
    decision.status === "OPEN" && new Date(decision.closesAt) >= new Date()
  );
}

function summarizeEntity(
  entity: Entity,
  subscriptions: Subscription[],
  paymentDues: PaymentDue[],
  decisions: Decision[],
  activeWallets: number,
): EntityOperationalSummary {
  const entitySubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.membership?.entityId === entity.id ||
      subscription.membershipId === entity.myMembershipId,
  );
  const entityDues = paymentDues.filter(
    (due) => due.subscription?.membership?.entityId === entity.id,
  );
  const currentDues = entityDues.filter((due) =>
    ["PENDING", "OVERDUE"].includes(due.status),
  );
  const pendingVoteCount = decisions.filter(
    (decision) =>
      decision.governancePath?.wallet?.entityId === entity.id &&
      isDecisionOpen(decision) &&
      decision.canVote !== false &&
      !decision.hasVoted,
  ).length;

  return {
    activeWallets,
    activeSubscriptions: entitySubscriptions.filter(
      (subscription) => subscription.state === "ACTIVE",
    ).length,
    conditionalSubscriptions: entitySubscriptions.filter(
      (subscription) => subscription.state === "CONDITIONAL",
    ).length,
    supporterOnlySubscriptions: entitySubscriptions.filter(
      (subscription) => subscription.state === "SUPPORTER_ONLY",
    ).length,
    currentDueAmount: currentDues.reduce(
      (sum, due) => sum + Number(due.amountDue ?? 0),
      0,
    ),
    overdueAmount: entityDues
      .filter((due) => due.status === "OVERDUE")
      .reduce((sum, due) => sum + Number(due.amountDue ?? 0), 0),
    currentDueCount: currentDues.length,
    pendingVoteCount,
  };
}

export default function EntitiesPage() {
  const t = useTranslations("entities");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [summaries, setSummaries] = useState<
    Record<string, EntityOperationalSummary>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ENTITY_TYPE_LABELS: Record<string, string> = {
    FAMILY: t("typeFamily"),
    TRIBE: t("typeTribe"),
    BUILDING: t("typeBuilding"),
    NEIGHBORHOOD: t("typeNeighborhood"),
    COMMUNITY: t("typeCommunity"),
    CAMPAIGN: t("typeCampaign"),
  };

  const roleLabel = (role?: string | null) => {
    if (!role) return "";
    const roleKey = `role${role
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("")}`;
    return t(roleKey as Parameters<typeof t>[0]);
  };

  const relationshipHint = (
    entity: Entity,
    summary: EntityOperationalSummary,
  ) => {
    const scopedKey = (
      fundKey: Parameters<typeof t>[0],
      campaignKey: Parameters<typeof t>[0],
    ) => (isCampaignRecord(entity) ? campaignKey : fundKey);

    if (entity.platformStatus === "PENDING_REVIEW") {
      return t(scopedKey("operationalPendingReview", "operationalCampaignPendingReview"));
    }
    if (entity.platformStatus === "SUSPENDED") {
      return t(scopedKey("operationalSuspended", "operationalCampaignSuspended"));
    }
    if (entity.platformStatus === "READ_ONLY") {
      if (isCampaignRecord(entity)) {
        return t("operationalCampaignClosed");
      }
      return t("operationalReadOnly");
    }
    if (summary.overdueAmount > 0 && summary.pendingVoteCount > 0) {
      return t(scopedKey("operationalOverdueAndPendingVotes", "operationalCampaignOverdueAndPendingVotes"), {
        amount: formatCurrency(summary.overdueAmount),
        count: summary.pendingVoteCount,
      });
    }
    if (summary.overdueAmount > 0) {
      return t("operationalOverdue", {
        amount: formatCurrency(summary.overdueAmount),
      });
    }
    if (summary.pendingVoteCount > 0) {
      return t(scopedKey("operationalPendingVoteHint", "operationalCampaignPendingVoteHint"), {
        count: summary.pendingVoteCount,
      });
    }
    if (summary.conditionalSubscriptions > 0) {
      return t("operationalConditional");
    }
    if (
      summary.supporterOnlySubscriptions > 0 &&
      summary.activeSubscriptions === 0
    ) {
      return t(scopedKey("operationalSupporterOnly", "operationalCampaignSupporterOnly"));
    }
    if (summary.activeSubscriptions > 0) {
      return t(scopedKey("operationalActive", "operationalCampaignActive"), {
        count: summary.activeSubscriptions,
      });
    }
    return t(scopedKey("operationalNoSubscription", "operationalCampaignNoSubscription"));
  };

  const load = useCallback(async () => {
    try {
      const fetchedEntities = await getEntities();
      setEntities(fetchedEntities);

      const [subscriptions, paymentDues, decisions, walletEntries] =
        await Promise.all([
          getSubscriptions({}).catch(() => [] as Subscription[]),
          getMyPaymentDues().catch(() => [] as PaymentDue[]),
          getDecisions().catch(() => [] as Decision[]),
          Promise.all(
            fetchedEntities.map(async (entity) => {
              if (!isReadableEntity(entity)) return [entity.id, 0] as const;
              const wallets = await getEntityWallets(entity.id).catch(
                () => [],
              );
              return [
                entity.id,
                wallets.filter((wallet) => wallet.isActive).length,
              ] as const;
            }),
          ),
        ]);
      const walletCounts = new Map(walletEntries);
      setSummaries(
        Object.fromEntries(
          fetchedEntities.map((entity) => [
            entity.id,
            summarizeEntity(
              entity,
              subscriptions,
              paymentDues,
              decisions,
              walletCounts.get(entity.id) ?? 0,
            ),
          ]),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("generalError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
        <Link href="/entities/new" className={styles.addBtn}>
          {t("newEntity")}
        </Link>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.centered}>
          <div className={styles.spinner} />
        </div>
      ) : entities.length === 0 ? (
        <div className={styles.empty}>{t("empty")}</div>
      ) : (
        <div className={styles.list}>
          {entities.map((e) => {
            const canOpenEntity = isReadableEntity(e);
            const summary = summaries[e.id] ?? emptySummary();
            const rowContent = (
              <>
                <div className={styles.rowIcon}>⬡</div>
                <div className={styles.rowInfo}>
                  <div className={styles.rowName}>
                    <span>{e.name}</span>
                    {e.myRole ? (
                      <span className={styles.roleBadge}>
                        {t("operationalRolePrefix")}: {roleLabel(e.myRole)}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.rowType}>
                    {ENTITY_TYPE_LABELS[e.type] ?? e.type}
                  </div>
                  <div className={styles.operationalMetrics}>
                    <span>
                      {t("operationalWallets", {
                        count: summary.activeWallets,
                      })}
                    </span>
                    <span>
                      {t("operationalSubscriptions", {
                        count:
                          summary.activeSubscriptions +
                          summary.conditionalSubscriptions +
                          summary.supporterOnlySubscriptions,
                      })}
                    </span>
                    <span
                      className={
                        summary.currentDueAmount > 0
                          ? styles.metricAttention
                          : undefined
                      }
                    >
                      {summary.currentDueAmount > 0
                        ? `${t("operationalCurrentDue")}: ${formatCurrency(
                            summary.currentDueAmount,
                          )}`
                        : t("operationalNoDue")}
                    </span>
                    <span
                      className={
                        summary.pendingVoteCount > 0
                          ? styles.metricDecision
                          : undefined
                      }
                    >
                      {summary.pendingVoteCount > 0
                        ? t("operationalPendingVotes", {
                            count: summary.pendingVoteCount,
                          })
                        : t("operationalNoPendingVotes")}
                    </span>
                  </div>
                  <div className={styles.relationshipHint}>
                    {relationshipHint(e, summary)}
                  </div>
                </div>
                {e.platformStatus && e.platformStatus !== "ACTIVE" && (
                  <span
                    className={styles.platformBadge}
                    data-status={e.platformStatus}
                  >
                    {e.platformStatus === "SUSPENDED"
                      ? "🚫 معلّق"
                      : e.platformStatus === "READ_ONLY"
                        ? "👁 قراءة فقط"
                        : "⏳ قيد المراجعة"}
                  </span>
                )}
                <div
                  className={`${styles.statusDot} ${e.isActive ? styles.statusActive : styles.statusInactive}`}
                />
                <div className={styles.rowArrow}>{t("operationalGo")} ←</div>
              </>
            );

            if (!canOpenEntity) {
              return (
                <div
                  key={e.id}
                  className={`${styles.row} ${styles.rowDisabled}`}
                  aria-disabled="true"
                  title={isCampaignRecord(e) ? t("campaignSuspendedTitle") : t("fundSuspendedTitle")}
                >
                  {rowContent}
                </div>
              );
            }

            return (
              <Link
                key={e.id}
                href={`/entities/${e.id}`}
                className={styles.row}
              >
                {rowContent}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
