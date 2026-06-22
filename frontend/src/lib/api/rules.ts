import { fetchApi } from "../api";

export interface Rule {
  id: string;
  targetType: string;
  targetId: string;
  name: string;
  description?: string | null;
  ruleType: string;
  ruleData: Record<string, unknown>;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

export interface SpendingRulesResult {
  allowed: boolean;
  violations: string[];
}

export interface RuleTemplate {
  code: string;
  name: string;
  description: string;
  recommendedTargetType: string;
  ruleType: string;
  priority: number;
  ruleData: Record<string, unknown>;
}

export function getRules(
  targetType: string,
  targetId: string,
): Promise<Rule[]> {
  return fetchApi(`/rules?targetType=${targetType}&targetId=${targetId}`);
}

export function createRule(data: {
  targetType: string;
  targetId: string;
  name: string;
  description?: string;
  ruleType: string;
  ruleData: Record<string, unknown>;
  priority?: number;
}): Promise<Rule> {
  return fetchApi("/rules", { method: "POST", body: JSON.stringify(data) });
}

export function evaluateSpendingRules(
  pathId: string,
  amount: number,
  spendingItemId?: string,
): Promise<SpendingRulesResult> {
  const qs = spendingItemId ? `&spendingItemId=${spendingItemId}` : "";
  return fetchApi(`/rules/evaluate?pathId=${pathId}&amount=${amount}${qs}`);
}

export function getRuleTemplates(): Promise<RuleTemplate[]> {
  return fetchApi('/rules/templates');
}
