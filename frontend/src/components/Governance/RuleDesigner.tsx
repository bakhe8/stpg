"use client";

import React from "react";
import styles from "../../app/(main)/rules/rules.module.css";
import type { Translator } from "../../lib/i18n";

interface RuleDesignerProps {
  ruleType: string;
  ruleData: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  t: Translator;
}

export function RuleDesigner({ ruleType, ruleData, onChange, t }: RuleDesignerProps) {
  // Utility to handle nested or missing properties gracefully
  const getValue = <T,>(key: string, defaultValue: T): T => {
    return (ruleData[key] !== undefined ? ruleData[key] : defaultValue) as T;
  };

  const setField = (key: string, value: unknown) => {
    onChange({ ...ruleData, [key]: value });
  };

  switch (ruleType) {
    case "SPENDING_LIMIT": {
      const maxAmount = getValue<number | "">("maxAmount", "");
      return (
        <div className={styles.designerFieldGroup}>
          <label className={styles.designerLabel}>{t("designer.maxAmount")}</label>
          <input
            type="number"
            className={styles.designerInput}
            value={maxAmount}
            onChange={(e) => setField("maxAmount", e.target.value === "" ? "" : Number(e.target.value))}
            min={0}
            placeholder="0"
          />
        </div>
      );
    }

    case "REQUIRES_DOCUMENTS": {
      const required = getValue<boolean>("required", false);
      return (
        <label className={styles.designerCheckboxLabel}>
          <input
            type="checkbox"
            className={styles.designerCheckbox}
            checked={required}
            onChange={(e) => setField("required", e.target.checked)}
          />
          <span className={styles.designerCheckboxText}>{t("designer.requireDocs")}</span>
        </label>
      );
    }

    case "QUORUM": {
      const minQuorum = getValue<number | "">("minQuorumPercent", "");
      const minApproval = getValue<number | "">("minApprovalPercent", "");
      const allowedVoteTypes = getValue<string[]>("allowedVoteTypes", []);

      const toggleVoteType = (vt: string) => {
        if (allowedVoteTypes.includes(vt)) {
          setField("allowedVoteTypes", allowedVoteTypes.filter((v) => v !== vt));
        } else {
          setField("allowedVoteTypes", [...allowedVoteTypes, vt]);
        }
      };

      return (
        <div className={styles.designerStack}>
          <div className={styles.designerRow}>
            <div className={styles.designerFieldGroup}>
              <label className={styles.designerLabel}>{t("designer.minQuorum")}</label>
              <input
                type="number"
                className={styles.designerInput}
                value={minQuorum}
                onChange={(e) => setField("minQuorumPercent", e.target.value === "" ? "" : Number(e.target.value))}
                min={1}
                max={100}
                placeholder="50"
              />
            </div>
            <div className={styles.designerFieldGroup}>
              <label className={styles.designerLabel}>{t("designer.minApproval")}</label>
              <input
                type="number"
                className={styles.designerInput}
                value={minApproval}
                onChange={(e) => setField("minApprovalPercent", e.target.value === "" ? "" : Number(e.target.value))}
                min={1}
                max={100}
                placeholder="50"
              />
            </div>
          </div>
          <div className={styles.designerFieldGroup}>
            <label className={styles.designerLabel}>{t("designer.allowedVoteTypes")}</label>
            <div className={styles.designerCheckboxGroup}>
              {["SIMPLE_MAJORITY", "TWO_THIRDS", "BY_CONTRIBUTION"].map((vt) => (
                <label key={vt} className={styles.designerCheckboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.designerCheckbox}
                    checked={allowedVoteTypes.includes(vt)}
                    onChange={() => toggleVoteType(vt)}
                  />
                  <span className={styles.designerCheckboxText}>{t(`designer.voteType_${vt}`)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case "TRANSFER": {
      const allowTransfer = getValue<boolean>("allowTransfer", false);
      const sameWalletOnly = getValue<boolean>("sameWalletOnly", false);
      const maxAmount = getValue<number | "">("maxAmount", "");

      return (
        <div className={styles.designerStack}>
          <div className={styles.designerCheckboxGroupRow}>
            <label className={styles.designerCheckboxLabel}>
              <input
                type="checkbox"
                className={styles.designerCheckbox}
                checked={allowTransfer}
                onChange={(e) => setField("allowTransfer", e.target.checked)}
              />
              <span className={styles.designerCheckboxText}>{t("designer.allowTransfer")}</span>
            </label>
            <label className={styles.designerCheckboxLabel}>
              <input
                type="checkbox"
                className={styles.designerCheckbox}
                checked={sameWalletOnly}
                onChange={(e) => setField("sameWalletOnly", e.target.checked)}
              />
              <span className={styles.designerCheckboxText}>{t("designer.sameWalletOnly")}</span>
            </label>
          </div>
          <div className={styles.designerFieldGroup}>
            <label className={styles.designerLabel}>{t("designer.maxAmount")}</label>
            <input
              type="number"
              className={styles.designerInput}
              value={maxAmount}
              onChange={(e) => setField("maxAmount", e.target.value === "" ? "" : Number(e.target.value))}
              min={0}
              placeholder="0"
            />
          </div>
        </div>
      );
    }

    case "ELIGIBILITY": {
      const minAgreedAmount = getValue<number | "">("minAgreedAmount", "");
      const requiresAppealsEnabled = getValue<boolean>("requiresAppealsEnabled", false);
      const allowedPathTypes = getValue<string[]>("allowedPathTypes", []);

      const togglePathType = (pt: string) => {
        if (allowedPathTypes.includes(pt)) {
          setField("allowedPathTypes", allowedPathTypes.filter((p) => p !== pt));
        } else {
          setField("allowedPathTypes", [...allowedPathTypes, pt]);
        }
      };

      return (
        <div className={styles.designerStack}>
          <div className={styles.designerFieldGroup}>
            <label className={styles.designerLabel}>{t("designer.minAgreedAmount")}</label>
            <input
              type="number"
              className={styles.designerInput}
              value={minAgreedAmount}
              onChange={(e) => setField("minAgreedAmount", e.target.value === "" ? "" : Number(e.target.value))}
              min={0}
              placeholder="0"
            />
          </div>
          <label className={styles.designerCheckboxLabel}>
            <input
              type="checkbox"
              className={styles.designerCheckbox}
              checked={requiresAppealsEnabled}
              onChange={(e) => setField("requiresAppealsEnabled", e.target.checked)}
            />
            <span className={styles.designerCheckboxText}>{t("designer.requiresAppealsEnabled")}</span>
          </label>
          <div className={styles.designerFieldGroup}>
            <label className={styles.designerLabel}>{t("designer.allowedPathTypes")}</label>
            <div className={styles.designerCheckboxGroup}>
              {["COMMITTEE", "SUBSCRIPTION", "EMERGENCY"].map((pt) => (
                <label key={pt} className={styles.designerCheckboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.designerCheckbox}
                    checked={allowedPathTypes.includes(pt)}
                    onChange={() => togglePathType(pt)}
                  />
                  <span className={styles.designerCheckboxText}>{t(`designer.pathType_${pt}`)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      );
    }

    default:
      return (
        <div className={styles.designerEmpty}>
          {t("designer.visualModeNotSupported", { type: ruleType })}
        </div>
      );
  }
}
