"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  getDecisions,
  castVote,
  retryExecution,
  Decision,
} from "../../../lib/api/decisions";
import { fileAppeal, type Appeal } from "../../../lib/api/appeals";
import type { Translator } from "../../../lib/i18n";
import styles from "./decisions.module.css";
import RuleSummaryPanel from "../../../components/Governance/RuleSummaryPanel";
import AccessReasonPanel, {
  inferReason,
} from "../../../components/shared/AccessReasonPanel";

function isAccessError(msg: string) {
  const lower = msg.toLowerCase();
  return (
    lower.includes("forbidden") ||
    lower.includes("unauthorized") ||
    lower.includes("403") ||
    lower.includes("not a member") ||
    lower.includes("not subscribed") ||
    lower.includes("suspended") ||
    lower.includes("waiting") ||
    lower.includes("role") ||
    lower.includes("permission")
  );
}

function getDecisionReason(
  decision: Decision,
  canVote: boolean,
  t: Translator,
) {
  if (!canVote) {
    if (decision.hasVoted) return t("reasonAlreadyVoted");
    if (decision.votersScope === "COMMITTEE")
      return t("reasonVisibleCommitteeOnly");
    if (
      decision.votersScope === "PATH_SUBSCRIBERS" ||
      decision.governancePath
    ) {
      return t("reasonVisiblePathOnly", {
        path: decision.governancePath?.name ?? t("pathFallback"),
      });
    }
    return t("reasonVisibleObserver");
  }

  if (decision.voteType === "ONE_FAMILY_ONE_VOTE") {
    return t("reasonFamilyVote");
  }

  if (decision.votersScope === "PATH_SUBSCRIBERS") {
    return t("reasonPathSubscriber", {
      path: decision.governancePath?.name ?? t("pathFallback"),
    });
  }

  if (decision.votersScope === "COMMITTEE") {
    return t("reasonCommitteeVote");
  }

  switch (decision.decisionType) {
    case "EXPEL_MEMBER":
      return t("reasonEviction");
    case "ACCEPT_MEMBER":
      return t("reasonMembership");
    case "DISBURSE_FUNDS":
      return t("reasonDisbursement");
    case "MODIFY_SUBSCRIPTION":
      return t("reasonPolicy");
    case "MODIFY_GOVERNANCE":
      return t("reasonGovernance");
    default:
      return t("reasonDefault");
  }
}

function isDecisionOpen(decision: Decision) {
  return (
    decision.status === "OPEN" && new Date(decision.closesAt) >= new Date()
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function DecisionCard({
  decision,
  onRefresh,
}: {
  decision: Decision;
  onRefresh: () => void;
}) {
  const t = useTranslations("decisions");
  const tCommon = useTranslations("common");
  const closesAt = new Date(decision.closesAt);

  const DECISION_TYPE_LABELS: Record<string, string> = {
    CREATE_WALLET: t("typeCreateWallet"),
    CREATE_PATH: t("typeCreatePath"),
    DISBURSE_FUNDS: t("typeDisburseFunds"),
    MODIFY_SUBSCRIPTION: t("typeModifySubscription"),
    MODIFY_GOVERNANCE: t("typeModifyGovernance"),
    TRANSFER_BALANCE: t("typeTransferBalance"),
    ACCEPT_MEMBER: t("typeAcceptMember"),
    EXPEL_MEMBER: t("typeExpelMember"),
    OPEN_DISPUTE: t("typeOpenDispute"),
    CLOSE_WALLET: t("typeCloseWallet"),
    FREEZE_WALLET: t("typeFreezeWallet"),
    MERGE_PATHS: t("typeMergePaths"),
  };
  const isOpen = isDecisionOpen(decision);
  const canVote = isOpen && decision.canVote !== false && !decision.hasVoted;
  const hasVoted = Boolean(decision.hasVoted);

  const STATUS_LABELS: Record<string, string> = {
    OPEN: t("statusOpen"),
    CLOSED: t("statusClosed"),
    AUTO_CLOSED: t("statusAutoClosed"),
    APPEALED: t("statusAppealed"),
    EXPIRED: t("statusExpired"),
  };

  const EXECUTION_STATUS_LABELS: Record<string, string> = {
    NOT_STARTED: t("execNotStarted"),
    PARTIAL: t("execPartial"),
    COMPLETED: t("execCompleted"),
    REVERSED: t("execReversed"),
    FAILED: t("execFailed"),
  };
  const RESULT_LABELS: Record<string, string> = {
    PENDING: t("resultPending"),
    APPROVED: t("resultApproved"),
    REJECTED: t("resultRejected"),
  };

  const VOTE_LABELS: Record<string, string> = {
    APPROVE: t("voteApprove"),
    REJECT: t("voteReject"),
    ABSTAIN: t("voteAbstain"),
  };
  const APPEAL_TYPE_LABELS: Record<string, string> = {
    CLARIFICATION_REQUEST: t("appealTypeClarification"),
    APPEAL: t("appealTypeAppeal"),
    FORMAL_REVIEW: t("appealTypeFormalReview"),
    ESCALATION: t("appealTypeEscalation"),
    INTERNAL_DISPUTE: t("appealTypeInternalDispute"),
    POLICY_VIOLATION: t("appealTypePolicyViolation"),
    LEGAL_CONCERN: t("appealTypeLegalConcern"),
  };
  const decisionTypeLabel =
    DECISION_TYPE_LABELS[decision.decisionType] ?? decision.decisionType;
  const decisionImpact =
    decision.decisionType === "DISBURSE_FUNDS"
      ? t("effectDisburseFunds")
      : decision.decisionType === "TRANSFER_BALANCE"
        ? t("effectTransferBalance")
        : decision.decisionType === "MODIFY_SUBSCRIPTION"
          ? t("effectModifySubscription")
          : decision.decisionType === "MODIFY_GOVERNANCE"
            ? t("effectModifyGovernance")
            : decision.decisionType === "ACCEPT_MEMBER"
              ? t("effectAcceptMember")
              : decision.decisionType === "EXPEL_MEMBER"
                ? t("effectExpelMember")
                : decision.decisionType === "CREATE_WALLET"
                  ? t("effectCreateWallet")
                  : decision.decisionType === "CREATE_PATH"
                    ? t("effectCreatePath")
                    : t("effectGeneral");
  const effectAffected =
    decision.decisionType === "DISBURSE_FUNDS"
      ? t("effectAffectedDisburseFunds", {
          path: decision.governancePath?.name ?? t("pathFallback"),
        })
      : decision.decisionType === "TRANSFER_BALANCE"
        ? t("effectAffectedTransferBalance")
        : decision.decisionType === "MODIFY_SUBSCRIPTION"
          ? t("effectAffectedModifySubscription", {
              path: decision.governancePath?.name ?? t("pathFallback"),
            })
          : decision.decisionType === "MODIFY_GOVERNANCE"
            ? t("effectAffectedModifyGovernance")
            : decision.decisionType === "ACCEPT_MEMBER"
              ? t("effectAffectedAcceptMember")
              : decision.decisionType === "EXPEL_MEMBER"
                ? t("effectAffectedExpelMember")
                : decision.decisionType === "CREATE_WALLET"
                  ? t("effectAffectedCreateWallet")
                  : decision.decisionType === "CREATE_PATH"
                    ? t("effectAffectedCreatePath")
                    : t("effectAffectedGeneral");
  const effectNextStep =
    isOpen && canVote
      ? t("effectNextVote")
      : isOpen
        ? t("effectNextObserve")
        : decision.status === "APPEALED"
          ? t("effectNextAppeal")
          : decision.executionStatus === "FAILED"
            ? t("effectNextRetry")
            : decision.result === "APPROVED" &&
                decision.decisionType === "DISBURSE_FUNDS" &&
                decision.executionStatus !== "COMPLETED"
              ? t("effectNextDisburse")
              : decision.result === "APPROVED" &&
                  decision.executionStatus !== "COMPLETED"
                ? t("effectNextExecute")
                : decision.result === "REJECTED"
                  ? t("effectNextRejected")
                  : t("effectNextCompleted");

  const [voting, setVoting] = useState(false);
  const [choice, setChoice] = useState<"APPROVE" | "REJECT" | "ABSTAIN">(
    "APPROVE",
  );
  const [notes, setNotes] = useState("");
  const [coiDeclared, setCoiDeclared] = useState(false);

  const [confirmRetry, setConfirmRetry] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealType, setAppealType] = useState("APPEAL");
  const [appealReason, setAppealReason] = useState("");
  const [appealRequestedAction, setAppealRequestedAction] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealMessage, setAppealMessage] = useState<string | null>(null);
  const [filedAppeal, setFiledAppeal] = useState<Appeal | null>(null);
  const appealsCount = decision._count?.appeals ?? 0;
  const canFileAppeal =
    !isOpen &&
    (decision.status === "CLOSED" || decision.status === "APPEALED");
  const entityId = decision.governancePath?.wallet?.entityId;
  const appealDisputeHref =
    filedAppeal && entityId
      ? `/disputes?entityId=${encodeURIComponent(entityId)}&linkedAppealId=${encodeURIComponent(filedAppeal.id)}&decisionId=${encodeURIComponent(decision.id)}&decisionTitle=${encodeURIComponent(decision.title)}`
      : null;

  // أنواع القرارات التي قد تحمل تعارض مصالح
  const COI_TYPES = new Set([
    "EXPEL_MEMBER",
    "ACCEPT_MEMBER",
    "DISBURSE_FUNDS",
    "MODIFY_SUBSCRIPTION",
  ]);
  const hasPotentialCoI = COI_TYPES.has(decision.decisionType);

  function declareCoI() {
    setCoiDeclared(true);
    setChoice("ABSTAIN");
    setNotes(t("coiDeclareNote"));
    setVoting(true);
  }

  async function submitVote() {
    setLoading(true);
    setError(null);
    try {
      await castVote(decision.id, choice, notes || undefined);
      setVoting(false);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("voteFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function submitRetry() {
    setLoading(true);
    setError(null);
    try {
      await retryExecution(decision.id);
      setConfirmRetry(false);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retryFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function submitAppeal() {
    setAppealSubmitting(true);
    setAppealMessage(null);
    setError(null);
    try {
      const appeal = await fileAppeal({
        decisionId: decision.id,
        type: appealType,
        reason: appealReason,
        requestedAction: appealRequestedAction || undefined,
      });
      setFiledAppeal(appeal);
      setAppealMessage(t("appealSuccess"));
      setAppealOpen(false);
      setAppealReason("");
      setAppealRequestedAction("");
      onRefresh();
    } catch (e) {
      setAppealMessage(e instanceof Error ? e.message : t("appealFailed"));
    } finally {
      setAppealSubmitting(false);
    }
  }

  return (
    <div className={styles.card} id={`decision-${decision.id}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>{decision.title}</div>
        <div className={styles.cardHeaderFlex}>
          <div
            className={`${styles.statusBadge} ${isOpen ? styles.statusOpen : styles.statusClosed}`}
          >
            {STATUS_LABELS[decision.status] ?? decision.status}
          </div>
          {decision.executionStatus && (
            <div
              className={`${styles.statusBadge} ${
                decision.executionStatus === "COMPLETED"
                  ? styles.execCompleted
                  : decision.executionStatus === "FAILED"
                    ? styles.execFailed
                    : styles.execPending
              }`}
            >
              {t("executionLabel")}{" "}
              {EXECUTION_STATUS_LABELS[decision.executionStatus] ??
                decision.executionStatus}
            </div>
          )}
        </div>
      </div>

      <div className={styles.cardMeta}>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>{t("typeLabel")}</span>
          <span>{decisionTypeLabel}</span>
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>{t("votesLabel")}</span>
          <span>{t("votesCount", { count: decision._count?.votes ?? 0 })}</span>
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>{t("appealsLabel")}</span>
          <span>{t("appealsCount", { count: appealsCount })}</span>
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>{t("expiresLabel")}</span>
          <span>{closesAt.toLocaleDateString("ar-SA")}</span>
        </span>
      </div>

      <section className={styles.effectPanel}>
        <div className={styles.effectHeader}>
          <h3 className={styles.effectTitle}>{t("effectTitle")}</h3>
          <span className={styles.effectType}>{decisionTypeLabel}</span>
        </div>
        <div className={styles.effectGrid}>
          <div>
            <span>{t("effectPath")}</span>
            <strong>
              {decision.governancePath?.name ?? t("pathFallback")}
            </strong>
          </div>
          <div>
            <span>{t("effectAmount")}</span>
            <strong>
              {decision.amount != null
                ? formatCurrency(Number(decision.amount))
                : t("effectNotApplicable")}
            </strong>
          </div>
          <div>
            <span>{t("effectResult")}</span>
            <strong>
              {RESULT_LABELS[decision.result] ?? decision.result}
            </strong>
          </div>
          <div>
            <span>{t("effectExecution")}</span>
            <strong>
              {decision.executionStatus
                ? (EXECUTION_STATUS_LABELS[decision.executionStatus] ??
                  decision.executionStatus)
                : t("execNotStarted")}
            </strong>
          </div>
          <div>
            <span>{t("effectAffected")}</span>
            <strong>{effectAffected}</strong>
          </div>
          <div>
            <span>{t("effectNextStep")}</span>
            <strong>{effectNextStep}</strong>
          </div>
        </div>
        <p className={styles.effectOutcome}>{decisionImpact}</p>
      </section>

      {error &&
        (isAccessError(error) ? (
          <AccessReasonPanel reason={inferReason(error)} detail={error} />
        ) : (
          <div className={styles.error}>{error}</div>
        ))}

      {isOpen && (
        <RuleSummaryPanel
          title={canVote ? t("whyVoteTitle") : t("whyVisibleTitle")}
          summary={getDecisionReason(decision, canVote, t)}
          icon="📋"
        />
      )}

      {isOpen && hasPotentialCoI && !voting && (
        <div className={styles.coiBanner}>
          <span className={styles.coiIcon}>⚖</span>
          <div className={styles.coiBody}>
            <span className={styles.coiTitle}>{t("coiTitle")}</span>
            <span className={styles.coiNote}>{t("coiNote")}</span>
          </div>
          <button className={styles.coiDeclareBtn} onClick={declareCoI}>
            {t("coiDeclareBtn")}
          </button>
        </div>
      )}

      {isOpen && decision.voteType === "ONE_FAMILY_ONE_VOTE" && (
        <div className={styles.householdVoteBanner}>
          <span className={styles.coiIcon}>⚠️</span>
          <span>{t("familyVoteWarning")}</span>
        </div>
      )}

      {isOpen && hasVoted && (
        <div className={styles.infoBanner}>{t("alreadyVoted")}</div>
      )}

      {isOpen && !canVote && !hasVoted && (
        <div className={styles.infoBanner}>{t("notEligibleToVote")}</div>
      )}

      {isOpen && canVote && !voting && (
        <button className={styles.voteBtn} onClick={() => setVoting(true)}>
          {t("voteBtn")}
        </button>
      )}

      {isOpen && canVote && voting && (
        <div className={styles.voteEditor}>
          {coiDeclared && (
            <div className={styles.coiActiveNote}>✓ {t("coiActiveNote")}</div>
          )}
          <div className={styles.voteOptions}>
            {(["APPROVE", "REJECT", "ABSTAIN"] as const).map((c) => (
              <button
                key={c}
                className={`${styles.voteOption} ${choice === c ? styles.voteOptionSelected : ""} ${
                  choice === c
                    ? c === "APPROVE"
                      ? styles.voteApprove
                      : c === "REJECT"
                        ? styles.voteReject
                        : styles.voteAbstain
                    : ""
                }`}
                onClick={() => setChoice(c)}
              >
                {VOTE_LABELS[c]}
              </button>
            ))}
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor={`notes-${decision.id}`}>
              {t("notesLabel")}
            </label>
            <textarea
              id={`notes-${decision.id}`}
              className={styles.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className={styles.voteActions}>
            <button
              onClick={submitVote}
              disabled={loading}
              className={styles.submitVote}
            >
              {loading ? "..." : t("confirmVote")}
            </button>
            <button
              onClick={() => setVoting(false)}
              disabled={loading}
              className={styles.ghostAction}
            >
              {tCommon("cancel")}
            </button>
          </div>
        </div>
      )}

      {canFileAppeal && (
        <section className={styles.appealPanel}>
          <div className={styles.appealHeader}>
            <div>
              <h3 className={styles.appealTitle}>{t("appealPanelTitle")}</h3>
              <p className={styles.appealHint}>{t("appealPanelHint")}</p>
            </div>
            {!appealOpen && (
              <button
                type="button"
                className={styles.appealBtn}
                onClick={() => setAppealOpen(true)}
              >
                {t("appealOpenBtn")}
              </button>
            )}
          </div>

          {appealMessage && (
            <div
              className={`${styles.appealMessage} ${
                appealMessage.startsWith("✓")
                  ? styles.appealSuccess
                  : styles.appealError
              }`}
            >
              {appealMessage}
            </div>
          )}

          {filedAppeal && (
            <div className={styles.appealNextStep}>
              <span>
                {t("appealNextStep", { id: filedAppeal.id.slice(0, 8) })}
              </span>
              {appealDisputeHref && (
                <Link className={styles.appealDisputeLink} href={appealDisputeHref}>
                  {t("appealOpenLinkedDispute")}
                </Link>
              )}
            </div>
          )}

          {appealOpen && (
            <div className={styles.appealForm}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor={`appeal-type-${decision.id}`}>
                  {t("appealTypeLabel")}
                </label>
                <select
                  id={`appeal-type-${decision.id}`}
                  className={styles.select}
                  value={appealType}
                  onChange={(e) => setAppealType(e.target.value)}
                >
                  {Object.entries(APPEAL_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor={`appeal-reason-${decision.id}`}>
                  {t("appealReasonLabel")}
                </label>
                <textarea
                  id={`appeal-reason-${decision.id}`}
                  className={styles.textarea}
                  value={appealReason}
                  minLength={10}
                  rows={3}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder={t("appealReasonPlaceholder")}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor={`appeal-action-${decision.id}`}>
                  {t("appealRequestedActionLabel")}
                </label>
                <textarea
                  id={`appeal-action-${decision.id}`}
                  className={styles.textarea}
                  value={appealRequestedAction}
                  rows={2}
                  onChange={(e) => setAppealRequestedAction(e.target.value)}
                  placeholder={t("appealRequestedActionPlaceholder")}
                />
              </div>
              <div className={styles.voteActions}>
                <button
                  type="button"
                  className={styles.submitVote}
                  disabled={appealSubmitting || appealReason.trim().length < 10}
                  onClick={submitAppeal}
                >
                  {appealSubmitting ? "..." : t("appealSubmitBtn")}
                </button>
                <button
                  type="button"
                  className={styles.ghostAction}
                  disabled={appealSubmitting}
                  onClick={() => setAppealOpen(false)}
                >
                  {tCommon("cancel")}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {!isOpen && decision.executionStatus === "FAILED" && !confirmRetry && (
        <button
          className={`${styles.voteBtn} ${styles.btnRetry}`}
          onClick={() => setConfirmRetry(true)}
        >
          {t("retryBtn")}
        </button>
      )}

      {confirmRetry && (
        <div className={styles.confirmPanel}>
          <span className={styles.confirmText}>{t("retryConfirm")}</span>
          <button
            onClick={submitRetry}
            disabled={loading}
            className={styles.confirmDanger}
          >
            {loading ? "..." : tCommon("yes")}
          </button>
          <button
            onClick={() => setConfirmRetry(false)}
            disabled={loading}
            className={styles.ghostAction}
          >
            {tCommon("no")}
          </button>
        </div>
      )}
    </div>
  );
}

// VoteModal was removed to embrace inline confirmations

export default function DecisionsPage() {
  const t = useTranslations("decisions");
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const entityId = searchParams.get("entityId");
      if (entityId && typeof window !== "undefined") {
        localStorage.setItem("currentEntityId", entityId);
      }
      setDecisions(await getDecisions());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("generalError"));
    } finally {
      setLoading(false);
    }
  }, [t, searchParams]);

  // handleRetry is now handled inline inside DecisionCard

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || typeof window === "undefined" || !window.location.hash)
      return;
    const target = document.querySelector(window.location.hash);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [decisions, loading]);

  const openCount = decisions.filter(isDecisionOpen).length;
  const closedCount = decisions.length - openCount;
  const visibleDecisions = decisions.filter((decision) => {
    if (filter === "OPEN") return isDecisionOpen(decision);
    if (filter === "CLOSED") return !isDecisionOpen(decision);
    return true;
  });

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
        <div className={styles.filters} aria-label={t("filterLabel")}>
          {(
            [
              ["ALL", t("filterAll", { count: decisions.length })],
              ["OPEN", t("filterOpen", { count: openCount })],
              ["CLOSED", t("filterClosed", { count: closedCount })],
            ] as const
          ).map(([value, label]) => {
            const isPressed = filter === value;
            return isPressed ? (
              <button
                key={value}
                type="button"
                className={`${styles.filterBtn} ${styles.filterActive}`}
                aria-pressed="true"
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ) : (
              <button
                key={value}
                type="button"
                className={styles.filterBtn}
                aria-pressed="false"
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.centered}>
          <div className={styles.spinner} />
        </div>
      ) : decisions.length === 0 ? (
        <div className={styles.empty}>{t("empty")}</div>
      ) : visibleDecisions.length === 0 ? (
        <div className={styles.empty}>{t("filterEmpty")}</div>
      ) : (
        <div className={styles.list}>
          {visibleDecisions.map((d) => (
            <DecisionCard key={d.id} decision={d} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}
