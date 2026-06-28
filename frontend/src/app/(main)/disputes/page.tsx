"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getMyDisputes, openDispute, Dispute } from "../../../lib/api/disputes";
import {
  getDisputeRespondentOptions,
  getEntities,
  DisputeRespondentOption,
  Entity,
} from "../../../lib/api/entities";
import styles from "./disputes.module.css";
import RuleSummaryPanel from "../../../components/Governance/RuleSummaryPanel";

export default function DisputesPage() {
  const t = useTranslations("disputes");
  const searchParams = useSearchParams();
  const linkedAppealParam = searchParams.get("linkedAppealId");
  const entityParam = searchParams.get("entityId");
  const decisionIdParam = searchParams.get("decisionId");
  const decisionTitleParam = searchParams.get("decisionTitle");
  const disbursementRequestParam = searchParams.get("disbursementRequestId");
  const disbursementTitleParam = searchParams.get("disbursementTitle");
  const respondentIdParam = searchParams.get("respondentId");
  const respondentNameParam = searchParams.get("respondentName");

  const STATUS_MAP: Record<string, { label: string; className: string }> = {
    OPEN: { label: t("statusOpen"), className: styles.statusOpen },
    UNDER_MEDIATION: { label: t("statusMediation"), className: styles.statusMediation },
    ESCALATED: { label: t("statusEscalated"), className: styles.statusEscalated },
    RESOLVED: { label: t("statusResolved"), className: styles.statusResolved },
    CLOSED: { label: t("statusClosed"), className: styles.statusClosed },
  };

  const DISPUTE_TYPES = [
    { value: "FINANCIAL_MISCONDUCT", label: t("typeFinancialMisconduct") },
    { value: "GOVERNANCE_VIOLATION", label: t("typeGovernanceViolation") },
    { value: "MEMBER_CONFLICT", label: t("typeMemberConflict") },
    { value: "POLICY_BREACH", label: t("typePolicyBreach") },
    { value: "UNFAIR_DECISION", label: t("typeUnfairDecision") },
    { value: "TRANSPARENCY_ISSUE", label: t("typeTransparencyIssue") },
    { value: "LEGAL_MATTER", label: t("typeLegalMatter") },
  ];
  const DISPUTE_TYPE_MAP = Object.fromEntries(DISPUTE_TYPES.map((dt) => [dt.value, dt.label]));

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ruleHints, setRuleHints] = useState<string[]>([]);
  const [respondents, setRespondents] = useState<DisputeRespondentOption[]>([]);
  const [respondentsLoading, setRespondentsLoading] = useState(false);
  const [linkedContext, setLinkedContext] = useState<{
    type: "appeal" | "disbursement" | "member";
    linkedAppealId: string;
    decisionId?: string;
    decisionTitle?: string;
    disbursementRequestId?: string;
    disbursementTitle?: string;
    respondentId?: string;
    respondentName?: string;
  } | null>(null);
  const [form, setForm] = useState({
    entityId: "",
    title: "",
    description: "",
    type: "FINANCIAL_MISCONDUCT",
    respondentId: "",
    deadline: "",
    linkedAppealId: "",
    disbursementRequestId: "",
  });

  async function load() {
    try {
      const [d, e] = await Promise.all([getMyDisputes(), getEntities()]);
      setDisputes(d);
      setEntities(e);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const loadRespondentsForEntity = useCallback(async (entityId: string) => {
    setRespondents([]);
    if (!entityId) return;

    setRespondentsLoading(true);
    try {
      setRespondents(await getDisputeRespondentOptions(entityId));
    } catch {
      setRespondents([]);
    } finally {
      setRespondentsLoading(false);
    }
  }, []);

  async function handleEntityChange(entityId: string) {
    setForm((current) => ({
      ...current,
      entityId,
      respondentId: "",
    }));
    await loadRespondentsForEntity(entityId);
  }

  useEffect(() => {
    const linkedAppealId = linkedAppealParam;
    const disbursementRequestId = disbursementRequestParam;
    const respondentId = respondentIdParam;
    if (!linkedAppealId && !disbursementRequestId && !respondentId) return;

    const entityId = entityParam ?? "";
    const decisionId = decisionIdParam ?? undefined;
    const decisionTitle = decisionTitleParam ?? undefined;
    const disbursementTitle = disbursementTitleParam ?? undefined;
    const respondentName = respondentNameParam ?? undefined;
    const decisionLabel =
      decisionTitle || (decisionId ? decisionId.slice(0, 8) : t("decisionFallback"));

    if (linkedAppealId) {
      setLinkedContext({
        type: "appeal",
        linkedAppealId,
        decisionId,
        decisionTitle,
      });
    } else if (disbursementRequestId) {
      setLinkedContext({
        type: "disbursement",
        linkedAppealId: "",
        disbursementRequestId,
        disbursementTitle,
      });
    } else if (respondentId) {
      setLinkedContext({
        type: "member",
        linkedAppealId: "",
        respondentId,
        respondentName,
      });
    }

    setShowForm(true);
    setForm((current) => ({
      ...current,
      entityId: entityId || current.entityId,
      linkedAppealId: linkedAppealId ?? "",
      disbursementRequestId: disbursementRequestId ?? "",
      respondentId: respondentId ?? current.respondentId,
      type: linkedAppealId
        ? "UNFAIR_DECISION"
        : disbursementRequestId
          ? "FINANCIAL_MISCONDUCT"
          : "MEMBER_CONFLICT",
      title:
        current.title ||
        (linkedAppealId
          ? t("linkedAppealTitle", { decision: decisionLabel })
          : disbursementRequestId
            ? t("linkedDisbursementTitle", {
                request:
                  disbursementTitle ||
                  disbursementRequestId?.slice(0, 8) ||
                  t("disbursementFallback"),
              })
            : t("linkedMemberTitle", {
                member:
                  respondentName ||
                  respondentId?.slice(0, 8) ||
                  t("memberFallback"),
              })),
      description:
        current.description ||
        (linkedAppealId
          ? t("linkedAppealDescription", {
              decision: decisionLabel,
              appeal: linkedAppealId.slice(0, 8),
            })
          : disbursementRequestId
            ? t("linkedDisbursementDescription", {
                request:
                  disbursementTitle ||
                  disbursementRequestId?.slice(0, 8) ||
                  t("disbursementFallback"),
                id: disbursementRequestId?.slice(0, 8) ?? "",
              })
            : t("linkedMemberDescription", {
                member:
                  respondentName ||
                  respondentId?.slice(0, 8) ||
                  t("memberFallback"),
              })),
    }));

    if (entityId) void loadRespondentsForEntity(entityId);
  }, [
    decisionIdParam,
    decisionTitleParam,
    disbursementRequestParam,
    disbursementTitleParam,
    entityParam,
    linkedAppealParam,
    respondentIdParam,
    respondentNameParam,
    loadRespondentsForEntity,
    t,
  ]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsg(null);
    setRuleHints([]);
    try {
      await openDispute({
        entityId: form.entityId,
        title: form.title,
        description: form.description,
        type: form.type,
        respondentId: form.respondentId || undefined,
        deadline: form.deadline || undefined,
        linkedAppealId: form.linkedAppealId || undefined,
        disbursementRequestId: form.disbursementRequestId || undefined,
      });
      setMsg(t("openSuccess"));
      setShowForm(false);
      setLinkedContext(null);
      setForm({
        entityId: "",
        title: "",
        description: "",
        type: "FINANCIAL_MISCONDUCT",
        respondentId: "",
        deadline: "",
        linkedAppealId: "",
        disbursementRequestId: "",
      });
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("openFailed");
      const hints = message
        .split("|")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

      if (hints.length > 1 || hints.some((hint) => hint.includes(t("ruleColumn")))) {
        setRuleHints(hints);
        setMsg(t("ruleHintsMsg"));
      } else {
        setMsg(`⚠ ${message}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
        <button
          className={styles.addBtn}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? t("cancelCreate") : t("newDispute")}
        </button>
      </div>

      {msg && (
        <div
          className={`${styles.msg} ${msg.startsWith("✓") ? styles.success : styles.error}`}
        >
          {msg}
        </div>
      )}

      {ruleHints.length > 0 && (
        <div className={styles.ruleHintsBox}>
          <div className={styles.ruleHintsTitle}>{t("ruleHintsTitle")}</div>
          <ul className={styles.ruleHintsList}>
            {ruleHints.map((hint, index) => (
              <li key={`${hint}-${index}`}>{hint}</li>
            ))}
          </ul>
        </div>
      )}

      {showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>{t("formTitle")}</h3>
          {linkedContext && (
            <div className={styles.linkedContext}>
              <div>
                <strong>
                  {linkedContext.type === "appeal"
                    ? t("linkedContextTitle")
                    : linkedContext.type === "disbursement"
                      ? t("linkedDisbursementContextTitle")
                      : t("linkedMemberContextTitle")}
                </strong>
                <p>
                  {linkedContext.type === "appeal"
                    ? t("linkedContextDesc")
                    : linkedContext.type === "disbursement"
                      ? t("linkedDisbursementContextDesc")
                      : t("linkedMemberContextDesc")}
                </p>
              </div>
              <div className={styles.linkedContextMeta}>
                <span>
                  {linkedContext.type === "appeal"
                    ? t("linkedAppealId", {
                        id: linkedContext.linkedAppealId.slice(0, 8),
                      })
                    : linkedContext.type === "disbursement"
                      ? t("linkedDisbursementId", {
                          id:
                            linkedContext.disbursementRequestId?.slice(0, 8) ??
                            "",
                        })
                      : t("linkedMemberId", {
                          member:
                            linkedContext.respondentName ||
                            linkedContext.respondentId?.slice(0, 8) ||
                            t("memberFallback"),
                        })}
                </span>
                {linkedContext.type === "appeal" && linkedContext.decisionId && (
                  <Link
                    href={`/decisions#decision-${linkedContext.decisionId}`}
                    className={styles.linkedContextLink}
                  >
                    {t("openDecision")}
                  </Link>
                )}
              </div>
            </div>
          )}
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="dispute-entity">
                  {t("entityLabel")}
                </label>
                <select
                  id="dispute-entity"
                  className={styles.input}
                  value={form.entityId}
                  onChange={(e) => void handleEntityChange(e.target.value)}
                  required
                >
                  <option value="">— {t("entityLabel")} —</option>
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="dispute-type">
                  {t("disputeTypeLabel")}
                </label>
                <select
                  id="dispute-type"
                  className={styles.input}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {DISPUTE_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="dispute-title">
                {t("titleLabel")}
              </label>
              <input
                id="dispute-title"
                className={styles.input}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("titlePlaceholder")}
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="dispute-description">
                {t("descriptionLabel")}
              </label>
              <textarea
                id="dispute-description"
                className={styles.textarea}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                minLength={20}
                placeholder={t("descriptionPlaceholder")}
                required
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="dispute-respondent">
                  {t("respondentLabel")}
                </label>
                <select
                  id="dispute-respondent"
                  className={styles.input}
                  value={form.respondentId}
                  onChange={(e) =>
                    setForm({ ...form, respondentId: e.target.value })
                  }
                  disabled={!form.entityId || respondentsLoading}
                >
                  <option value="">
                    {respondentsLoading
                      ? t("respondentLoading")
                      : respondents.length === 0 && form.entityId
                        ? t("respondentNone")
                        : t("respondentOption")}
                  </option>
                  {respondents.map((respondent) => (
                    <option key={respondent.id} value={respondent.id}>
                      {respondent.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="dispute-deadline">
                  {t("deadlineLabel")}
                </label>
                <input
                  id="dispute-deadline"
                  className={styles.input}
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm({ ...form, deadline: e.target.value })
                  }
                  dir="ltr"
                />
              </div>
            </div>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={
                creating || !form.entityId || !form.title || !form.description
              }
            >
              {creating ? t("sending") : t("openBtn")}
            </button>
          </form>
        </div>
      )}

      <RuleSummaryPanel
        title={t("howItWorksTitle") as string}
        summary={t("howItWorksDesc") as string}
        icon="⚖"
      />

      {loading ? (
        <div className={styles.centered}>
          <div className={styles.spinner} />
        </div>
      ) : disputes.length === 0 ? (
        <div className={styles.empty}>{t("empty")}</div>
      ) : (
        <div className={styles.list}>
          {disputes.map((d) => {
            const s = STATUS_MAP[d.status] ?? {
              label: d.status,
              color: "var(--text-secondary)",
              bg: "rgba(100,116,139,0.15)",
            };
            return (
              <Link
                key={d.id}
                href={`/disputes/${d.id}`}
                className={styles.row}
              >
                <div className={styles.rowBody}>
                  <div className={styles.rowTitle}>{d.title}</div>
                  <div className={styles.rowMeta}>
                    <span>{DISPUTE_TYPE_MAP[d.type] ?? d.type}</span>
                    <span>·</span>
                    <span>
                      {new Date(d.createdAt).toLocaleDateString("ar-SA")}
                    </span>
                    {d.initiator && (
                      <>
                        <span>·</span>
                        <span>{d.initiator.name}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className={`${styles.rowStatus} ${s.className || ""}`}>
                  {s.label}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
