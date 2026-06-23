"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./auditor.module.css";
import { getEntities, Entity } from "../../../lib/api/entities";
import VisibilityNotice from "../../../components/shared/VisibilityNotice";
import {
  filterEntitiesByRoles,
  OVERSIGHT_ROLES,
} from "../../../lib/access";
import {
  getAuditorOperations,
  getAuditorDocuments,
  getAuditorDecisions,
  getAuditorExceptions,
  getAuditorConflicts,
  getAuditorAppeals,
  getAuditorReport,
  getAuditorAuditLogs,
  AuditorOperation,
  AuditorDocument,
  AuditorDecision,
  AuditorDispute,
  AuditorReport,
  AuditorAuditLog,
} from "../../../lib/api/auditor";
import { DECISION_TYPE_KEYS } from "../../../lib/enum-labels";

export default function AuditorPage() {
  const t = useTranslations("auditor");
  const tEnums = useTranslations("enums");

  const LEDGER_TYPE_LABELS: Record<string, string> = {
    SUBSCRIPTION_PAYMENT: t("opTypeSubscriptionPayment"),
    DONATION: t("opTypeDonation"),
    SERVICE_FEE: t("opTypeServiceFee"),
    PROJECT_CONTRIBUTION: t("opTypeProjectContribution"),
    DISBURSEMENT: t("opTypeDisbursement"),
    TRANSFER: t("opTypeTransfer"),
    ENTITY_SUPPORT: t("opTypeEntitySupport"),
    ADJUSTMENT: t("opTypeAdjustment"),
    CORRECTION: t("opTypeCorrection"),
    REVERSAL: t("opTypeReversal"),
  };

  const TABS = [
    { id: "operations", label: t("tabOperations") },
    { id: "documents", label: t("tabDocuments") },
    { id: "decisions", label: t("tabDecisions") },
    { id: "exceptions", label: t("tabExceptions") },
    { id: "conflicts", label: t("tabConflicts") },
    { id: "appeals", label: t("tabAppeals") },
    { id: "reports", label: t("tabReports") },
    { id: "auditLogs", label: t("tabAuditLogs") },
  ];

  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("operations");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [operations, setOperations] = useState<AuditorOperation[]>([]);
  const [documents, setDocuments] = useState<AuditorDocument[]>([]);
  const [decisions, setDecisions] = useState<AuditorDecision[]>([]);
  const [exceptions, setExceptions] = useState<AuditorDecision[]>([]);
  const [conflicts, setConflicts] = useState<AuditorDecision[]>([]);
  const [appeals, setAppeals] = useState<AuditorDispute[]>([]);
  const [report, setReport] = useState<AuditorReport | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditorAuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadTabData = useCallback(async (tab: string, entityId: string) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "operations") setOperations(await getAuditorOperations(entityId));
      else if (tab === "documents") setDocuments(await getAuditorDocuments(entityId));
      else if (tab === "decisions") setDecisions(await getAuditorDecisions(entityId));
      else if (tab === "exceptions") setExceptions(await getAuditorExceptions(entityId));
      else if (tab === "conflicts") setConflicts(await getAuditorConflicts(entityId));
      else if (tab === "appeals") setAppeals(await getAuditorAppeals(entityId));
      else if (tab === "reports") setReport(await getAuditorReport(entityId));
      else if (tab === "auditLogs") setAuditLogs(await getAuditorAuditLogs(entityId));
    } catch (err: unknown) {
      setError(err instanceof Error ? (err.message || t("loadFailed")) : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    async function loadEntities() {
      try {
        const data = await getEntities();
        const allowedEntities = filterEntitiesByRoles(data, OVERSIGHT_ROLES);
        setEntities(allowedEntities);
        if (allowedEntities.length > 0) {
          setSelectedEntityId(allowedEntities[0].id);
        }
      } catch (err) {
        console.error("Failed to load entities", err);
      }
    }
    loadEntities();
  }, []);

  useEffect(() => {
    if (!selectedEntityId) return;
    loadTabData(activeTab, selectedEntityId);
  }, [activeTab, loadTabData, selectedEntityId]);

  useEffect(() => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setFromDate("");
    setToDate("");
  }, [activeTab]);

  function inDateRange(value: string | undefined | null): boolean {
    if (!value) return true;
    const date = new Date(value);
    if (fromDate && date < new Date(fromDate)) return false;
    if (toDate) { const to = new Date(toDate); to.setHours(23, 59, 59, 999); if (date > to) return false; }
    return true;
  }

  function matchText(haystack: string) {
    if (!searchTerm.trim()) return true;
    return haystack.toLowerCase().includes(searchTerm.trim().toLowerCase());
  }

  function getCurrentStatusOptions(): string[] {
    const values =
      activeTab === "operations" ? operations.map((i) => i.status)
      : activeTab === "documents" ? documents.map((i) => i.fileType)
      : activeTab === "decisions" ? decisions.map((i) => i.status)
      : activeTab === "exceptions" ? exceptions.map((i) => i.status)
      : activeTab === "conflicts" ? conflicts.map((i) => i.status)
      : activeTab === "appeals" ? appeals.map((i) => i.status)
      : activeTab === "auditLogs" ? auditLogs.map((i) => i.action)
      : [];
    return [...new Set(values.filter(Boolean))];
  }

  const statusOptions = getCurrentStatusOptions();

  const filteredOperations = operations.filter((i) => {
    if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
    if (!inDateRange(i.createdAt)) return false;
    return matchText(`${i.id} ${i.type} ${i.notes ?? ""}`);
  });

  const filteredDocuments = documents.filter((i) => {
    if (statusFilter !== "ALL" && i.fileType !== statusFilter) return false;
    if (!inDateRange(i.createdAt)) return false;
    return matchText(`${i.id} ${i.name} ${i.fileType}`);
  });

  const filteredDecisions = decisions.filter((i) => {
    if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
    if (!inDateRange(i.createdAt)) return false;
    return matchText(`${i.id} ${i.title} ${i.type}`);
  });

  const filteredExceptions = exceptions.filter((i) => {
    if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
    if (!inDateRange(i.createdAt)) return false;
    return matchText(`${i.id} ${i.title ?? ""} ${i.type}`);
  });

  const filteredConflicts = conflicts.filter((i) => {
    if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
    if (!inDateRange(i.createdAt)) return false;
    return matchText(`${i.id} ${i.title ?? ""} ${i.type}`);
  });

  const filteredAppeals = appeals.filter((i) => {
    if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
    if (!inDateRange(i.createdAt)) return false;
    return matchText(`${i.id} ${i.title ?? ""} ${i.type}`);
  });

  const filteredAuditLogs = auditLogs.filter((i) => {
    if (statusFilter !== "ALL" && i.action !== statusFilter) return false;
    if (!inDateRange(i.createdAt)) return false;
    return matchText(`${i.id} ${i.action} ${i.targetType} ${i.targetId}`);
  });

  function escapeCsvCell(value: unknown): string {
    const cell = String(value ?? "");
    if (cell.includes(",") || cell.includes("\n") || cell.includes("\"")) {
      return `"${cell.replaceAll("\"", "\"\"")}"`;
    }
    return cell;
  }

  function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(","), ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(","))];
    const blob = new Blob([`﻿${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportCsv() {
    const stamp = new Date().toISOString().slice(0, 10);
    if (activeTab === "operations") {
      downloadCsv(`auditor-operations-${stamp}.csv`, filteredOperations.map((i) => ({ id: i.id, type: i.type, status: i.status, amount: i.amount, currency: i.currency, createdAt: i.createdAt })));
    } else if (activeTab === "documents") {
      downloadCsv(`auditor-documents-${stamp}.csv`, filteredDocuments.map((i) => ({ id: i.id, name: i.name, fileType: i.fileType, fileSize: i.fileSize, createdAt: i.createdAt })));
    } else if (activeTab === "decisions") {
      downloadCsv(`auditor-decisions-${stamp}.csv`, filteredDecisions.map((i) => ({ id: i.id, title: i.title, type: i.type, status: i.status, createdAt: i.createdAt })));
    } else if (activeTab === "exceptions") {
      downloadCsv(`auditor-exceptions-${stamp}.csv`, filteredExceptions.map((i) => ({ id: i.id, title: i.title, type: i.type, status: i.status, createdAt: i.createdAt })));
    } else if (activeTab === "conflicts") {
      downloadCsv(`auditor-conflicts-${stamp}.csv`, filteredConflicts.map((i) => ({ id: i.id, title: i.title, type: i.type, status: i.status, createdAt: i.createdAt })));
    } else if (activeTab === "appeals") {
      downloadCsv(`auditor-appeals-${stamp}.csv`, filteredAppeals.map((i) => ({ id: i.id, title: i.title, type: i.type, status: i.status, createdAt: i.createdAt })));
    } else if (activeTab === "auditLogs") {
      downloadCsv(`auditor-audit-logs-${stamp}.csv`, filteredAuditLogs.map((i) => ({ id: i.id, action: i.action, targetType: i.targetType, targetId: i.targetId, createdAt: i.createdAt })));
    }
  }

  function renderContent() {
    if (loading) return <div className={styles.centered}><div className={styles.spinner} /></div>;
    if (error) return <div className={styles.centered}><div className={styles.error}>{error}</div></div>;

    switch (activeTab) {
      case "operations":
        return (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>{t("sectionOperations")}</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>{t("colId")}</th><th>{t("colType")}</th><th>{t("colAmount")}</th><th>{t("colDate")}</th></tr></thead>
                <tbody>
                  {filteredOperations.length === 0 && <tr><td colSpan={4} className={styles.emptyState}>{t("noOperations")}</td></tr>}
                  {filteredOperations.map((op) => (
                    <tr key={op.id}>
                      <td>{op.id.substring(0, 8)}</td>
                      <td><span className={styles.badge}>{LEDGER_TYPE_LABELS[op.type] ?? op.type}</span></td>
                      <td>{Number(op.amount).toLocaleString()} {op.currency}</td>
                      <td>{new Date(op.createdAt).toLocaleDateString("ar-SA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "documents":
        return (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>{t("sectionDocuments")}</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>{t("colName")}</th><th>{t("colType")}</th><th>{t("colSize")}</th><th>{t("colDate")}</th></tr></thead>
                <tbody>
                  {filteredDocuments.length === 0 && <tr><td colSpan={4} className={styles.emptyState}>{t("noDocuments")}</td></tr>}
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.name}</td>
                      <td>{doc.fileType}</td>
                      <td>{(doc.fileSize / 1024).toFixed(2)} KB</td>
                      <td>{new Date(doc.createdAt).toLocaleDateString("ar-SA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "decisions":
        return (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>{t("sectionDecisions")}</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>{t("colDecision")}</th><th>{t("colType")}</th><th>{t("colDate")}</th></tr></thead>
                <tbody>
                  {filteredDecisions.length === 0 && <tr><td colSpan={3} className={styles.emptyState}>{t("noDecisions")}</td></tr>}
                  {filteredDecisions.map((dec) => (
                    <tr key={dec.id}>
                      <td>{dec.id.substring(0, 8)}</td>
                      <td>
                        {DECISION_TYPE_KEYS[dec.type]
                          ? tEnums(DECISION_TYPE_KEYS[dec.type] as Parameters<typeof tEnums>[0])
                          : dec.type}
                      </td>
                      <td>{new Date(dec.createdAt).toLocaleDateString("ar-SA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "exceptions":
        return (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>{t("sectionExceptions")}</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>{t("colExcluded")}</th><th>{t("colDate")}</th></tr></thead>
                <tbody>
                  {filteredExceptions.length === 0 && <tr><td colSpan={2} className={styles.emptyState}>{t("noExceptions")}</td></tr>}
                  {filteredExceptions.map((exc) => (
                    <tr key={exc.id}>
                      <td>{exc.id.substring(0, 8)}</td>
                      <td>{new Date(exc.createdAt).toLocaleDateString("ar-SA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "conflicts":
        return (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>{t("sectionConflicts")}</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>{t("colId")}</th><th>{t("colDate")}</th></tr></thead>
                <tbody>
                  {filteredConflicts.length === 0 && <tr><td colSpan={2} className={styles.emptyState}>{t("noConflicts")}</td></tr>}
                  {filteredConflicts.map((conf) => (
                    <tr key={conf.id}>
                      <td>{conf.id.substring(0, 8)}</td>
                      <td>{new Date(conf.createdAt).toLocaleDateString("ar-SA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "appeals":
        return (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>{t("sectionAppeals")}</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>{t("colAppeal")}</th><th>{t("colStatus")}</th><th>{t("colDate")}</th></tr></thead>
                <tbody>
                  {filteredAppeals.length === 0 && <tr><td colSpan={3} className={styles.emptyState}>{t("noAppeals")}</td></tr>}
                  {filteredAppeals.map((app) => (
                    <tr key={app.id}>
                      <td>{app.title || app.id.substring(0, 8)}</td>
                      <td><span className={`${styles.badge} ${styles.badgeWarning}`}>{app.status}</span></td>
                      <td>{new Date(app.createdAt).toLocaleDateString("ar-SA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "reports":
        return (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>{t("sectionReports")}</h2>
            {report ? (
              <div className={styles.kpiGrid}>
                {[
                  { label: t("reportTotalOps"), value: report.totalOperations },
                  { label: t("reportExceptions"), value: report.totalExceptions },
                  { label: t("reportConflicts"), value: report.totalConflicts },
                  { label: t("reportOpenAppeals"), value: report.openAppeals },
                  { label: t("reportMissingDocs"), value: `${report.missingDocumentsRate.toFixed(1)}%` },
                ].map((kpi) => (
                  <div key={kpi.label} className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>{kpi.label}</span>
                    <span className={styles.kpiValue}>{kpi.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>{t("noReportData")}</div>
            )}
          </div>
        );
      case "auditLogs":
        return (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>{t("sectionAuditLogs")}</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>{t("colEvent")}</th><th>{t("colTable")}</th><th>{t("colId")}</th><th>{t("colDate")}</th></tr></thead>
                <tbody>
                  {filteredAuditLogs.length === 0 && <tr><td colSpan={4} className={styles.emptyState}>{t("auditLogEmpty")}</td></tr>}
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td><span className={styles.badge}>{log.action}</span></td>
                      <td>{log.targetType}</td>
                      <td>{log.targetId.substring(0, 8)}</td>
                      <td>{new Date(log.createdAt).toLocaleString("ar-SA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
        <select
          className={styles.entitySelect}
          aria-label={t("chooseEntity")}
          title={t("chooseEntity")}
          value={selectedEntityId}
          onChange={(e) => setSelectedEntityId(e.target.value)}
        >
          {entities.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {!selectedEntityId ? (
        <div className={styles.prompt}>{t("prompt")}</div>
      ) : (
        <>
          <VisibilityNotice
            level="VisibleToAuditor"
            reason="هذه البيانات مرئية للمراجع المالي فقط — لا تظهر لبقية الأعضاء"
          />
          <div className={styles.tabs}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className={styles.filtersBar}>
            <input
              className={styles.filterInput}
              placeholder={t("searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className={styles.filterInput}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">{t("allStatuses")}</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <input className={styles.filterInput} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input className={styles.filterInput} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <button
              className={styles.secondaryBtn}
              onClick={() => { setSearchTerm(""); setStatusFilter("ALL"); setFromDate(""); setToDate(""); }}
            >
              {t("resetFilters")}
            </button>
            <button
              className={styles.exportBtn}
              onClick={handleExportCsv}
              disabled={activeTab === "reports"}
            >
              {t("exportCsv")}
            </button>
          </div>
          {renderContent()}
        </>
      )}
    </div>
  );
}
