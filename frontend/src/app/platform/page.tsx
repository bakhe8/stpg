"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  activateEntity,
  getAppeals,
  getEntitiesList,
  getPlatformAccount,
  getPlatformSurface,
  suspendEntity,
  type PlatformEntity,
  type PlatformSurface,
  type PlatformSurfaceAction,
} from "../../lib/api/platform";
import { isCampaignRecord } from "../../lib/entity-display";
import styles from "./dashboard.module.css";

type PlatformT = ReturnType<typeof useTranslations<"platform">>;

function statusLabel(t: PlatformT, status: string) {
  switch (status) {
    case "ACTIVE":
      return t("statusActive");
    case "SUSPENDED":
      return t("statusSuspended");
    case "READ_ONLY":
      return t("statusReadOnly");
    case "PENDING_REVIEW":
      return t("statusPendingReview");
    default:
      return status;
  }
}

function entityTypeLabel(t: PlatformT, type: string) {
  switch (type) {
    case "FAMILY":
      return t("typeFamily");
    case "TRIBE":
      return t("typeTribe");
    case "BUILDING":
      return t("typeBuilding");
    case "NEIGHBORHOOD":
      return t("typeNeighborhood");
    case "COMMUNITY":
      return t("typeCommunity");
    case "CAMPAIGN":
      return t("typeCampaign");
    default:
      return type;
  }
}

function actionPriorityLabel(
  t: PlatformT,
  priority: PlatformSurfaceAction["priority"],
) {
  if (priority === "critical") return t("priorityCritical");
  if (priority === "urgent") return t("priorityUrgent");
  if (priority === "normal") return t("priorityNormal");
  return t("priorityLow");
}

export default function PlatformDashboardPage() {
  const t = useTranslations("platform");
  const router = useRouter();
  const storedAccount = getPlatformAccount();

  const [surface, setSurface] = useState<PlatformSurface | null>(null);
  const [entities, setEntities] = useState<PlatformEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingAppeals, setPendingAppeals] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [suspendDialog, setSuspendDialog] = useState<{
    entity: PlatformEntity;
    reason: string;
  } | null>(null);
  const [activateTarget, setActivateTarget] = useState<PlatformEntity | null>(
    null,
  );

  const canManageEntities =
    surface?.account.role === "OWNER" ||
    surface?.account.role === "SUPER_ADMIN";
  const targetKindLabel = (entity: PlatformEntity) =>
    t(isCampaignRecord(entity) ? "targetCampaign" : "targetFund");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const nextSurface = await getPlatformSurface();
      setSurface(nextSurface);

      const canLoadEntityTable =
        nextSurface.account.role === "OWNER" ||
        nextSurface.account.role === "SUPER_ADMIN";

      if (canLoadEntityTable) {
        const [entitiesRes, appealsRes] = await Promise.all([
          getEntitiesList({ status: statusFilter || undefined }),
          getAppeals({ status: "PENDING" }),
        ]);
        setEntities(entitiesRes.entities);
        setTotal(entitiesRes.total);
        setPendingAppeals(appealsRes.total);
      } else {
        setEntities([]);
        setTotal(0);
        setPendingAppeals(0);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("loadFailedTitle"));
      void router.push("/platform/login");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, router, t]);

  useEffect(() => {
    const initialStatus = new URLSearchParams(window.location.search).get(
      "status",
    );
    if (initialStatus && !statusFilter) {
      setStatusFilter(initialStatus);
      return;
    }
    void load();
  }, [load, statusFilter]);

  function handleSuspend(entity: PlatformEntity) {
    setSuspendDialog({ entity, reason: "" });
  }

  function handleActivate(entity: PlatformEntity) {
    setActivateTarget(entity);
  }

  async function confirmSuspend() {
    if (!suspendDialog || suspendDialog.reason.trim().length < 5) return;
    setActionLoading(suspendDialog.entity.id);
    try {
      await suspendEntity(
        suspendDialog.entity.id,
        suspendDialog.reason.trim(),
        "SUSPENDED",
      );
      await load();
    } finally {
      setActionLoading(null);
      setSuspendDialog(null);
    }
  }

  async function confirmActivate() {
    if (!activateTarget) return;
    setActionLoading(activateTarget.id);
    try {
      await activateEntity(activateTarget.id);
      await load();
    } finally {
      setActionLoading(null);
      setActivateTarget(null);
    }
  }

  if (loading && !surface) {
    return <p className={styles.loadingText}>{t("loading")}</p>;
  }

  if (!surface) {
    return (
      <div className={styles.emptySurface}>
        <strong>{t("loadFailedTitle")}</strong>
        <p>{message ?? t("loadFailedDefault")}</p>
      </div>
    );
  }

  return (
    <div className={styles.platformSurfacePage}>
      <section
        className={`${styles.surfaceHero} ${
          styles[`surfaceHero_${surface.primaryMessage.tone}`] ?? ""
        }`}
      >
        <div>
          <span className={styles.surfaceKicker}>
            {surface.account.name || storedAccount?.name} —{" "}
            {surface.account.roleLabel}
          </span>
          <h1>{surface.primaryMessage.title}</h1>
          <p>{surface.primaryMessage.body}</p>
          <strong>{surface.primaryMessage.nextStep}</strong>
        </div>
        {pendingAppeals > 0 ? (
          <Link href="/platform/appeals" className={styles.heroLink}>
            {pendingAppeals.toLocaleString("ar-SA")} {t("pendingAppeal")}
          </Link>
        ) : null}
      </section>

      <section className={styles.metricsGrid}>
        {surface.metrics.map((metric) => (
          <article
            key={metric.id}
            className={`${styles.metricCard} ${
              styles[`metricCard_${metric.tone}`] ?? ""
            }`}
          >
            <span>{metric.label}</span>
            <strong>{metric.value.toLocaleString("ar-SA")}</strong>
            <p>{metric.caption}</p>
          </article>
        ))}
      </section>

      <section className={styles.surfaceSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>{t("requiredActionsTitle")}</h2>
            <p>{t("requiredActionsDesc")}</p>
          </div>
          <span>{surface.requiredActions.length.toLocaleString("ar-SA")}</span>
        </div>
        <div className={styles.actionGrid}>
          {surface.requiredActions.map((action) => (
            <article
              key={action.id}
              className={`${styles.actionCard} ${
                styles[`actionCard_${action.priority}`] ?? ""
              }`}
            >
              <span>{actionPriorityLabel(t, action.priority)}</span>
              <h3>{action.title}</h3>
              <p>{action.body}</p>
              {action.scopeText ? <em>{action.scopeText}</em> : null}
              <strong>{action.expectedAfterAction}</strong>
              {action.cta ? (
                <Link href={action.cta.href} className={styles.inlineLink}>
                  {action.cta.label}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {surface.activeSupportSessions.length > 0 ? (
        <section className={styles.surfaceSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>{t("activeSupportSessionsTitle")}</h2>
              <p>{t("activeSupportSessionsDesc")}</p>
            </div>
          </div>
          <div className={styles.supportSessionList}>
            {surface.activeSupportSessions.map((session) => (
              <article key={session.id} className={styles.supportSessionCard}>
                <div>
                  <span>{session.statusLabel}</span>
                  <h3>{session.entityName ?? t("unscopedSupportSession")}</h3>
                  {session.operatorName ? (
                    <p>
                      {session.operatorName} — {session.operatorRoleLabel}
                    </p>
                  ) : null}
                </div>
                <p>{session.scope}</p>
                <small>
                  {t("expiresAt", { date: formatDate(session.expiresAt) })}
                </small>
                <em>{session.whyShown}</em>
                {session.cta ? (
                  <Link href={session.cta.href} className={styles.inlineLink}>
                    {session.cta.label}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.surfaceTwoColumn}>
        <div className={styles.surfacePanel}>
          <div className={styles.sectionHeader}>
            <h2>{t("aggregateInsightsTitle")}</h2>
          </div>
          <div className={styles.insightList}>
            {surface.aggregateInsights.map((insight) => (
              <article
                key={insight.id}
                className={`${styles.insightItem} ${
                  styles[`insightItem_${insight.tone}`] ?? ""
                }`}
              >
                <strong>{insight.value.toLocaleString("ar-SA")}</strong>
                <div>
                  <span>{insight.title}</span>
                  <p>{insight.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.surfacePanel}>
          <div className={styles.sectionHeader}>
            <h2>{t("capabilitiesTitle")}</h2>
          </div>
          <div className={styles.capabilityList}>
            {surface.capabilities.map((capability) => (
              <article
                key={capability.key}
                className={
                  capability.isAllowed
                    ? styles.capabilityAllowed
                    : styles.capabilityBlocked
                }
              >
                <span>
                  {capability.isAllowed ? t("allowed") : t("blocked")}
                </span>
                <strong>{capability.label}</strong>
                <p>{capability.reason}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {surface.entityReviews.length > 0 ? (
        <section className={styles.surfaceSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>{t("entityReviewsTitle")}</h2>
              <p>{t("entityReviewsDesc")}</p>
            </div>
          </div>
          <div className={styles.reviewList}>
            {surface.entityReviews.map((item) => (
              <article key={item.id} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <span data-status={item.status}>{item.statusLabel}</span>
                  <small>{item.entityTypeLabel}</small>
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <em>{item.reason}</em>
                <small>
                  {t("memberCount", {
                    count: item.memberCount.toLocaleString("ar-SA"),
                  })}
                </small>
                {item.cta ? (
                  <Link href={item.cta.href} className={styles.inlineLink}>
                    {item.cta.label}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {surface.accessEvents.length > 0 ? (
        <section className={styles.surfaceSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>{t("accessEventsTitle")}</h2>
              <p>{t("accessEventsDesc")}</p>
            </div>
          </div>
          <div className={styles.accessEventList}>
            {surface.accessEvents.map((event) => (
              <article key={event.id} className={styles.accessEventCard}>
                <span>{event.accessTypeLabel}</span>
                <h3>{event.title}</h3>
                <p>{event.body}</p>
                <em>{event.reason}</em>
                <small>
                  {t("operatorAt", {
                    operator: event.operatorName,
                    date: formatDate(event.startedAt),
                  })}
                </small>
                {event.needsReview ? <strong>{t("needsReview")}</strong> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {canManageEntities ? (
        <details className={styles.legacyDetails}>
          <summary>{t("legacyTableSummary")}</summary>
          <p>{t("legacyTableHint")}</p>

          <div className={styles.filterRow}>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t("filterAllStatuses")}</option>
              <option value="ACTIVE">{t("statusActive")}</option>
              <option value="SUSPENDED">{t("statusSuspended")}</option>
              <option value="READ_ONLY">{t("statusReadOnly")}</option>
              <option value="PENDING_REVIEW">{t("statusPendingReview")}</option>
            </select>
            <span className={styles.legacyCount}>
              {t("resultsCount", { count: total.toLocaleString("ar-SA") })}
            </span>
          </div>

          {loading ? (
            <p className={styles.loadingText}>{t("loadingShort")}</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("colEntityName")}</th>
                    <th>{t("colType")}</th>
                    <th>{t("colMembers")}</th>
                    <th>{t("colStatus")}</th>
                    <th>{t("colCreatedAt")}</th>
                    <th>{t("colAction")}</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.map((entity) => (
                    <tr key={entity.id}>
                      <td>{entity.name}</td>
                      <td>{entityTypeLabel(t, entity.type)}</td>
                      <td>{entity._count.memberships}</td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          data-status={entity.platformStatus}
                        >
                          {statusLabel(t, entity.platformStatus)}
                        </span>
                      </td>
                      <td>
                        {new Date(entity.foundedAt).toLocaleDateString("ar-SA")}
                      </td>
                      <td>
                        {entity.platformStatus === "ACTIVE" ||
                        entity.platformStatus === "PENDING_REVIEW" ? (
                          <button
                            className={styles.actionBtnDanger}
                            disabled={actionLoading === entity.id}
                            onClick={() => void handleSuspend(entity)}
                          >
                            {t("suspend")}
                          </button>
                        ) : (
                          <button
                            className={styles.actionBtnSafe}
                            disabled={actionLoading === entity.id}
                            onClick={() => void handleActivate(entity)}
                          >
                            {t("activate")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </details>
      ) : null}

      {suspendDialog && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSuspendDialog(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {t("suspendEntityTitle", {
                kind: targetKindLabel(suspendDialog.entity),
                name: suspendDialog.entity.name,
              })}
            </h3>
            <p className={styles.modalHint}>{t("suspendHint")}</p>
            <textarea
              className={styles.modalTextarea}
              value={suspendDialog.reason}
              onChange={(e) =>
                setSuspendDialog((d) => d && { ...d, reason: e.target.value })
              }
              placeholder={t("suspendReasonPlaceholder")}
              rows={3}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setSuspendDialog(null)}
              >
                {t("cancel")}
              </button>
              <button
                className={styles.modalDangerBtn}
                disabled={
                  suspendDialog.reason.trim().length < 5 || !!actionLoading
                }
                onClick={() => void confirmSuspend()}
              >
                {actionLoading
                  ? t("suspending")
                  : t("suspendEntityBtn", {
                      kind: targetKindLabel(suspendDialog.entity),
                    })}
              </button>
            </div>
          </div>
        </div>
      )}

      {activateTarget && (
        <div
          className={styles.modalOverlay}
          onClick={() => setActivateTarget(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {t("activateEntityTitle", {
                kind: targetKindLabel(activateTarget),
              })}
            </h3>
            <p className={styles.modalBody}>
              {t.rich("activateConfirmBody", {
                name: activateTarget.name,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setActivateTarget(null)}
              >
                {t("cancel")}
              </button>
              <button
                className={styles.modalSafeBtn}
                disabled={!!actionLoading}
                onClick={() => void confirmActivate()}
              >
                {actionLoading
                  ? t("activating")
                  : t("activateEntityBtn", {
                      kind: targetKindLabel(activateTarget),
                    })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
