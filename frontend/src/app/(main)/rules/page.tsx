"use client";

import React, { useEffect, useState } from "react";
import { getEntities, Entity } from "../../../lib/api/entities";
import { ADMIN_ROLES, filterEntitiesByRoles } from "../../../lib/access";
import { useTranslations } from "next-intl";
import {
  getEntityWallets,
  getWalletPaths,
  Wallet,
  GovernancePath,
} from "../../../lib/api/wallets";
import {
  getRules,
  createRule,
  evaluateSpendingRules,
  Rule,
  RuleTemplate,
  SpendingRulesResult,
  getRuleTemplates,
} from "../../../lib/api/rules";
import { getPathSpendingItems, SpendingItem } from "../../../lib/api/paths";
import PolicyBuilder from "../../../components/Governance/PolicyBuilder";
import RuleSummaryPanel from "../../../components/Governance/RuleSummaryPanel";
import AccessReasonPanel from "../../../components/shared/AccessReasonPanel";
import styles from "./rules.module.css";

type RuleTargetType = "ENTITY" | "WALLET" | "PATH";

interface TemplateCopyDraft {
  template: RuleTemplate;
  name: string;
  priority: number;
  ruleDataText: string;
}



function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJsonValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nestedValue]) => [key, normalizeJsonValue(nestedValue)]),
    );
  }

  return value;
}

function buildRuleSignature(ruleType: string, ruleData: Record<string, unknown>) {
  return `${ruleType}|${JSON.stringify(normalizeJsonValue(ruleData))}`;
}

type PageTab = "rules" | "policy";

export default function RulesPage() {
  const t = useTranslations("rules");
  const [pageTab, setPageTab] = useState<PageTab>("rules");

  const RULE_TYPES = [
    {
      value: "SPENDING_LIMIT",
      label: t('typeSpendingLimit'),
      example: '{\n  "maxAmount": 5000\n}',
    },
    {
      value: "REQUIRES_DOCUMENTS",
      label: t('typeRequiresDocs'),
      example: '{\n  "required": true\n}',
    },
    {
      value: "QUORUM",
      label: t('typeQuorum'),
      example:
        '{\n  "minQuorumPercent": 60,\n  "minApprovalPercent": 67,\n  "allowedVoteTypes": ["TWO_THIRDS"]\n}',
    },
    {
      value: "TRANSFER",
      label: t('typeTransfer'),
      example:
        '{\n  "allowTransfer": true,\n  "sameWalletOnly": true,\n  "maxAmount": 10000\n}',
    },
    {
      value: "ELIGIBILITY",
      label: t('typeEligibility'),
      example:
        '{\n  "minAgreedAmount": 100,\n  "allowedPathTypes": ["COMMITTEE"],\n  "requiresAppealsEnabled": true\n}',
    },
  ];

  function ruleTypeLabel(value: string) {
    return RULE_TYPES.find((ruleType) => ruleType.value === value)?.label ?? value;
  }

  const TARGET_TYPE_LABELS: Record<string, string> = {
    ENTITY: 'مستوى الصندوق',
    WALLET: 'مستوى المحفظة',
    PATH: 'مستوى المسار',
  };
  function targetTypeLabel(type: string) {
    return TARGET_TYPE_LABELS[type] ?? type;
  }

  function summarizeRuleData(rule: Rule) {
    const data = rule.ruleData ?? {};

    switch (rule.ruleType) {
      case "SPENDING_LIMIT":
        return data.maxAmount != null ? `الحد: ${String(data.maxAmount)}` : "حد صرف";
      case "REQUIRES_DOCUMENTS":
        return data.required ? t('summaryRequiresDocs') : t('summaryNoRequireDocs');
      case "QUORUM":
        return [
          data.minQuorumPercent != null
            ? `نصاب ${String(data.minQuorumPercent)}%`
            : null,
          data.minApprovalPercent != null
            ? `إقرار ${String(data.minApprovalPercent)}%`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");
      case "TRANSFER":
        return data.sameWalletOnly
          ? t('summarySameWallet')
          : t('summaryCustomTransfer');
      case "ELIGIBILITY":
        return data.minAgreedAmount != null
          ? `حد اشتراك أدنى ${String(data.minAgreedAmount)}`
          : t('summaryCustomEligibility');
      default:
        return JSON.stringify(data);
    }
  }

  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletId, setWalletId] = useState("");
  const [paths, setPaths] = useState<GovernancePath[]>([]);
  const [pathId, setPathId] = useState("");
  const [targetType, setTargetType] = useState<RuleTargetType>("PATH");
  const [rules, setRules] = useState<Rule[]>([]);
  const [spendingItems, setSpendingItems] = useState<SpendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [creatingTemplateCode, setCreatingTemplateCode] = useState("");
  const [copyDraft, setCopyDraft] = useState<TemplateCopyDraft | null>(null);
  const [copyDraftError, setCopyDraftError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    ruleType: "SPENDING_LIMIT",
    ruleDataText: RULE_TYPES[0].example,
  });
  const [formRuleDataError, setFormRuleDataError] = useState<string | null>(null);

  const [evalForm, setEvalForm] = useState({
    amount: "",
    spendingItemId: "",
  });
  const [evalResult, setEvalResult] = useState<SpendingRulesResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  function targetIdByType(type: RuleTargetType) {
    if (type === "ENTITY") return entityId;
    if (type === "WALLET") return walletId;
    return pathId;
  }

  function isValidTargetType(value: string): value is RuleTargetType {
    return value === "ENTITY" || value === "WALLET" || value === "PATH";
  }

  const selectedTargetId = targetIdByType(targetType);


  function hasDuplicateRule(ruleType: string, ruleData: Record<string, unknown>) {
    const incomingSignature = buildRuleSignature(ruleType, ruleData);
    return rules.some(
      (rule) =>
        buildRuleSignature(rule.ruleType, rule.ruleData) === incomingSignature,
    );
  }

  useEffect(() => {
    getEntities()
      .then((items) => setEntities(filterEntitiesByRoles(items, ADMIN_ROLES)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setTemplatesLoading(true);
    getRuleTemplates()
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, []);

  useEffect(() => {
    if (!entityId) {
      setWallets([]);
      setWalletId("");
      setPaths([]);
      setPathId("");
      setRules([]);
      return;
    }
    getEntityWallets(entityId).then(setWallets).catch(() => {});
  }, [entityId]);

  useEffect(() => {
    if (!walletId) {
      setPaths([]);
      setPathId("");
      setRules([]);
      return;
    }
    getWalletPaths(walletId).then(setPaths).catch(() => {});
  }, [walletId]);

  useEffect(() => {
    if (!selectedTargetId) {
      setRules([]);
      return;
    }
    setLoading(true);
    getRules(targetType, selectedTargetId)
      .then((loadedRules) => {
        setRules(loadedRules);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetType, selectedTargetId]);

  useEffect(() => {
    if (!pathId) {
      setSpendingItems([]);
      return;
    }
    getPathSpendingItems(pathId).then(setSpendingItems).catch(() => {});
  }, [pathId]);

  useEffect(() => {
    if (targetType === "PATH" && pathId) return;
    if (targetType === "WALLET" && walletId) return;
    if (targetType === "ENTITY" && entityId) return;

    if (pathId) {
      setTargetType("PATH");
      return;
    }
    if (walletId) {
      setTargetType("WALLET");
      return;
    }
    if (entityId) {
      setTargetType("ENTITY");
    }
  }, [entityId, walletId, pathId, targetType]);

  function handleRuleTypeChange(nextRuleType: string) {
    const template =
      RULE_TYPES.find((ruleType) => ruleType.value === nextRuleType)?.example ??
      "{\n}";
    setForm((prev) => ({
      ...prev,
      ruleType: nextRuleType,
      ruleDataText: template,
    }));
    setFormRuleDataError(null);
  }

  function validateRuleDataText(ruleDataText: string): string | null {
    try {
      const parsed = JSON.parse(ruleDataText) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return t('invalidJson');
      }
      return null;
    } catch {
      return t('invalidJsonSyntax');
    }
  }

  function formatRuleDataText(ruleDataText: string): string | null {
    try {
      const parsed = JSON.parse(ruleDataText) as unknown;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return null;
    }
  }

  function applyTemplate(template: RuleTemplate) {
    const prettyData = JSON.stringify(template.ruleData, null, 2);
    const recommendedType = template.recommendedTargetType;
    if (isValidTargetType(recommendedType) && targetIdByType(recommendedType)) {
      setTargetType(recommendedType);
    }
    setShowForm(true);
    setForm({
      name: template.name,
      ruleType: template.ruleType,
      ruleDataText: prettyData,
    });
    setMsg(`✓ تم تحميل القالب "${template.name}". اختر الهدف المناسب ثم أنشئ القاعدة.`);
  }

  function openTemplateCopy(template: RuleTemplate) {
    const recommendedType = template.recommendedTargetType;
    if (isValidTargetType(recommendedType) && targetIdByType(recommendedType)) {
      setTargetType(recommendedType);
    }

    setCopyDraft({
      template,
      name: `${template.name} (نسخة مخصصة)`,
      priority: template.priority,
      ruleDataText: JSON.stringify(template.ruleData, null, 2),
    });
    setCopyDraftError(null);
  }

  async function createFromTemplate(template: RuleTemplate) {
    if (!selectedTargetId) return;

    if (hasDuplicateRule(template.ruleType, template.ruleData)) {
      setMsg(`⚠ القاعدة "${template.name}" مضافة مسبقاً على هذا المستوى.`);
      return;
    }

    setCreatingTemplateCode(template.code);
    setMsg(null);
    try {
      await createRule({
        targetType,
        targetId: selectedTargetId,
        name: template.name,
        description: template.description,
        ruleType: template.ruleType,
        ruleData: template.ruleData,
        priority: template.priority,
      });
      setRules(await getRules(targetType, selectedTargetId));
      setMsg(`✓ تم إنشاء قاعدة "${template.name}" بنجاح`);
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : t('createFromTemplateFailed')}`);
    } finally {
      setCreatingTemplateCode("");
    }
  }

  async function createCustomizedTemplateCopy(e: React.FormEvent) {
    e.preventDefault();
    if (!copyDraft || !selectedTargetId) return;

    const validationError = validateRuleDataText(copyDraft.ruleDataText);
    if (validationError) {
      setCopyDraftError(validationError);
      return;
    }

    const parsedRuleData = JSON.parse(copyDraft.ruleDataText) as Record<
      string,
      unknown
    >;

    setCopyDraftError(null);

    if (hasDuplicateRule(copyDraft.template.ruleType, parsedRuleData)) {
      setMsg(`⚠ القاعدة "${copyDraft.template.name}" مضافة مسبقاً على هذا المستوى.`);
      return;
    }

    setCreatingTemplateCode(copyDraft.template.code);
    setMsg(null);
    try {
      await createRule({
        targetType,
        targetId: selectedTargetId,
        name: copyDraft.name,
        description: copyDraft.template.description,
        ruleType: copyDraft.template.ruleType,
        ruleData: parsedRuleData,
        priority: copyDraft.priority,
      });

      setRules(await getRules(targetType, selectedTargetId));
      setCopyDraft(null);
      setMsg(`✓ تم إنشاء نسخة معدلة من "${copyDraft.template.name}" بنجاح`);
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : t('createCopyFailed')}`);
    } finally {
      setCreatingTemplateCode("");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTargetId) return;
    setCreating(true);
    setMsg(null);
    try {
      const validationError = validateRuleDataText(form.ruleDataText);
      if (validationError) {
        setFormRuleDataError(validationError);
        return;
      }

      const ruleData = JSON.parse(form.ruleDataText) as Record<string, unknown>;
      setFormRuleDataError(null);

      if (hasDuplicateRule(form.ruleType, ruleData)) {
        setMsg(t('duplicateRule'));
        return;
      }

      await createRule({
        targetType,
        targetId: selectedTargetId,
        name: form.name,
        ruleType: form.ruleType,
        ruleData,
      });
      setMsg(t('createSuccess'));
      setShowForm(false);
      setForm({
        name: "",
        ruleType: "SPENDING_LIMIT",
        ruleDataText: RULE_TYPES[0].example,
      });
      setFormRuleDataError(null);
      setRules(await getRules(targetType, selectedTargetId));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('createFailed');
      setMsg(`⚠ ${message}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault();
    if (!pathId || !evalForm.amount) return;
    setEvaluating(true);
    setEvalResult(null);
    try {
      const result = await evaluateSpendingRules(
        pathId,
        parseFloat(evalForm.amount),
        evalForm.spendingItemId || undefined,
      );
      setEvalResult(result);
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : t('evalFailed')}`);
    } finally {
      setEvaluating(false);
    }
  }

  if (entities.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>{t('title')}</h1>
        </div>
        <AccessReasonPanel reason="INSUFFICIENT_ROLE" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        <div className={styles.pageTabs}>
          <button
            className={`${styles.pageTabBtn} ${pageTab === "rules" ? styles.pageTabBtnActive : ""}`}
            onClick={() => setPageTab("rules")}
          >
            {t('tabRules')}
          </button>
          <button
            className={`${styles.pageTabBtn} ${pageTab === "policy" ? styles.pageTabBtnActive : ""}`}
            onClick={() => setPageTab("policy")}
            disabled={!entityId}
            title={!entityId ? t('chooseEntityFirst') : undefined}
          >
            {t('tabPolicy')}
          </button>
        </div>
        <div className={styles.controls}>
          <select
            className={styles.select}
            title={t('chooseEntityPrompt')}
            value={entityId}
            onChange={(e) => {
              setEntityId(e.target.value);
              setMsg(null);
              setEvalResult(null);
            }}
          >
              <option value="">— اختر صندوقاً —</option>
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
          {entityId && (
            <select
              className={styles.select}
              title={t('walletSelectTitle')}
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
            >
              <option value="">— اختر محفظة —</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </select>
          )}
          {walletId && (
            <select
              className={styles.select}
              title={t('pathSelectTitle')}
              value={pathId}
              onChange={(e) => {
                setPathId(e.target.value);
                setEvalResult(null);
              }}
            >
              <option value="">— اختر مساراً —</option>
              {paths.map((path) => (
                <option key={path.id} value={path.id}>
                  {path.name}
                </option>
              ))}
            </select>
          )}
          {pathId && (
            <select
              className={styles.select}
              title={t('scopeSelectTitle')}
              value={targetType}
              onChange={(e) => {
                if (isValidTargetType(e.target.value)) {
                  setTargetType(e.target.value);
                }
              }}
            >
              <option value="ENTITY" disabled={!entityId}>
                نطاق الصندوق
              </option>
              <option value="WALLET" disabled={!walletId}>
                نطاق المحفظة
              </option>
              <option value="PATH" disabled={!pathId}>
                نطاق المسار
              </option>
            </select>
          )}
          {pathId && (
            <button
              className={styles.addBtn}
              onClick={() => setShowForm(!showForm)}
              disabled={!selectedTargetId}
            >
              {showForm ? t('cancelCreate') : t('newRule')}
            </button>
          )}
        </div>
      </div>

      {pageTab === "rules" && msg && (
        <div
          className={`${styles.msg} ${msg.startsWith("✓") ? styles.success : styles.error}`}
        >
          {msg}
        </div>
      )}

      {pageTab === "policy" && entityId && (
        <PolicyBuilder entityId={entityId} />
      )}

      {pageTab === "policy" && !entityId && (
        <div className={styles.prompt}>{t('choosePolicyEntityPrompt')}</div>
      )}

      {pageTab === "rules" && pathId && (
        <RuleSummaryPanel icon="⚖" summary={t('rulesContextSummary')} />
      )}

      {pageTab === "rules" && !pathId && (
        <div className={styles.prompt}>{t('chooseEntityPrompt')}</div>
      )}

      {pageTab === "rules" && pathId && showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>{t('formTitle')}</h3>
          <div className={styles.targetNote}>
            {t('targetNote', { targetType })}
          </div>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('nameLabel')}</label>
                <input
                  className={styles.input}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  minLength={3}
                  placeholder={t('namePlaceholder')}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('typeLabel')}</label>
                <select
                  className={styles.input}
                  title={t('typeLabel')}
                  value={form.ruleType}
                  onChange={(e) => handleRuleTypeChange(e.target.value)}
                >
                  {RULE_TYPES.map((ruleType) => (
                    <option key={ruleType.value} value={ruleType.value}>
                      {ruleType.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>{t('ruleDataLabel')}</label>
              <textarea
                className={styles.input}
                title={t('ruleDataLabel')}
                rows={8}
                value={form.ruleDataText}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setForm((prev) => ({ ...prev, ruleDataText: nextValue }));
                  setFormRuleDataError(validateRuleDataText(nextValue));
                }}
                dir="ltr"
                spellCheck={false}
              />
              <div className={styles.inlineActions}>
                <button
                  type="button"
                  className={styles.templateBtn}
                  onClick={() => {
                    const formatted = formatRuleDataText(form.ruleDataText);
                    if (!formatted) {
                      setFormRuleDataError(t('invalidJsonSyntax'));
                      return;
                    }
                    setForm((prev) => ({ ...prev, ruleDataText: formatted }));
                    setFormRuleDataError(null);
                  }}
                >
                  تنسيق JSON
                </button>
              </div>
              {formRuleDataError && (
                <div className={styles.inlineError}>{formRuleDataError}</div>
              )}
            </div>
            <button type="submit" className={styles.submitBtn} disabled={creating}>
              {creating ? t('creating') : t('createBtn')}
            </button>
          </form>
        </div>
      )}

      {pageTab === "rules" && (
      <div className={styles.templatesCard}>
        <div className={styles.templatesHeader}>
          <h3 className={styles.formTitle}>{t('templatesTitle')}</h3>
          <span className={styles.templatesHint}>
            {t('templatesHint', { targetType: targetTypeLabel(targetType) })}
          </span>
        </div>
        {templatesLoading ? (
          <div className={styles.templatesEmpty}>{t('loadingTemplates')}</div>
        ) : templates.filter((template) => template.recommendedTargetType === targetType)
            .length === 0 ? (
          <div className={styles.templatesEmpty}>
            لا توجد قوالب لهذا المستوى حالياً.
          </div>
        ) : (
          <div className={styles.templatesList}>
            {templates
              .filter((template) => template.recommendedTargetType === targetType)
              .map((template) => {
                const isTemplateDuplicate = hasDuplicateRule(
                  template.ruleType,
                  template.ruleData,
                );

                return (
                  <div key={template.code} className={styles.templateItem}>
                    <div className={styles.templateMain}>
                      <div className={styles.templateName}>{template.name}</div>
                      <div className={styles.templateMeta}>
                        {ruleTypeLabel(template.ruleType)} · {targetTypeLabel(template.recommendedTargetType)}
                      </div>
                      <div className={styles.templateDescription}>
                        {template.description}
                      </div>
                      {isTemplateDuplicate && (
                        <div className={styles.templateDuplicateHint}>
                          موجودة مسبقاً على هذا المستوى
                        </div>
                      )}
                    </div>
                    <div className={styles.templateActions}>
                      <button
                        className={`${styles.templateBtn} ${styles.templateBtnPrimary}`}
                        type="button"
                        onClick={() => createFromTemplate(template)}
                        disabled={
                          !selectedTargetId ||
                          creatingTemplateCode.length > 0 ||
                          isTemplateDuplicate
                        }
                      >
                        {creatingTemplateCode === template.code
                          ? t('creating')
                          : t('createDirect')}
                      </button>
                      <button
                        className={styles.templateBtn}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        disabled={!selectedTargetId || creatingTemplateCode.length > 0}
                      >
                        تطبيق على النموذج
                      </button>
                      <button
                        className={styles.templateBtn}
                        type="button"
                        onClick={() => openTemplateCopy(template)}
                        disabled={
                          !selectedTargetId ||
                          creatingTemplateCode.length > 0 ||
                          isTemplateDuplicate
                        }
                      >
                        نسخة معدلة
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      )}

      {pageTab === "rules" && copyDraft && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3 className={styles.formTitle}>{t('copyModalTitle')}</h3>
            <div className={styles.targetNote}>
              القالب: {copyDraft.template.name} · {targetTypeLabel(targetType)}
            </div>
            <form onSubmit={createCustomizedTemplateCopy} className={styles.form}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('copyNewName')}</label>
                <input
                  className={styles.input}
                  title={t('copyNewName')}
                  value={copyDraft.name}
                  onChange={(e) =>
                    setCopyDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            name: e.target.value,
                          }
                        : prev,
                    )
                  }
                  minLength={3}
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('copyPriority')}</label>
                <input
                  className={styles.input}
                  title={t('copyPriority')}
                  type="number"
                  value={copyDraft.priority}
                  onChange={(e) =>
                    setCopyDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            priority: Number.parseInt(e.target.value || "0", 10),
                          }
                        : prev,
                    )
                  }
                  required
                />
              </div>
              <details className={styles.advancedBox}>
                <summary className={styles.advancedSummary}>{t('advancedEdit')}</summary>
                <textarea
                  className={styles.input}
                  title={t('ruleDataLabel')}
                  rows={8}
                  value={copyDraft.ruleDataText}
                  onChange={(e) =>
                    {
                      const nextValue = e.target.value;
                      setCopyDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              ruleDataText: nextValue,
                            }
                          : prev,
                      );
                      setCopyDraftError(validateRuleDataText(nextValue));
                    }
                  }
                  dir="ltr"
                  spellCheck={false}
                />
                <div className={styles.inlineActions}>
                  <button
                    type="button"
                    className={styles.templateBtn}
                    onClick={() => {
                      const formatted = formatRuleDataText(copyDraft.ruleDataText);
                      if (!formatted) {
                        setCopyDraftError(t('invalidJsonSyntax'));
                        return;
                      }
                      setCopyDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              ruleDataText: formatted,
                            }
                          : prev,
                      );
                      setCopyDraftError(null);
                    }}
                  >
                    تنسيق JSON
                  </button>
                </div>
              </details>
              {copyDraftError && <div className={styles.inlineError}>{copyDraftError}</div>}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.templateBtn}
                  onClick={() => {
                    setCopyDraft(null);
                    setCopyDraftError(null);
                  }}
                  disabled={creatingTemplateCode.length > 0}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`${styles.templateBtn} ${styles.templateBtnPrimary}`}
                  disabled={creatingTemplateCode.length > 0}
                >
                  {creatingTemplateCode === copyDraft.template.code
                    ? t('creating')
                    : t('copyCreate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pageTab === "rules" && pathId && (
        <div className={styles.evaluateCard}>
          <h3 className={styles.evaluateTitle}>{t('evalTitle')}</h3>
          <form onSubmit={handleEvaluate}>
            <div className={styles.evaluateRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('amountLabel')}</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={evalForm.amount}
                  onChange={(e) =>
                    setEvalForm({ ...evalForm, amount: e.target.value })
                  }
                  required
                  placeholder="0.00"
                />
              </div>
              {spendingItems.length > 0 && (
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>{t('spendingItemLabel')}</label>
                  <select
                    className={styles.input}
                    title={t('spendingItemLabel')}
                    value={evalForm.spendingItemId}
                    onChange={(e) =>
                      setEvalForm({
                        ...evalForm,
                        spendingItemId: e.target.value,
                      })
                    }
                  >
                    <option value="">{t('allItems')}</option>
                    {spendingItems
                      .filter((item) => item.isActive)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={evaluating || !evalForm.amount}
              >
                {evaluating ? t('evaluating') : t('evalBtn')}
              </button>
            </div>
          </form>
          {evalResult && (
            <div
              className={`${styles.evalResult} ${evalResult.allowed ? styles.evalAllowed : styles.evalBlocked}`}
            >
              {evalResult.allowed
                ? t('evalAllowed')
                : `✗ الصرف محظور:\n${evalResult.violations.join("\n")}`}
            </div>
          )}
        </div>
      )}

      {pageTab === "rules" && pathId && loading && (
        <div className={styles.centered}>
          <div className={styles.spinner} />
        </div>
      )}

      {pageTab === "rules" && pathId && !loading && (
        <div className={styles.list}>
          {rules.length === 0 ? (
            <div className={styles.empty}>{t('noRules')}</div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className={styles.ruleCard}>
                <div className={styles.ruleIcon}>
                  {rule.ruleType === "SPENDING_LIMIT"
                    ? "＄"
                    : rule.ruleType === "ELIGIBILITY"
                      ? "✓"
                      : rule.ruleType === "TRANSFER"
                        ? "⇄"
                        : "⊟"}
                </div>
                <div className={styles.ruleInfo}>
                  <div className={styles.ruleName}>{rule.name}</div>
                  <div className={styles.ruleType}>
                    {ruleTypeLabel(rule.ruleType)}
                    {summarizeRuleData(rule) ? ` — ${summarizeRuleData(rule)}` : ""}
                  </div>
                </div>
                <span className={`${styles.ruleBadge} ${styles.badgeActive}`}>
                  {rule.isActive ? t('ruleActive') : t('ruleDisabled')}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
