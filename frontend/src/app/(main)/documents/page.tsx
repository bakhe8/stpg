'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getEntities, Entity } from '../../../lib/api/entities';
import {
  deleteDocument,
  Document,
  getEntityDocuments,
  uploadDocument,
} from '../../../lib/api/documents';
import {
  getEntityWallets,
  getWalletPaths,
  GovernancePath,
  Wallet,
} from '../../../lib/api/wallets';
import styles from './documents.module.css';
import ConfirmActionDialog from '../../../components/shared/ConfirmActionDialog';

const FILE_TYPE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼',
  'image/png': '🖼',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const t = useTranslations('documents');

  const LEVEL_LABELS: Record<string, string> = {
    PUBLIC_TO_MEMBERS: t('levelPublic'),
    AGGREGATED_ONLY: t('levelAggregated'),
    VISIBLE_TO_COMMITTEE: t('levelCommittee'),
    VISIBLE_TO_PARTICIPANTS: t('levelParticipants'),
    VISIBLE_TO_AUDITOR: t('levelAuditor'),
    HIDDEN_SENSITIVE: t('levelHidden'),
  };

  function buildContextSummary(document: Document) {
    const parts: string[] = [];
    if (document.wallet?.name) parts.push(`${t('ctxWallet')} ${document.wallet.name}`);
    if (document.governancePath?.name) parts.push(`${t('ctxPath')} ${document.governancePath.name}`);
    if (document.decision?.title) parts.push(`${t('ctxDecision')} ${document.decision.title}`);
    else if (document.decisionId) parts.push(`${t('ctxDecision')} ${document.decisionId.slice(0, 8)}`);
    if (document.disbursementRequest) parts.push(`${t('ctxDisbursement')} ${document.disbursementRequest.beneficiaryName}`);
    if (document.appeal) parts.push(`${t('ctxAppeal')} ${document.appeal.status}`);
    if (document.dispute) parts.push(`${t('ctxDispute')} ${document.dispute.title}`);
    return parts.join(' · ');
  }

  const [entities, setEntities] = useState<Entity[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [paths, setPaths] = useState<GovernancePath[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    fileUrl: '',
    fileType: 'application/pdf',
    fileSize: '',
    privacyLevel: 'PUBLIC_TO_MEMBERS',
    walletId: '',
    governancePathId: '',
    decisionId: '',
    disbursementRequestId: '',
    appealId: '',
    disputeId: '',
  });

  useEffect(() => { getEntities().then(setEntities).catch(() => {}); }, []);

  useEffect(() => {
    if (!selectedId) {
      setWallets([]);
      setPaths([]);
      setForm((prev) => ({ ...prev, walletId: '', governancePathId: '', decisionId: '', disbursementRequestId: '', appealId: '', disputeId: '' }));
      return;
    }
    getEntityWallets(selectedId).then(setWallets).catch(() => setWallets([]));
  }, [selectedId]);

  useEffect(() => {
    if (!form.walletId) { setPaths([]); setForm((prev) => ({ ...prev, governancePathId: '' })); return; }
    getWalletPaths(form.walletId).then(setPaths).catch(() => setPaths([]));
  }, [form.walletId]);

  async function loadDocs(entityId: string) {
    setLoading(true);
    try { setDocs(await getEntityDocuments(entityId)); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { if (selectedId) void loadDocs(selectedId); }, [selectedId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    setMsg(null);
    try {
      await uploadDocument({
        name: form.name,
        fileUrl: form.fileUrl,
        fileType: form.fileType,
        fileSize: parseInt(form.fileSize, 10) || 0,
        entityId: selectedId || undefined,
        walletId: form.walletId || undefined,
        governancePathId: form.governancePathId || undefined,
        decisionId: form.decisionId || undefined,
        disbursementRequestId: form.disbursementRequestId || undefined,
        appealId: form.appealId || undefined,
        disputeId: form.disputeId || undefined,
        privacyLevel: form.privacyLevel,
      });
      setMsg(t('uploadSuccess'));
      setShowForm(false);
      setForm({ name: '', fileUrl: '', fileType: 'application/pdf', fileSize: '', privacyLevel: 'PUBLIC_TO_MEMBERS', walletId: '', governancePathId: '', decisionId: '', disbursementRequestId: '', appealId: '', disputeId: '' });
      if (selectedId) void loadDocs(selectedId);
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : t('uploadFailed')}`);
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(id: string) {
    setDeleteTarget(id);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget);
      setDocs((prev) => prev.filter((d) => d.id !== deleteTarget));
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : t('deleteFailed')}`);
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        <div className={styles.controls}>
          <select className={styles.entitySelect} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">{t('chooseEntity')}</option>
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>{entity.name}</option>
            ))}
          </select>
          <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>
            {showForm ? t('cancelUpload') : t('uploadBtn')}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`${styles.msg} ${msg.startsWith('✓') ? styles.success : styles.error}`}>{msg}</div>
      )}

      {showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>{t('formTitle')}</h3>
          <form onSubmit={handleUpload} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>{t('docNameLabel')}</label>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('docNamePlaceholder')}
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>{t('fileUrlLabel')}</label>
              <input
                className={styles.input}
                value={form.fileUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, fileUrl: e.target.value }))}
                placeholder="https://..."
                dir="ltr"
                required
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('fileTypeLabel')}</label>
                <select
                  className={styles.input}
                  value={form.fileType}
                  onChange={(e) => setForm((prev) => ({ ...prev, fileType: e.target.value }))}
                >
                  <option value="application/pdf">PDF</option>
                  <option value="image/jpeg">{t('imageJpeg')}</option>
                  <option value="image/png">{t('imagePng')}</option>
                  <option value="application/msword">Word</option>
                  <option value="application/vnd.ms-excel">Excel</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('fileSizeLabel')}</label>
                <input
                  className={styles.input}
                  type="number"
                  value={form.fileSize}
                  onChange={(e) => setForm((prev) => ({ ...prev, fileSize: e.target.value }))}
                  placeholder="102400"
                  dir="ltr"
                />
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>{t('privacyLabel')}</label>
              <select
                className={styles.input}
                value={form.privacyLevel}
                onChange={(e) => setForm((prev) => ({ ...prev, privacyLevel: e.target.value }))}
              >
                {Object.entries(LEVEL_LABELS).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('walletLabel')}</label>
                <select
                  className={styles.input}
                  value={form.walletId}
                  onChange={(e) => setForm((prev) => ({ ...prev, walletId: e.target.value }))}
                  disabled={!selectedId}
                >
                  <option value="">{t('noWallet')}</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('pathLabel')}</label>
                <select
                  className={styles.input}
                  value={form.governancePathId}
                  onChange={(e) => setForm((prev) => ({ ...prev, governancePathId: e.target.value }))}
                  disabled={!form.walletId}
                >
                  <option value="">{t('noPath')}</option>
                  {paths.map((path) => (
                    <option key={path.id} value={path.id}>{path.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('decisionIdLabel')}</label>
                <input className={styles.input} value={form.decisionId} onChange={(e) => setForm((prev) => ({ ...prev, decisionId: e.target.value }))} placeholder={t('uuidOptional')} dir="ltr" />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('disbursementIdLabel')}</label>
                <input className={styles.input} value={form.disbursementRequestId} onChange={(e) => setForm((prev) => ({ ...prev, disbursementRequestId: e.target.value }))} placeholder={t('uuidOptional')} dir="ltr" />
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('appealIdLabel')}</label>
                <input className={styles.input} value={form.appealId} onChange={(e) => setForm((prev) => ({ ...prev, appealId: e.target.value }))} placeholder={t('uuidOptional')} dir="ltr" />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('disputeIdLabel')}</label>
                <input className={styles.input} value={form.disputeId} onChange={(e) => setForm((prev) => ({ ...prev, disputeId: e.target.value }))} placeholder={t('uuidOptional')} dir="ltr" />
              </div>
            </div>
            <button type="submit" className={styles.submitBtn} disabled={uploading || !form.name || !form.fileUrl}>
              {uploading ? t('uploading') : t('upload')}
            </button>
          </form>
        </div>
      )}

      {!selectedId && <div className={styles.prompt}>{t('prompt')}</div>}

      {selectedId && loading ? (
        <div className={styles.centered}><div className={styles.spinner} /></div>
      ) : selectedId && docs.length === 0 ? (
        <div className={styles.empty}>{t('empty')}</div>
      ) : selectedId ? (
        <div className={styles.grid}>
          {docs.map((document) => {
            const contextSummary = buildContextSummary(document);
            return (
              <div key={document.id} className={styles.docCard}>
                <div className={styles.docIcon}>{FILE_TYPE_ICONS[document.fileType] ?? '📎'}</div>
                <div className={styles.docInfo}>
                  <div className={styles.docName}>{document.name}</div>
                  <div className={styles.docMeta}>
                    {formatSize(document.fileSize)} · {LEVEL_LABELS[document.privacyLevel] ?? document.privacyLevel}
                  </div>
                  {contextSummary && <div className={styles.docMeta}>{contextSummary}</div>}
                  {document.uploadedBy && <div className={styles.docUploader}>{document.uploadedBy.name}</div>}
                </div>
                <div className={styles.docActions}>
                  <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.viewBtn}>
                    {t('viewBtn')}
                  </a>
                  <button className={styles.deleteBtn} onClick={() => void handleDelete(document.id)}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {deleteTarget && (
        <ConfirmActionDialog
          title={t('deleteConfirmTitle')}
          description={t('deleteConfirm')}
          confirmLabel={t('deleteBtn')}
          danger
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
