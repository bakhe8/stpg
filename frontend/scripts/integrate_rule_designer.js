const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/(main)/rules/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('import { RuleDesigner }')) {
  content = content.replace(
    'import { getPathSpendingItems, SpendingItem } from "../../../lib/api/paths";',
    'import { getPathSpendingItems, SpendingItem } from "../../../lib/api/paths";\nimport { RuleDesigner } from "../../../components/Governance/RuleDesigner";'
  );
}

if (!content.includes('const [advancedModeForm, setAdvancedModeForm] = useState(false);')) {
  content = content.replace(
    'const [formRuleDataError, setFormRuleDataError] = useState<string | null>(null);',
    'const [formRuleDataError, setFormRuleDataError] = useState<string | null>(null);\n  const [advancedModeForm, setAdvancedModeForm] = useState(false);\n  const [advancedModeDraft, setAdvancedModeDraft] = useState(false);'
  );
}

// Function to handle switching modes safely
const validateJsonSwitchFunction = `
  function tryParseJsonText(text: string): Record<string, unknown> | null {
    try {
      const p = JSON.parse(text);
      if (typeof p === 'object' && p !== null && !Array.isArray(p)) {
        return p as Record<string, unknown>;
      }
    } catch (e) {}
    return null;
  }
`;

if (!content.includes('function tryParseJsonText')) {
  content = content.replace(
    '  function hasDuplicateRule',
    `${validateJsonSwitchFunction}\n  function hasDuplicateRule`
  );
}

// Replace creation form text area
const formRegex = /<div className=\{styles\.fieldGroup\}>\s*<label className=\{styles\.label\}>\{t\('ruleDataLabel'\)\}<\/label>\s*<textarea[\s\S]*?<\/div>\s*<\/div>\s*\{formRuleDataError[\s\S]*?<\/div>/;

const formReplacement = `
            <div className={styles.designerToggle}>
              <button
                type="button"
                className={styles.designerToggleBtn}
                onClick={() => {
                  if (advancedModeForm) {
                    const parsed = tryParseJsonText(form.ruleDataText);
                    if (!parsed) {
                      setFormRuleDataError(t("designer.invalidJsonSwitch"));
                      return;
                    }
                    setFormRuleDataError(null);
                    setAdvancedModeForm(false);
                  } else {
                    setAdvancedModeForm(true);
                  }
                }}
              >
                {advancedModeForm ? t("designer.visualMode") : t("designer.advancedMode")}
              </button>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>{t('ruleDataLabel')}</label>
              {advancedModeForm ? (
                <>
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
                </>
              ) : (
                <RuleDesigner
                  ruleType={form.ruleType}
                  ruleData={tryParseJsonText(form.ruleDataText) || {}}
                  onChange={(d) => setForm(prev => ({ ...prev, ruleDataText: JSON.stringify(d, null, 2) }))}
                  t={t}
                />
              )}
            </div>`;

content = content.replace(formRegex, formReplacement);

// Replace template drafting text area
const draftRegex = /<div className=\{styles\.fieldGroup\}>\s*<label className=\{styles\.label\}>\{t\('advancedEditLabel'\)\}<\/label>\s*<textarea[\s\S]*?<\/div>\s*<\/div>\s*\{copyDraftError[\s\S]*?<\/div>/;

const draftReplacement = `
              <div className={styles.designerToggle}>
                <button
                  type="button"
                  className={styles.designerToggleBtn}
                  onClick={() => {
                    if (advancedModeDraft) {
                      const parsed = tryParseJsonText(copyDraft.ruleDataText);
                      if (!parsed) {
                        setCopyDraftError(t("designer.invalidJsonSwitch"));
                        return;
                      }
                      setCopyDraftError(null);
                      setAdvancedModeDraft(false);
                    } else {
                      setAdvancedModeDraft(true);
                    }
                  }}
                >
                  {advancedModeDraft ? t("designer.visualMode") : t("designer.advancedMode")}
                </button>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('advancedEditLabel')}</label>
                {advancedModeDraft ? (
                  <>
                    <textarea
                      className={styles.input}
                      title={t('advancedEditLabel')}
                      rows={6}
                      value={copyDraft.ruleDataText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCopyDraft({ ...copyDraft, ruleDataText: val });
                        setCopyDraftError(validateRuleDataText(val));
                      }}
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
                          setCopyDraft({ ...copyDraft, ruleDataText: formatted });
                          setCopyDraftError(null);
                        }}
                      >
                        تنسيق JSON
                      </button>
                    </div>
                    {copyDraftError && (
                      <div className={styles.inlineError}>{copyDraftError}</div>
                    )}
                  </>
                ) : (
                  <RuleDesigner
                    ruleType={copyDraft.template.ruleType}
                    ruleData={tryParseJsonText(copyDraft.ruleDataText) || {}}
                    onChange={(d) => setCopyDraft({ ...copyDraft, ruleDataText: JSON.stringify(d, null, 2) })}
                    t={t}
                  />
                )}
              </div>`;

content = content.replace(draftRegex, draftReplacement);

fs.writeFileSync(filePath, content);
console.log('Updated rules page with RuleDesigner integration');
