"use client";

import React, { useCallback, useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  getEntity,
  getEntityMembers,
  updateMemberRole,
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
import styles from "./members.module.css";
import RequestTimeline, {
  TimelineStep,
} from "../../../../../components/shared/RequestTimeline";

function buildApplicationTimeline(app: MembershipApplication, t: any): TimelineStep[] {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      const [ent, mems, apps] = await Promise.all([
        getEntity(entityId),
        getEntityMembers(entityId),
        getEntityMembershipApplications(entityId).catch(
          () => [] as MembershipApplication[],
        ),
      ]);
      setEntity(ent);
      setMembers(mems);
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
  }, [entityId]);

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
  const activeMembers = members.filter((m) => m.isActive);
  const inactiveMembers = members.filter((m) => !m.isActive);

  return (
    <div className={styles.page}>
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
                    إلغاء
                  </button>
                </div>
              ) : (
                <span className={styles.roleBadge} data-role={m.role}>
                  {getRoleLabel(m.role)}
                </span>
              )}

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
                  <button
                    className={styles.ghostBtn}
                    onClick={() => {
                      setEditingRoleId(m.id);
                      setNewRole(m.role);
                    }}
                  >
                    {t("changeRole")}
                  </button>
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
