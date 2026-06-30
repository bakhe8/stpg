"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  getEntityTemplates,
  createEntity,
  EntityTemplate,
} from "@/lib/api/entities";
import { createInvitation } from "@/lib/api/invitations";
import styles from "./wizard.module.css";

interface WizardState {
  type: string;
  name: string;
  description: string;
  templateId: string;
}

export default function EntityWizardPage() {
  const router = useRouter();
  const t = useTranslations("entities");
  const [step, setStep] = useState(0);
  const [preGatePassed, setPreGatePassed] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [templates, setTemplates] = useState<EntityTemplate[]>([]);
  const [creating, setCreating] = useState(false);
  const [createdEntityId, setCreatedEntityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);

  const ENTITY_TYPES = [
    { value: "FAMILY", label: t("typeFamily2"), icon: "👨‍👩‍👧‍👦", desc: t("typeFamilyDesc") },
    { value: "BUILDING", label: t("typeBuilding2"), icon: "🏢", desc: t("typeBuildingDesc") },
    { value: "NEIGHBORHOOD", label: t("typeNeighborhood2"), icon: "🏘️", desc: t("typeNeighborhoodDesc") },
    { value: "TRIBE", label: t("typeTribe2"), icon: "⚜️", desc: t("typeTribeDesc") },
    { value: "CAMPAIGN", label: t("typeCampaign2"), icon: "📣", desc: t("typeCampaignDesc") },
  ];

  const STEPS = [
    t("wizardStep0"),
    t("wizardStep1"),
    t("wizardStep3"),
    t("wizardStep5"),
  ];

  const [state, setState] = useState<WizardState>({
    type: "",
    name: "",
    description: "",
    templateId: "",
  });

  useEffect(() => {
    getEntityTemplates().then(setTemplates).catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setIsVerified(false); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { isVerified?: boolean } | null) => setIsVerified(data?.isVerified ?? false))
      .catch(() => setIsVerified(false));
  }, []);

  const canNext = (): boolean => {
    if (step === 0) return Boolean(state.type);
    if (step === 1) return state.name.trim().length >= 2;
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const result = await createEntity({
        name: state.name.trim(),
        type: state.type,
        description: state.description.trim() || undefined,
        templateId: state.templateId || undefined,
      }) as { id: string };
      setCreatedEntityId(result.id);
      setStep(STEPS.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createEntityFailed"));
    } finally {
      setCreating(false);
    }
  };

  const renderStep0 = () => (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>{t("wizardChooseType")}</h2>
      <div className={styles.typeGrid}>
        {ENTITY_TYPES.map((et) => (
          <button
            key={et.value}
            className={`${styles.typeCard} ${state.type === et.value ? styles.typeCardSelected : ""}`}
            onClick={() => setState({ ...state, type: et.value })}
          >
            <span className={styles.typeIcon}>{et.icon}</span>
            <span className={styles.typeLabel}>{et.label}</span>
            <span className={styles.typeDesc}>{et.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>{t("wizardNameTitle")}</h2>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>{t("wizardNameLabel")} <span className={styles.required}>*</span></label>
        <input
          className={styles.input}
          value={state.name}
          onChange={(e) => setState({ ...state, name: e.target.value })}
          placeholder={t("wizardNamePlaceholder")}
          maxLength={60}
        />
        <span className={styles.hint}>{state.name.length}/60</span>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>{t("wizardDescLabel")}</label>
        <textarea
          className={styles.textarea}
          value={state.description}
          onChange={(e) => setState({ ...state, description: e.target.value })}
          placeholder={t("wizardDescPlaceholder")}
          rows={4}
          maxLength={300}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>{t("wizardTemplateTitle")}</h2>
      <p className={styles.stepHint}>{t("wizardTemplateHint")}</p>
      <div className={styles.templateList}>
        <button
          className={`${styles.templateCard} ${!state.templateId ? styles.templateCardSelected : ""}`}
          onClick={() => setState({ ...state, templateId: "" })}
        >
          <span className={styles.templateName}>{t("noTemplateOption")}</span>
          <span className={styles.templateDesc}>{t("noTemplateDesc")}</span>
        </button>
        {templates.map((tpl) => {
          const walletCount = tpl.defaultWallets?.length ?? 0;
          const pathCount = tpl.defaultPaths?.length ?? 0;
          const moduleCount = tpl.enabledModules?.length ?? 0;
          const suggestedGoals = (tpl.suggestedGoals ?? [])
            .filter((goal) => goal.name)
            .slice(0, 3);

          return (
            <button
              key={tpl.id}
              className={`${styles.templateCard} ${state.templateId === tpl.id ? styles.templateCardSelected : ""}`}
              onClick={() => setState({ ...state, templateId: tpl.id })}
            >
              <span className={styles.templateHeader}>
                {tpl.icon && <span className={styles.templateIcon}>{tpl.icon}</span>}
                <span className={styles.templateName}>{tpl.name}</span>
              </span>
              {tpl.description && (
                <span className={styles.templateDesc}>{tpl.description}</span>
              )}
              <span className={styles.templateMeta}>
                {t("templateWallets", { count: walletCount })}
                {" · "}
                {t("templatePaths", { count: pathCount })}
                {moduleCount > 0 ? ` · ${t("templateModules", { count: moduleCount })}` : ""}
              </span>
              {suggestedGoals.length > 0 && (
                <span className={styles.templateGoals}>
                  {suggestedGoals.map((goal) => (
                    <span key={`${tpl.id}-${goal.name}`} className={styles.templateGoal}>
                      {goal.icon ? `${goal.icon} ` : ""}
                      {goal.name}
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>{t("wizardReviewTitle")}</h2>
      <div className={styles.reviewCard}>
        {[
          { label: t("reviewType"), value: ENTITY_TYPES.find((et) => et.value === state.type)?.label ?? state.type },
          { label: t("reviewName"), value: state.name },
          { label: t("reviewDescription"), value: state.description || "—" },
          { label: t("reviewTemplate"), value: state.templateId ? (templates.find((tpl) => tpl.id === state.templateId)?.name ?? state.templateId) : t("reviewNoTemplate") },
        ].map((row) => (
          <div key={row.label} className={styles.reviewRow}>
            <span className={styles.reviewLabel}>{row.label}</span>
            <span className={styles.reviewValue}>{row.value}</span>
          </div>
        ))}
      </div>

      <div className={styles.legalBox}>
        <div className={styles.legalTitle}>{t("legalTitle")}</div>
        <ul className={styles.legalList}>
          <li>
            {t.rich("legalItem1", { bold: (chunks) => <strong>{chunks}</strong> })}
          </li>
          <li>
            {t.rich("legalItem2", { bold: (chunks) => <strong>{chunks}</strong> })}
          </li>
          <li>
            {t.rich("legalItem3", { bold: (chunks) => <strong>{chunks}</strong> })}
          </li>
          <li>
            {t("legalItem4")}
          </li>
        </ul>
        <label className={styles.legalCheckRow}>
          <input
            type="checkbox"
            checked={legalAccepted}
            onChange={(e) => setLegalAccepted(e.target.checked)}
            className={styles.legalCheckbox}
          />
          <span>{t("legalAccept")}</span>
        </label>
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );

  async function copyInviteLink() {
    if (!createdEntityId) return;
    try {
      const { token } = await createInvitation({ entityId: createdEntityId });
      const url = `${window.location.origin}/join/${token}`;
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    } catch {
      // clipboard unavailable
    }
  }

  const renderSuccess = () => (
    <div className={styles.successScreen}>
      <div className={styles.successIcon}>✅</div>
      <h2 className={styles.successTitle}>{t("successTitle")}</h2>
      <p className={styles.successDesc}>{t("successDesc")}</p>

      <div className={styles.setupMap}>
        <div className={styles.setupMapHeader}>
          <strong>{t("setupMapTitle")}</strong>
          <span>{t("setupMapSubtitle")}</span>
        </div>
        <div className={styles.setupMapGrid}>
          <div>
            <span>{t("setupMapEntity")}</span>
            <strong>{state.name}</strong>
          </div>
          <div>
            <span>{t("setupMapWallet")}</span>
            <strong>
              {state.templateId
                ? t("setupMapWalletTemplate")
                : t("setupMapWalletManual")}
            </strong>
          </div>
        </div>
        <p className={styles.setupMapOutcome}>{t("setupMapOutcome")}</p>
      </div>

      <div className={styles.nextSteps}>
        <h3 className={styles.nextStepsTitle}>{t("nextStepsTitle")}</h3>

        <div className={styles.nextStep}>
          <span className={styles.nextStepNum}>1</span>
          <div className={styles.nextStepBody}>
            <strong>{t("nextStep1Title")}</strong>
            <p>{t("nextStep1Desc")}</p>
          </div>
          <button
            className={inviteCopied ? styles.nextStepBtnDone : styles.nextStepBtn}
            onClick={copyInviteLink}
          >
            {inviteCopied ? t("linkCopied") : t("copyLink")}
          </button>
        </div>

        <div className={styles.nextStep}>
          <span className={styles.nextStepNum}>2</span>
          <div className={styles.nextStepBody}>
            <strong>
              {state.templateId
                ? t("nextStep2TitleTemplate")
                : t("nextStep2Title")}
            </strong>
            <p>
              {state.templateId
                ? t("nextStep2DescTemplate")
                : t("nextStep2Desc")}
            </p>
          </div>
          <button
            className={styles.nextStepBtn}
            onClick={() => router.push(createdEntityId ? `/entities/${createdEntityId}?tab=wallets` : '/entities')}
          >
            {state.templateId ? t("reviewBtnInline") : t("createBtnInline")}
          </button>
        </div>

        <div className={styles.nextStep}>
          <span className={styles.nextStepNum}>3</span>
          <div className={styles.nextStepBody}>
            <strong>{t("nextStep3Title")}</strong>
            <p>{t("nextStep3Desc")}</p>
          </div>
          <button
            className={styles.nextStepBtn}
            onClick={() => router.push(createdEntityId ? `/rules?entityId=${createdEntityId}` : '/rules')}
          >
            {t("setupBtnInline")}
          </button>
        </div>

        <div className={styles.nextStep}>
          <span className={styles.nextStepNum}>4</span>
          <div className={styles.nextStepBody}>
            <strong>{t("nextStep4Title")}</strong>
            <p>{t("nextStep4Desc")}</p>
          </div>
          <button
            className={styles.nextStepBtn}
            onClick={() => router.push(createdEntityId ? `/entities/${createdEntityId}?tab=members` : "/entities")}
          >
            {t("membersBtnInline")}
          </button>
        </div>

        <div className={styles.nextStep}>
          <span className={styles.nextStepNum}>5</span>
          <div className={styles.nextStepBody}>
            <strong>{t("nextStep5Title")}</strong>
            <p>{t("nextStep5Desc")}</p>
          </div>
          <button
            className={styles.nextStepBtn}
            onClick={() => router.push(createdEntityId ? `/finance?entityId=${createdEntityId}` : "/finance")}
          >
            {t("financeBtnInline")}
          </button>
        </div>
      </div>

      <div className={styles.successActions}>
        <button
          className={styles.primaryBtn}
          onClick={() => router.push(createdEntityId ? `/entities/${createdEntityId}` : "/entities")}
        >
          {t("goToEntity")}
        </button>
        <button className={styles.secondaryBtn} onClick={() => router.push("/entities")}>
          {t("entityList")}
        </button>
      </div>
    </div>
  );

  const stepRenderers = [renderStep0, renderStep1, renderStep3, renderStep5];
  const isLastStep = step === STEPS.length - 1;
  const isDone = step === STEPS.length;

  if (isVerified === false) {
    return (
      <div className={styles.unverifiedScreen}>
        <div className={styles.unverifiedCard}>
          <div className={styles.unverifiedIcon}>🔒</div>
          <h2 className={styles.unverifiedTitle}>{t("unverifiedTitle")}</h2>
          <p className={styles.unverifiedDesc}>
            {t("unverifiedDesc")}
          </p>
          <button
            className={styles.unverifiedBtn}
            onClick={() => router.push("/profile")}
          >
            {t("goToProfile")}
          </button>
        </div>
      </div>
    );
  }

  if (!preGatePassed) {
    return (
      <div className={styles.page}>
        <div className={styles.preGate}>
          <div className={styles.preGateIcon}>⚖</div>
          <h2 className={styles.preGateTitle}>{t("preGateTitle")}</h2>
          <p className={styles.preGateSubtitle}>{t("preGateSubtitle")}</p>

          <div className={styles.preGateList}>
            <div className={styles.preGateItem}>
              <span className={styles.preGateNum}>1</span>
              <div>
                <strong>{t("preGateItem1Title")}</strong>
                <p>{t("preGateItem1Body")}</p>
              </div>
            </div>
            <div className={styles.preGateItem}>
              <span className={styles.preGateNum}>2</span>
              <div>
                <strong>{t("preGateItem2Title")}</strong>
                <p>{t("preGateItem2Body")}</p>
              </div>
            </div>
            <div className={styles.preGateItem}>
              <span className={styles.preGateNum}>3</span>
              <div>
                <strong>{t("preGateItem3Title")}</strong>
                <p>{t("preGateItem3Body")}</p>
              </div>
            </div>
            <div className={styles.preGateItem}>
              <span className={styles.preGateNum}>4</span>
              <div>
                <strong>{t("preGateItem4Title")}</strong>
                <p>{t("preGateItem4Body")}</p>
              </div>
            </div>
          </div>

          <button
            className={styles.primaryBtn}
            onClick={() => setPreGatePassed(true)}
          >
            {t("preGateConfirm")}
          </button>
          <button
            className={styles.secondaryBtn}
            onClick={() => router.back()}
          >
            {t("preGateBack")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {!isDone && (
        <>
          <div className={styles.stepper}>
            {STEPS.map((label, i) => (
              <React.Fragment key={i}>
                <div className={`${styles.stepDot} ${i < step ? styles.stepDone : i === step ? styles.stepActive : styles.stepPending}`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className={`${styles.stepLabel} ${i === step ? styles.stepLabelActive : ""}`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${i < step ? styles.stepLineDone : ""}`} />}
              </React.Fragment>
            ))}
          </div>

          <div className={styles.card}>
            {stepRenderers[step]?.()}
          </div>

          <div className={styles.navRow}>
            <button
              className={styles.backBtn}
              onClick={handleBack}
              disabled={step === 0}
            >
              {t("wizardBack")}
            </button>
            {isLastStep ? (
              <button
                className={styles.primaryBtn}
                onClick={handleCreate}
                disabled={creating || !legalAccepted}
                title={!legalAccepted ? t("legalAcceptMissing") : undefined}
              >
                {creating ? t("creating") : t("wizardCreate")}
              </button>
            ) : (
              <button
                className={styles.primaryBtn}
                onClick={handleNext}
                disabled={!canNext()}
              >
                {t("wizardNext")}
              </button>
            )}
          </div>
        </>
      )}
      {isDone && renderSuccess()}
    </div>
  );
}
