"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  EntityPolicy,
  PolicyImpact,
  getEntityPolicy,
  updateEntityPolicy,
  getPolicyImpact,
} from "../../lib/api/entities";
import styles from "./PolicyBuilder.module.css";

interface Props {
  entityId: string;
}

type DraftPolicy = Partial<EntityPolicy>;

const TRANSPARENCY_LABELS: Record<string, string> = {
  PUBLIC:                  "public",
  VISIBLE_TO_PARTICIPANTS: "visibleToParticipants",
  VISIBLE_TO_COMMITTEE:    "visibleToCommittee",
  VISIBLE_TO_AUDITOR:      "visibleToAuditor",
  HIDDEN_SENSITIVE:        "hiddenSensitive",
};

const VOTE_TYPE_LABELS: Record<string, string> = {
  SIMPLE_MAJORITY: "simpleMajority",
  TWO_THIRDS:      "twoThirds",
  UNANIMOUS:       "unanimous",
  WEIGHTED:        "weighted",
};

export default function PolicyBuilder({ entityId }: Props) {
  const t = useTranslations("policyBuilder");
  const [policy, setPolicy] = useState<EntityPolicy | null>(null);
  const [draft, setDraft] = useState<DraftPolicy>({});
  const [impact, setImpact] = useState<PolicyImpact | null>(null);
  const [impactField, setImpactField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getEntityPolicy(entityId)
      .then((p) => { setPolicy(p); setDraft({}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entityId]);

  function update<K extends keyof DraftPolicy>(key: K, value: DraftPolicy[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setMsg(null);
  }

  async function checkImpact(field: string, value: string) {
    setImpactField(field);
    setImpact(null);
    try {
      const result = await getPolicyImpact(entityId, field, value);
      setImpact(result);
    } catch {
      setImpact(null);
    }
  }

  async function save() {
    if (!Object.keys(draft).length) return;
    setSaving(true);
    setMsg(null);
    try {
      const updated = await updateEntityPolicy(entityId, draft);
      setPolicy(updated);
      setDraft({});
      setImpact(null);
      setImpactField(null);
      setMsg({ text: t("saveSuccess"), ok: true });
    } catch (e) {
      setMsg({ text: t("saveError", { error: e instanceof Error ? e.message : t("unknownError") }), ok: false });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.loading}>{t("loading")}</div>;
  if (!policy) return <div className={styles.empty}>{t("empty")}</div>;

  const current = { ...policy, ...draft };
  const hasDraft = Object.keys(draft).length > 0;

  return (
    <div className={styles.builder}>
      {msg && (
        <div className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`}>
          {msg.text}
        </div>
      )}

      {/* أ — العضوية */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>👥</span>
          <h3 className={styles.sectionTitle}>{t("membershipTitle")}</h3>
        </div>

        <Question
          q={t("openMembershipQ")}
          hint={t("openMembershipHint")}
          value={current.allowOpenMembership}
          onChange={(v) => { update("allowOpenMembership", v); void checkImpact("allowOpenMembership", String(v)); }}
          t={t}
        />
        <Question
          q={t("requiresApprovalQ")}
          hint={t("requiresApprovalHint")}
          value={current.requiresMemberApproval}
          onChange={(v) => { update("requiresMemberApproval", v); void checkImpact("requiresMemberApproval", String(v)); }}
          t={t}
        />
      </section>

      {/* ب — الحوكمة والقرارات */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>⚖</span>
          <h3 className={styles.sectionTitle}>{t("governanceTitle")}</h3>
        </div>

        <div className={styles.questionRow}>
          <div className={styles.questionLabel}>
            <span className={styles.questionText}>{t("defaultVoteType")}</span>
          </div>
          <select
            className={styles.select}
            value={current.defaultVoteType}
            onChange={(e) => { update("defaultVoteType", e.target.value); void checkImpact("defaultVoteType", e.target.value); }}
          >
            {Object.entries(VOTE_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{t(`voteTypeLabels.${label}`)}</option>
            ))}
          </select>
        </div>

        <div className={styles.questionRow}>
          <div className={styles.questionLabel}>
            <span className={styles.questionText}>{t("quorumPercent")}</span>
            <span className={styles.questionHint}>{t("quorumPercentHint")}</span>
          </div>
          <div className={styles.numberInput}>
            <input
              type="number"
              min={1}
              max={100}
              value={current.decisionQuorumPercent}
              className={styles.numField}
              onChange={(e) => { update("decisionQuorumPercent", parseInt(e.target.value) || 50); void checkImpact("decisionQuorumPercent", e.target.value); }}
            />
            <span className={styles.unit}>%</span>
          </div>
        </div>
      </section>

      {/* ج — الاعتراضات */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>🛡</span>
          <h3 className={styles.sectionTitle}>{t("appealsTitle")}</h3>
        </div>

        <Question
          q={t("allowAppealsQ")}
          hint={t("allowAppealsHint")}
          value={current.allowAppeals}
          onChange={(v) => { update("allowAppeals", v); void checkImpact("allowAppeals", String(v)); }}
          t={t}
        />
        {current.allowAppeals && (
          <div className={styles.questionRow}>
            <div className={styles.questionLabel}>
              <span className={styles.questionText}>{t("appealTimeoutDays")}</span>
            </div>
            <div className={styles.numberInput}>
              <input
                type="number"
                min={1}
                max={90}
                value={current.appealTimeoutDays}
                className={styles.numField}
                onChange={(e) => { update("appealTimeoutDays", parseInt(e.target.value) || 14); void checkImpact("appealTimeoutDays", e.target.value); }}
              />
              <span className={styles.unit}>{t("days")}</span>
            </div>
          </div>
        )}
      </section>

      {/* د — الشفافية */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>◎</span>
          <h3 className={styles.sectionTitle}>{t("transparencyTitle")}</h3>
        </div>

        <div className={styles.questionRow}>
          <div className={styles.questionLabel}>
            <span className={styles.questionText}>{t("defaultTransparency")}</span>
            <span className={styles.questionHint}>{t("defaultTransparencyHint")}</span>
          </div>
          <select
            className={styles.select}
            value={current.defaultTransparency}
            onChange={(e) => { update("defaultTransparency", e.target.value); void checkImpact("defaultTransparency", e.target.value); }}
          >
            {Object.entries(TRANSPARENCY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{t(`transparencyLabels.${label}`)}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Impact Preview */}
      {impact && impactField && (
        <div className={styles.impactBox}>
          <div className={styles.impactTitle}>{t("impactTitle")}</div>
          <ul className={styles.impactList}>
            {impact.affected.map((item, i) => (
              <li key={i} className={styles.impactItem}>{item}</li>
            ))}
          </ul>
          <div className={styles.impactAppliesAt}>{t("appliesAt", { date: impact.appliesAt })}</div>
        </div>
      )}

      {/* Save */}
      {hasDraft && (
        <div className={styles.saveRow}>
          <button
            className={styles.saveBtn}
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? t("saving") : t("saveChanges", { count: Object.keys(draft).length })}
          </button>
          <button
            className={styles.cancelBtn}
            onClick={() => { setDraft({}); setImpact(null); setImpactField(null); }}
            disabled={saving}
          >
            {t("cancel")}
          </button>
        </div>
      )}

      <div className={styles.versionNote}>
        {t("currentVersion", { version: policy.version })}
      </div>
    </div>
  );
}

function Question({
  q,
  hint,
  value,
  onChange,
  t,
}: {
  q: string;
  hint?: string;
  value?: boolean;
  onChange: (v: boolean) => void;
  t: any;
}) {
  return (
    <div className={styles.questionRow}>
      <div className={styles.questionLabel}>
        <span className={styles.questionText}>{q}</span>
        {hint && <span className={styles.questionHint}>{hint}</span>}
      </div>
      <div className={styles.toggle}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${value ? styles.toggleOn : styles.toggleOff}`}
          onClick={() => onChange(!value)}
        >
          {value ? t("enabled") : t("disabled")}
        </button>
      </div>
    </div>
  );
}
