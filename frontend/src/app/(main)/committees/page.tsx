"use client";

import React, { useEffect, useState } from "react";
import { getEntities, getEntityMembers, Entity, EntityMember } from "../../../lib/api/entities";
import { useTranslations } from "next-intl";
import {
  getCommittees,
  getCommittee,
  createCommittee,
  addCommitteeMember,
  removeCommitteeMember,
  Committee,
} from "../../../lib/api/committees";
import { getEntityWallets, getWalletPaths, Wallet, GovernancePath } from "../../../lib/api/wallets";
import { assignPathToCommittee, unassignPathFromCommittee } from "../../../lib/api/committees";
import {
  ADMIN_ROLES,
  COMMITTEE_ROLES,
  filterEntitiesByRoles,
  hasRole,
} from "../../../lib/access";
import styles from "./committees.module.css";

export default function CommitteesPage() {
  const t = useTranslations("committees");
  const tCommon = useTranslations("common");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [members, setMembers] = useState<EntityMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, Committee>>({});
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", description: "" });
  const [addMember, setAddMember] = useState<Record<string, string>>({});
  const [addingMember, setAddingMember] = useState<string | null>(null);

  // For path assignment
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletId, setWalletId] = useState("");
  const [paths, setPaths] = useState<GovernancePath[]>([]);
  const [assignPath, setAssignPath] = useState<Record<string, string>>({});
  const [assigningPath, setAssigningPath] = useState<string | null>(null);
  const selectedEntity = entities.find((entity) => entity.id === entityId);
  const canManage = selectedEntity
    ? hasRole(selectedEntity, ADMIN_ROLES)
    : false;

  useEffect(() => {
    getEntities()
      .then((items) =>
        setEntities(filterEntitiesByRoles(items, COMMITTEE_ROLES)),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!entityId) { setCommittees([]); setMembers([]); setWallets([]); setWalletId(""); setPaths([]); return; }
    setLoading(true);
    Promise.all([
      getCommittees(entityId),
      canManage ? getEntityMembers(entityId) : Promise.resolve([]),
      getEntityWallets(entityId),
    ])
      .then(([c, m, w]) => { setCommittees(c); setMembers(m); setWallets(w); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [canManage, entityId]);

  useEffect(() => {
    if (!walletId) { setPaths([]); return; }
    getWalletPaths(walletId).then(setPaths).catch(() => {});
  }, [walletId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!entityId) return;
    setCreating(true); setMsg(null);
    try {
      await createCommittee({ entityId, name: form.name, description: form.description || undefined });
      setMsg(t('createSuccess'));
      setShowForm(false);
      setForm({ name: "", description: "" });
      const updated = await getCommittees(entityId);
      setCommittees(updated);
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : tCommon('failed')}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!detail[id]) {
      try {
        const d = await getCommittee(id);
        setDetail((prev) => ({ ...prev, [id]: d }));
      } catch { /* ignore */ }
    }
  }

  async function handleAddMember(committeeId: string) {
    const membershipId = addMember[committeeId];
    if (!membershipId) return;
    setAddingMember(committeeId);
    try {
      await addCommitteeMember(committeeId, membershipId);
      const d = await getCommittee(committeeId);
      setDetail((prev) => ({ ...prev, [committeeId]: d }));
      setAddMember((prev) => ({ ...prev, [committeeId]: "" }));
      const updated = await getCommittees(entityId);
      setCommittees(updated);
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : t('addMemberFailed')}`);
    } finally {
      setAddingMember(null);
    }
  }

  async function handleRemoveMember(committeeId: string, membershipId: string) {
    try {
      await removeCommitteeMember(committeeId, membershipId);
      const d = await getCommittee(committeeId);
      setDetail((prev) => ({ ...prev, [committeeId]: d }));
      const updated = await getCommittees(entityId);
      setCommittees(updated);
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : t('removeFailed')}`);
    }
  }

  async function handleAssignPath(committeeId: string) {
    const pathId = assignPath[committeeId];
    if (!pathId) return;
    setAssigningPath(committeeId);
    try {
      await assignPathToCommittee(committeeId, pathId);
      const d = await getCommittee(committeeId);
      setDetail((prev) => ({ ...prev, [committeeId]: d }));
      setAssignPath((prev) => ({ ...prev, [committeeId]: "" }));
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : t('linkFailed')}`);
    } finally {
      setAssigningPath(null);
    }
  }

  async function handleUnassignPath(committeeId: string, pathId: string) {
    try {
      await unassignPathFromCommittee(committeeId, pathId);
      const d = await getCommittee(committeeId);
      setDetail((prev) => ({ ...prev, [committeeId]: d }));
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : t('unlinkFailed')}`);
    }
  }

  const currentDetail = (id: string) => detail[id] ?? committees.find((c) => c.id === id);
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        <div className={styles.controls}>
          <select
            className={styles.select}
            title={tCommon('chooseEntity')}
            value={entityId}
            onChange={(e) => { setEntityId(e.target.value); setExpandedId(null); setMsg(null); }}
          >
            <option value="">{tCommon('chooseEntity')}</option>
            {entities.map((en) => (
              <option key={en.id} value={en.id}>{en.name}</option>
            ))}
          </select>
          {entityId && canManage && (
            <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>
              {showForm ? t('cancelCreate') : t('newCommittee')}
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
              <label className={styles.label}>{t('nameLabel')}</label>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
                placeholder={t('namePlaceholder')}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>{t('descriptionLabel')}</label>
              <input
                className={styles.input}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
              />
            </div>
            <button type="submit" className={styles.submitBtn} disabled={creating}>
              {creating ? t('creating') : t('createBtn')}
            </button>
          </form>
        </div>
      )}

      {entityId && loading && (
        <div className={styles.centered}><div className={styles.spinner} /></div>
      )}

      {entityId && !loading && (
        <div className={styles.list}>
          {committees.length === 0 ? (
            <div className={styles.empty}>{t('empty')}</div>
          ) : (
            committees.map((c) => {
              const expanded = expandedId === c.id;
              const d = currentDetail(c.id);
              return (
                <div key={c.id} className={styles.committeeCard}>
                  <div className={styles.committeeHeader} onClick={() => handleExpand(c.id)}>
                    <div className={styles.committeeIcon}>{c.name.charAt(0)}</div>
                    <div className={styles.committeeInfo}>
                      <div className={styles.committeeName}>{c.name}</div>
                      <div className={styles.committeeMeta}>
                        {c.description ?? "—"}
                        {c._count && ` · ${t('memberCount', { count: c._count.members })} · ${t('pathCount', { count: c._count.paths })}`}
                      </div>
                    </div>
                    <span className={styles.expandIcon}>{expanded ? "▲" : "▼"}</span>
                  </div>

                  {expanded && (
                    <div className={styles.committeeBody}>
                      {/* Members */}
                      <div className={styles.section}>
                        <div className={styles.sectionTitle}>{t('membersSection')}</div>
                        {(d?.members ?? []).map((m) => (
                          <div key={m.membershipId} className={styles.memberRow}>
                            <span className={styles.memberName}>{m.membership.person.name}</span>
                            {canManage ? (
                              <button
                                className={styles.removeBtn}
                                onClick={() => handleRemoveMember(c.id, m.membershipId)}
                              >
                                {t('removeBtn')}
                              </button>
                            ) : null}
                          </div>
                        ))}
                        {canManage ? <div className={styles.addMemberRow}>
                          <select
                            className={styles.select}
                            title={t('addMemberOption')}
                            value={addMember[c.id] ?? ""}
                            onChange={(e) => setAddMember((prev) => ({ ...prev, [c.id]: e.target.value }))}
                          >
                            <option value="">{t('addMemberOption')}</option>
                            {members
                              .filter((m) => !(d?.members ?? []).some((cm) => cm.membershipId === m.id))
                              .map((m) => (
                                <option key={m.id} value={m.id}>{m.person.name}</option>
                              ))}
                          </select>
                          <button
                            className={styles.smallBtn}
                            onClick={() => handleAddMember(c.id)}
                            disabled={!addMember[c.id] || addingMember === c.id}
                          >
                            {addingMember === c.id ? t('adding') : t('addBtn')}
                          </button>
                        </div> : null}
                      </div>

                      {/* Paths */}
                      <div className={styles.section}>
                        <div className={styles.sectionTitle}>{t('pathsSection')}</div>
                        {(d?.paths ?? []).map((p) => (
                          <div key={p.id} className={styles.pathRow}>
                            <span className={styles.pathName}>{p.name}</span>
                            {canManage ? (
                              <button
                                className={styles.unassignBtn}
                                onClick={() => handleUnassignPath(c.id, p.id)}
                              >
                                {t('unlinkBtn')}
                              </button>
                            ) : null}
                          </div>
                        ))}
                        {canManage ? <div className={styles.addMemberRow}>
                          <select
                            className={styles.select}
                            title={tCommon('chooseWallet')}
                            value={walletId}
                            onChange={(e) => setWalletId(e.target.value)}
                          >
                            <option value="">{tCommon('chooseWallet')}</option>
                            {wallets.map((w) => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                          {walletId && (
                            <select
                              className={styles.select}
                              title={t('assignPathOption')}
                              value={assignPath[c.id] ?? ""}
                              onChange={(e) => setAssignPath((prev) => ({ ...prev, [c.id]: e.target.value }))}
                            >
                              <option value="">{t('assignPathOption')}</option>
                              {paths
                                .filter((p) => !(d?.paths ?? []).some((cp) => cp.id === p.id))
                                .map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                          )}
                          <button
                            className={styles.smallBtn}
                            onClick={() => handleAssignPath(c.id)}
                            disabled={!assignPath[c.id] || assigningPath === c.id}
                          >
                            {assigningPath === c.id ? t('adding') : t('linkPath')}
                          </button>
                        </div> : null}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
