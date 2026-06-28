"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./auditor.module.css";
import { getEntities, Entity } from "../../../lib/api/entities";
import VisibilityNotice from "../../../components/shared/VisibilityNotice";
import Breadcrumbs from "../../../components/shared/Breadcrumbs";
import {
  AUDITOR_ROLES,
  filterEntitiesByRoles,
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
  const nav = useTranslations("nav");

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
        const allowedEntities = filterEntitiesByRoles(data, AUDITOR_ROLES);
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
    return matchText(
      `${i.id} ${i.action} ${i.targetType} ${i.targetId} ${i.title ?? ""} ${i.context ?? ""} ${i.effect ?? ""} ${i.actor?.name ?? ""}`,
    );
  });

  const groupedAuditLogs = filteredAuditLogs.reduce<Array<{ day: string; logs: AuditorAuditLog[] }>>(
    (groups, log) => {
      const day = new Date(log.createdAt).toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const current = groups.find((group) => group.day === day);
      if (current) current.logs.push(log);
      else groups.push({ day, logs: [log] });
      return groups;
    },
    [],
  );

  function severityLabel(severity?: string) {
    if (severity === "HIGH") return t("severityHigh");
    if (severity === "MEDIUM") return t("severityMedium");
    return t("severityLow");
  }

  function severityClass(severity?: string) {
    if (severity === "HIGH") return styles.severityHigh;
    if (severity === "MEDIUM") return styles.severityMedium;
    return styles.severityLow;
  }

  function linkedRecordHref(type: string, id: string) {
    if (type === "decisions") return `/decisions?decisionId=${id}`;
    if (type === "wallets") return `/wallets/${id}`;
    if (type === "governance_paths") return `/paths/${id}`;
    if (type === "disbursement_requests") return `/disbursement-requests?requestId=${id}`;
    if (type === "payment_dues" || type === "payment_records") return `/finance?tab=reviews`;
    if (type === "memberships") return selectedEntityId ? `/entities/${selectedEntityId}?tab=members` : "/entities";
    if (type === "subscriptions") return `/subscriptions`;
    if (type === "disputes") return `/disputes/${id}`;
    return null;
  }

  function formatAuditValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (Array.isArray(value)) return value.length === 0 ? "[]" : value.join(", ");
    return JSON.stringify(value);
  }

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
      downloadCsv(
        `auditor-audit-logs-${stamp}.csv`,
        filteredAuditLogs.map((i) => ({
          id: i.id,
          action: i.action,
          actor: i.actor?.name ?? i.person?.name ?? "",
          title: i.title ?? "",
          context: i.context ?? "",
          effect: i.effect ?? "",
          severity: i.severity ?? "",
          targetType: i.targetType,
          targetId: i.targetId,
          createdAt: i.createdAt,
        })),
      );
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
            {filteredAuditLogs.length === 0 ? (
              <div className={styles.emptyState}>{t("auditLogEmpty")}</div>
            ) : (
              <div className={styles.timeline}>
                {groupedAuditLogs.map((group) => (
                  <section key={group.day} className={styles.timelineDayGroup}>
                    <div className={styles.timelineDayHeader}>
                      <span>{group.day}</span>
                      <strong>{t("auditLogDayCount", { count: group.logs.length })}</strong>
                    </div>
                    {group.logs.map((log) => (
                      <article key={log.id} className={styles.timelineItem}>
                        <div className={styles.timelineMarker} />
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineHeader}>
                            <div>
                              <div className={styles.timelineTitle}>
                                {log.title ?? `${log.action} ${log.targetType}`}
                              </div>
                              <div className={styles.timelineMeta}>
                                {log.actor?.name ?? log.person?.name ?? t("systemActor")} ·{" "}
                                {new Date(log.createdAt).toLocaleString("ar-SA")}
                              </div>
                            </div>
                            <div className={styles.timelineBadges}>
                              <span className={`${styles.severityBadge} ${severityClass(log.severity)}`}>
                                {severityLabel(log.severity)}
                              </span>
                              <span className={styles.badge}>{log.action}</span>
                            </div>
                          </div>
                          {log.context && (
                            <div className={styles.timelineContext}>
                              <span>{t("timelineContext")}</span>
                              <strong>{log.context}</strong>
                            </div>
                          )}
                          {log.effect && (
                            <div className={styles.timelineEffect}>
                              <span>{t("timelineEffect")}</span>
                              <strong>{log.effect}</strong>
                            </div>
                          )}
                          {log.linkedRecords && log.linkedRecords.length > 0 && (
                            <div className={styles.linkedRecords}>
                              <span className={styles.linkedLabel}>
                                {t("linkedRecords")}
                              </span>
                              {log.linkedRecords.map((record) => {
                                const href = linkedRecordHref(record.type, record.id);
                                const label = `${record.label} ${record.shortId}`;
                                return href ? (
                                  <a key={`${record.type}-${record.id}`} href={href} className={styles.linkedPill}>
                                    {label}
                                  </a>
                                ) : (
                                  <span key={`${record.type}-${record.id}`} className={styles.linkedPill}>
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {log.changes && log.changes.length > 0 && (
                            <div className={styles.changeGrid}>
                              {log.changes.slice(0, 6).map((change) => (
                                <div key={change.field} className={styles.changeItem}>
                                  <span className={styles.changeField}>
                                    {change.field}
                                  </span>
                                  <div className={styles.changeValues}>
                                    <span>{formatAuditValue(change.before)}</span>
                                    <span className={styles.changeArrow}>→</span>
                                    <strong>{formatAuditValue(change.after)}</strong>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs
        items={[
          { label: nav("dashboard"), href: "/dashboard" },
          { label: nav("auditor") },
        ]}
      />
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
