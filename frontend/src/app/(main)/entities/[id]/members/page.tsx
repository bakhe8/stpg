"use client";

import React, { useCallback, useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  getEntity,
  getEntityMembers,
  updateMemberRole,
  updateAdvancedSettingsAccess,
  activateMembership,
  removeMembership,
  Entity,
  EntityMember,
} from "../../../../../lib/api/entities";
import {
  getEntityMembershipApplications,
  approveMembershipApplication,
  rejectMembershipApplication,
  MembershipApplication,
} from "../../../../../lib/api/membership-applications";
import Breadcrumbs from "../../../../../components/shared/Breadcrumbs";
import {
  getEntityPaymentDues,
  getSubscriptions,
  PaymentDue,
  Subscription,
} from "../../../../../lib/api/subscriptions";
import type { Translator } from "../../../../../lib/i18n";
import styles from "./members.module.css";
import RequestTimeline, {
  TimelineStep,
} from "../../../../../components/shared/RequestTimeline";

function buildApplicationTimeline(
  app: MembershipApplication,
  t: Translator,
): TimelineStep[] {
  const isFinal =
    app.status === "APPROVED" ||
    app.status === "REJECTED" ||
    app.status === "CANCELLED";
  return [
    { label: t("appSubmitted"), at: app.submittedAt, done: true },
    {
      label: isFinal ? t("appReviewed") : t("statusUnderReview"),
      done: isFinal,
      active: app.status === "PENDING" || app.status === "UNDER_REVIEW",
    },
    {
      label:
        app.status === "APPROVED"
          ? t("membersPage.statusApproved")
          : app.status === "REJECTED"
            ? t("membersPage.statusRejected")
            : app.status === "CANCELLED"
              ? t("membersPage.statusCancelled")
              : t("membersPage.timelineDecision"),
      at: app.reviewedAt ?? undefined,
      done: isFinal,
      failed: app.status === "REJECTED" || app.status === "CANCELLED",
    },
  ];
}

// ROLE_LABELS will be translated dynamically in the component

const ROLES_ASSIGNABLE = [
  "MEMBER",
  "ADMIN",
  "TREASURER",
  "AUDITOR",
  "COMMITTEE_MEMBER",
];

function toNumber(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function canManage(myRole: string | null | undefined) {
  return myRole === "FOUNDER" || myRole === "ADMIN";
}

export default function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: entityId } = use(params);
  const t = useTranslations("entities");
  const tCommon = useTranslations("common");
  const nav = useTranslations("nav");

  const getRoleLabel = (role: string) => {
    const key = `role${role
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("")}`;
    return t(key) || role;
  };

  const [entity, setEntity] = useState<Entity | null>(null);
  const [members, setMembers] = useState<EntityMember[]>([]);
  const [applications, setApplications] = useState<MembershipApplication[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentDues, setPaymentDues] = useState<PaymentDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // inline actions
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [rejectAppId, setRejectAppId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ent, mems, apps, subs, dues] = await Promise.all([
        getEntity(entityId),
        getEntityMembers(entityId),
        getEntityMembershipApplications(entityId).catch(
          () => [] as MembershipApplication[],
        ),
        getSubscriptions({ entityId }).catch(() => [] as Subscription[]),
        getEntityPaymentDues(entityId).catch(() => [] as PaymentDue[]),
      ]);
      setEntity(ent);
      setMembers(mems);
      setSubscriptions(subs);
      setPaymentDues(dues);
      setApplications(
        apps.filter(
          (a) => a.status === "PENDING" || a.status === "UNDER_REVIEW",
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [entityId, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function doAction(fn: () => Promise<unknown>, successMsg: string) {
    setActionLoading(true);
    setActionMsg(null);
    try {
      await fn();
      setActionMsg({ text: successMsg, ok: true });
      void loadAll();
    } catch (e) {
      setActionMsg({
        text: e instanceof Error ? e.message : tCommon("failed"),
        ok: false,
      });
    } finally {
      setActionLoading(false);
      setEditingRoleId(null);
      setConfirmRemoveId(null);
      setRejectAppId(null);
      setRejectNotes("");
    }
  }

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (error) return <div className={styles.errorMsg}>⚠ {error}</div>;
  if (!entity) return null;

  const manage = canManage(entity.myRole);
  const founder = entity.myRole === "FOUNDER";
  const allRoles = Array.from(new Set(members.map((m) => m.role)));
  const matchesFilter = (m: EntityMember) => {
    if (roleFilter !== "ALL" && m.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      m.person.name.toLowerCase().includes(q) ||
      m.person.username.toLowerCase().includes(q)
    );
  };
  const activeMembers = members.filter((m) => m.isActive).filter(matchesFilter);
  const inactiveMembers = members.filter((m) => !m.isActive).filter(matchesFilter);
  const formatMoney = (amount: number) =>
    `${amount.toLocaleString("ar-SA", { maximumFractionDigits: 0 })} ر.س`;
  const buildMemberDisputeHref = (member: EntityMember) => {
    const params = new URLSearchParams({
      entityId,
      respondentId: member.person.id,
      respondentName: member.person.name,
    });
    return `/disputes?${params.toString()}`;
  };

  const buildMemberOperationalSummary = (member: EntityMember) => {
    const memberSubscriptions = subscriptions.filter(
      (subscription) =>
        subscription.state !== "EXITED" &&
        (subscription.membershipId === member.id ||
          subscription.membership?.id === member.id ||
          subscription.membership?.person.id === member.person.id),
    );
    const memberDues = paymentDues.filter(
      (due) =>
        due.subscription?.membership?.id === member.id ||
        due.subscription?.membership?.person?.id === member.person.id,
    );
    const overdueAmount = memberDues
      .filter((due) => due.status === "OVERDUE")
      .reduce((sum, due) => sum + toNumber(due.amountDue), 0);
    const pendingAmount = memberDues
      .filter((due) => due.status === "PENDING")
      .reduce((sum, due) => sum + toNumber(due.amountDue), 0);
    const activePathCount = memberSubscriptions.filter(
      (subscription) => subscription.state === "ACTIVE",
    ).length;
    const conditionalPathCount = memberSubscriptions.filter(
      (subscription) => subscription.state === "CONDITIONAL",
    ).length;
    const supporterOnlyPathCount = memberSubscriptions.filter(
      (subscription) => subscription.state === "SUPPORTER_ONLY",
    ).length;
    const suspendedPathCount = memberSubscriptions.filter(
      (subscription) => subscription.state === "SUSPENDED",
    ).length;
    const pathNames = Array.from(
      new Set(
        memberSubscriptions
          .map((subscription) => subscription.governancePath?.name)
          .filter(Boolean),
      ),
    ) as string[];

    let rightsText = t("memberOpsRightsNoSubscription");
    if (!member.isActive) {
      rightsText = t("memberOpsRightsInactive");
    } else if (supporterOnlyPathCount > 0 && activePathCount === 0) {
      rightsText = t("memberOpsRightsSupporterOnly");
    } else if (conditionalPathCount > 0) {
      rightsText = t("memberOpsRightsConditional");
    } else if (suspendedPathCount > 0 && activePathCount === 0) {
      rightsText = t("memberOpsRightsSuspended");
    } else if (activePathCount > 0) {
      rightsText = t("memberOpsRightsActive", { count: activePathCount });
    }

    return {
      activePathCount,
      conditionalPathCount,
      supporterOnlyPathCount,
      suspendedPathCount,
      pathNames,
      overdueAmount,
      pendingAmount,
      rightsText,
    };
  };

  const renderMemberOperationalSummary = (member: EntityMember) => {
    const summary = buildMemberOperationalSummary(member);
    const totalDue = summary.overdueAmount + summary.pendingAmount;
    const dueLabel =
      totalDue <= 0
        ? t("memberOpsNoDue")
        : summary.overdueAmount > 0
          ? t("memberOpsDueOverdue", {
              amount: formatMoney(summary.overdueAmount),
            })
          : t("memberOpsDuePending", {
              amount: formatMoney(summary.pendingAmount),
            });

    return (
      <div className={styles.memberOperational}>
        <div className={styles.memberOperationalHeader}>
          <span>{t("memberOpsTitle")}</span>
          <span
            className={
              totalDue > 0 ? styles.memberDueWarning : styles.memberDueOk
            }
          >
            {dueLabel}
          </span>
        </div>
        <div className={styles.memberMetrics}>
          <span>
            {t("memberOpsActivePaths", {
              count: summary.activePathCount,
            })}
          </span>
          {summary.conditionalPathCount > 0 && (
            <span>
              {t("memberOpsConditionalPaths", {
                count: summary.conditionalPathCount,
              })}
            </span>
          )}
          {summary.supporterOnlyPathCount > 0 && (
            <span>
              {t("memberOpsSupporterOnlyPaths", {
                count: summary.supporterOnlyPathCount,
              })}
            </span>
          )}
          {summary.suspendedPathCount > 0 && (
            <span>
              {t("memberOpsSuspendedPaths", {
                count: summary.suspendedPathCount,
              })}
            </span>
          )}
        </div>
        <p className={styles.memberRightsText}>{summary.rightsText}</p>
        {summary.pathNames.length > 0 ? (
          <div className={styles.memberPathChips}>
            <span className={styles.memberPathLabel}>
              {t("memberOpsPathsLabel")}
            </span>
            {summary.pathNames.slice(0, 3).map((pathName) => (
              <span key={pathName} className={styles.memberPathChip}>
                {pathName}
              </span>
            ))}
            {summary.pathNames.length > 3 && (
              <span className={styles.memberPathChip}>
                {t("memberOpsMorePaths", {
                  count: summary.pathNames.length - 3,
                })}
              </span>
            )}
          </div>
        ) : (
          <span className={styles.memberNoPaths}>
            {t("memberOpsNoPaths")}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <Breadcrumbs
        items={[
          { label: nav("dashboard"), href: "/dashboard" },
          { label: nav("entities"), href: "/entities" },
          { label: entity.name, href: `/entities/${entityId}` },
          { label: t("membersTitle") },
        ]}
      />
      <header className={styles.pageHeader}>
        <div className={styles.breadcrumb}>
          <Link href={`/entities/${entityId}`} className={styles.backLink}>
            ← {entity.name}
          </Link>
        </div>
        <h1 className={styles.pageTitle}>{t("membersTitle")}</h1>
        <span className={styles.countBadge}>
          {t("activeMembersCount", { count: activeMembers.length })}
        </span>
      </header>

      {actionMsg && (
        <div className={actionMsg.ok ? styles.successMsg : styles.errorMsg}>
          {actionMsg.text}
        </div>
      )}

      <div className={styles.filterBar}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder={t("memberSearchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className={styles.roleSelect}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label={t("memberRoleFilterLabel")}
          title={t("memberRoleFilterLabel")}
        >
          <option value="ALL">{t("memberRoleFilterAll")}</option>
          {allRoles.map((r) => (
            <option key={r} value={r}>
              {getRoleLabel(r)}
            </option>
          ))}
        </select>
      </div>


      {applications.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {t("joinRequests")}
            <span className={styles.pendingBadge}>{applications.length}</span>
          </h2>
          <div className={styles.cardList}>
            {applications.map((app) => (
              <div key={app.id} className={styles.memberCard}>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>
                    {app.person?.name ?? "—"}
                  </span>
                  <span className={styles.memberMeta}>
                    {app.person?.username ? `@${app.person.username}` : ""}
                    {app.note ? ` · "${app.note}"` : ""}
                  </span>
                </div>
                <span className={styles.roleBadge} data-role="PENDING">
                  {app.status === "UNDER_REVIEW"
                    ? t("statusUnderReview")
                    : t("statusPending")}
                </span>
                <RequestTimeline steps={buildApplicationTimeline(app, t)} compact />
                {manage && rejectAppId === app.id ? (
                  <div className={styles.rejectInline}>
                    <input
                      className={styles.noteInput}
                      placeholder={t("rejectReasonPlaceholder")}
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                    />
                    <button
                      className={styles.dangerBtn}
                      disabled={actionLoading}
                      onClick={() =>
                        doAction(
                          () =>
                            rejectMembershipApplication(
                              app.id,
                              rejectNotes || "—",
                            ),
                          t("membersPage.requestRejected"), // t("rejectSuccess")
                        )
                      }
                    >
                      {t("confirmReject")}
                    </button>
                    <button
                      className={styles.ghostBtn}
                      onClick={() => {
                        setRejectAppId(null);
                        setRejectNotes("");
                      }}
                    >
                      {t("cancel")}
                    </button>
                  </div>
                ) : manage ? (
                  <div className={styles.cardActions}>
                    <button
                      className={styles.approveBtn}
                      disabled={actionLoading}
                      onClick={() =>
                        doAction(
                          () => approveMembershipApplication(app.id),
                          t("approveSuccess"),
                        )
                      }
                    >
                      {t("approve")}
                    </button>
                    <button
                      className={styles.rejectBtn}
                      onClick={() => setRejectAppId(app.id)}
                    >
                      {t("reject")}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      )}

      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("activeMembersTitle")}</h2>
        {members.length > 0 &&
          activeMembers.length === 0 &&
          inactiveMembers.length === 0 && (
            <p className={styles.memberNoPaths}>{t("memberFilterNoResults")}</p>
          )}
        <div className={styles.cardList}>
          {activeMembers.map((m) => (
            <div key={m.id} className={styles.memberCard}>
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>{m.person.name}</span>
                <span className={styles.memberMeta}>@{m.person.username}</span>
              </div>

              {editingRoleId === m.id ? (
                <div className={styles.roleEditRow}>
                  <select
                    className={styles.roleSelect}
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    title={t("changeRole")}
                  >
                    {ROLES_ASSIGNABLE.map((r) => (
                      <option key={r} value={r}>
                        {getRoleLabel(r)}
                      </option>
                    ))}
                  </select>
                  <button
                    className={styles.approveBtn}
                    disabled={actionLoading}
                    onClick={() =>
                      doAction(
                        () => updateMemberRole(m.id, newRole),
                        t("changeRoleSuccess"),
                      )
                    }
                  >
                    {t("save")}
                  </button>
                  <button
                    className={styles.ghostBtn}
                    onClick={() => setEditingRoleId(null)}
                  >
                    {t("cancel")}
                  </button>
                </div>
              ) : (
                <div className={styles.roleBadgeGroup}>
                  <span className={styles.roleBadge} data-role={m.role}>
                    {getRoleLabel(m.role)}
                  </span>
                  {m.canManageAdvancedSettings && m.role !== "FOUNDER" ? (
                    <span className={styles.advancedAccessBadge}>
                      {t("advancedSettingsAccessBadge")}
                    </span>
                  ) : null}
                </div>
              )}

              {renderMemberOperationalSummary(m)}

              {manage && confirmRemoveId === m.id ? (
                <div className={styles.confirmRow}>
                  <span className={styles.confirmText}>
                    {t("removeMemberConfirm")}
                  </span>
                  <button
                    className={styles.dangerBtn}
                    disabled={actionLoading}
                    onClick={() =>
                      doAction(() => removeMembership(m.id), t("removeSuccess"))
                    }
                  >
                    {t("removeConfirmYes")}
                  </button>
                  <button
                    className={styles.ghostBtn}
                    onClick={() => setConfirmRemoveId(null)}
                  >
                    {t("cancel")}
                  </button>
                </div>
              ) : manage && m.role !== "FOUNDER" ? (
                <div className={styles.cardActions}>
                  <Link
                    href={buildMemberDisputeHref(m)}
                    className={styles.ghostBtn}
                  >
                    {t("openMemberDispute")}
                  </Link>
                  <button
                    className={styles.ghostBtn}
                    onClick={() => {
                      setEditingRoleId(m.id);
                      setNewRole(m.role);
                    }}
                  >
                    {t("changeRole")}
                  </button>
                  {founder ? (
                    <button
                      className={styles.ghostBtn}
                      disabled={actionLoading}
                      onClick={() =>
                        doAction(
                          () =>
                            updateAdvancedSettingsAccess(
                              m.id,
                              !m.canManageAdvancedSettings,
                            ),
                          m.canManageAdvancedSettings
                            ? t("advancedSettingsAccessRemoved")
                            : t("advancedSettingsAccessGranted"),
                        )
                      }
                    >
                      {m.canManageAdvancedSettings
                        ? t("advancedSettingsAccessRemove")
                        : t("advancedSettingsAccessGrant")}
                    </button>
                  ) : null}
                  <button
                    className={styles.rejectBtn}
                    onClick={() => setConfirmRemoveId(m.id)}
                  >
                    {t("removeMember")}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      
      {inactiveMembers.length > 0 && (
        <section className={styles.section}>
          <h2
            className={`${styles.sectionTitle} ${styles.inactiveSectionTitle}`}
          >
            {t("inactiveMembersTitle", { count: inactiveMembers.length })}
          </h2>
          <div className={styles.cardList}>
            {inactiveMembers.map((m) => (
              <div
                key={m.id}
                className={`${styles.memberCard} ${styles.memberCardInactive}`}
              >
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{m.person.name}</span>
                  <span className={styles.memberMeta}>
                    @{m.person.username}
                  </span>
                </div>
                <span className={styles.roleBadge} data-role="INACTIVE">
                  {t("statusInactive")}
                </span>
                {renderMemberOperationalSummary(m)}
                {manage && (
                  <button
                    className={styles.approveBtn}
                    disabled={actionLoading}
                    onClick={() =>
                      doAction(
                        () => activateMembership(m.id),
                        t("reactivateSuccess"),
                      )
                    }
                  >
                    {t("reactivate")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
