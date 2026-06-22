"use client";

import React, { useEffect, useState } from "react";
import { getEntities, getEntityMembers, Entity, EntityMember } from "../../../lib/api/entities";
import {
  BENEFICIARY_ROLES,
  ADMIN_ROLES,
  filterEntitiesByRoles,
  hasRole,
} from "../../../lib/access";
import { useTranslations } from "next-intl";
import {
  getBeneficiaries,
  createBeneficiary,
  Beneficiary,
} from "../../../lib/api/beneficiaries";
import styles from "./beneficiaries.module.css";

export default function BeneficiariesPage() {
  const t = useTranslations("beneficiaries");
  const tCommon = useTranslations("common");

  const TYPE_LABELS: Record<string, string> = {
    MEMBER: t('labelMember'),
    DEPENDENT: t('labelDependent'),
    EXTERNAL: t('typeExternal'),
  };

  const TYPE_OPTIONS = [
    { value: "MEMBER", label: t('typeMember') },
    { value: "DEPENDENT", label: t('typeDependent') },
    { value: "EXTERNAL", label: t('typeExternal') },
  ];
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [members, setMembers] = useState<EntityMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    type: "MEMBER" as "MEMBER" | "DEPENDENT" | "EXTERNAL",
    membershipId: "",
    displayName: "",
    notes: "",
    annualCap: "",
  });

  useEffect(() => {
    getEntities()
      .then((items) =>
        setEntities(filterEntitiesByRoles(items, BENEFICIARY_ROLES)),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!entityId) { setBeneficiaries([]); setMembers([]); return; }
    setLoading(true);
    Promise.all([
      getBeneficiaries(entityId),
      getEntityMembers(entityId),
    ])
      .then(([b, m]) => { setBeneficiaries(b); setMembers(m); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entityId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!entityId) return;
    setCreating(true); setMsg(null);
    try {
      await createBeneficiary(entityId, {
        type: form.type,
        membershipId: form.type === "MEMBER" ? form.membershipId || undefined : undefined,
        displayName: form.type !== "MEMBER" ? form.displayName || undefined : undefined,
        notes: form.notes || undefined,
        annualCap: form.annualCap ? parseFloat(form.annualCap) : undefined,
      });
      setMsg(t('addSuccess'));
      setShowForm(false);
      setForm({ type: "MEMBER", membershipId: "", displayName: "", notes: "", annualCap: "" });
      setBeneficiaries(await getBeneficiaries(entityId));
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : tCommon('failed')}`);
    } finally {
      setCreating(false);
    }
  }

  const grouped = {
    MEMBER: beneficiaries.filter((b) => b.type === "MEMBER"),
    DEPENDENT: beneficiaries.filter((b) => b.type === "DEPENDENT"),
    EXTERNAL: beneficiaries.filter((b) => b.type === "EXTERNAL"),
  };

  function badgeClass(type: string) {
    if (type === "MEMBER") return styles.badgeMember;
    if (type === "DEPENDENT") return styles.badgeDependent;
    return styles.badgeExternal;
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        <div className={styles.controls}>
          <select
            className={styles.select}
            title={tCommon('chooseEntity')}
            value={entityId}
            onChange={(e) => { setEntityId(e.target.value); setMsg(null); }}
          >
            <option value="">{tCommon('chooseEntity')}</option>
            {entities.map((en) => (
              <option key={en.id} value={en.id}>{en.name}</option>
            ))}
          </select>
          {entityId && hasRole(entities.find((e) => e.id === entityId)!, ADMIN_ROLES) && (
            <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>
              {showForm ? t('cancelCreate') : t('newBeneficiary')}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`${styles.msg} ${msg.startsWith("✓") ? styles.success : styles.error}`}>
          {msg}
        </div>
      )}

      {!entityId && <div className={styles.prompt}>{t('chooseEntity')}</div>}

      {entityId && showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>{t('formTitle')}</h3>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>{t('typeLabel')}</label>
              <select
                className={styles.input}
                title={t('typeLabel')}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type, membershipId: "", displayName: "" })}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {form.type === "MEMBER" && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('memberLabel')}</label>
                <select
                  className={styles.input}
                  title={t('memberLabel')}
                  value={form.membershipId}
                  onChange={(e) => setForm({ ...form, membershipId: e.target.value })}
                  required
                >
                  <option value="">{t('chooseMember')}</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.person.name}</option>
                  ))}
                </select>
              </div>
            )}

            {form.type !== "MEMBER" && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('nameLabel')}</label>
                <input
                  className={styles.input}
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  required={form.type === "EXTERNAL"}
                  minLength={2}
                  placeholder={t('namePlaceholder')}
                />
              </div>
            )}

            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('annualCapLabel')}</label>
                <input
                  className={styles.input}
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.annualCap}
                  onChange={(e) => setForm({ ...form, annualCap: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('notesLabel')}</label>
                <input
                  className={styles.input}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={t('notesPlaceholder')}
                />
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={creating}>
              {creating ? t('adding') : t('addBtn')}
            </button>
          </form>
        </div>
      )}

      {entityId && loading && (
        <div className={styles.centered}><div className={styles.spinner} /></div>
      )}

      {entityId && !loading && beneficiaries.length === 0 && (
        <div className={styles.empty}>{t('empty')}</div>
      )}

      {entityId && !loading && beneficiaries.length > 0 && (
        <>
          {(["MEMBER", "DEPENDENT", "EXTERNAL"] as const).map((type) => {
            const group = grouped[type];
            if (group.length === 0) return null;
            return (
              <div key={type} className={styles.group}>
                <div className={styles.groupTitle}>{TYPE_LABELS[type]} ({group.length})</div>
                {group.map((b) => (
                  <div key={b.id} className={styles.card}>
                    <div className={styles.avatar}>{b.displayName.charAt(0)}</div>
                    <div className={styles.info}>
                      <div className={styles.name}>{b.displayName}</div>
                      {b.notes && <div className={styles.meta}>{b.notes}</div>}
                    </div>
                    {b.annualCap != null && (
                      <div className={styles.cap}>{t('capLabel')} {b.annualCap.toLocaleString("ar-SA")}</div>
                    )}
                    <span className={`${styles.badge} ${badgeClass(b.type)}`}>
                      {TYPE_LABELS[b.type]}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
