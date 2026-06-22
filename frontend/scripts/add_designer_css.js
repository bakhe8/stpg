const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../src/app/(main)/rules/rules.module.css');
let css = fs.readFileSync(cssPath, 'utf8');

const designerCss = `

/* Rule Designer Wizard */
.designerToggle {
  display: flex;
  justify-content: flex-end;
  margin-bottom: -10px;
}

.designerToggleBtn {
  background: transparent;
  border: none;
  color: var(--accent-primary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background var(--transition-fast);
}

.designerToggleBtn:hover {
  background: rgba(var(--accent-primary-rgb), 0.1);
}

.designerStack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
}

.designerRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.designerFieldGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.designerLabel {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.designerInput {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.95rem;
  outline: none;
  transition: border-color var(--transition-fast);
  width: 100%;
}

.designerInput:focus {
  border-color: var(--accent-primary);
}

.designerCheckboxGroup {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
}

.designerCheckboxGroupRow {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
}

.designerCheckboxLabel {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.designerCheckbox {
  width: 18px;
  height: 18px;
  accent-color: var(--accent-primary);
  cursor: pointer;
}

.designerCheckboxText {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 500;
  user-select: none;
}

.designerEmpty {
  padding: 30px;
  text-align: center;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px dashed var(--glass-border);
  border-radius: 12px;
  font-size: 0.9rem;
}
`;

if (!css.includes('.designerToggle')) {
  fs.writeFileSync(cssPath, css + designerCss);
}
