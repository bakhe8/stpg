export const ENTITY_TYPE_KEYS: Record<string, string> = {
  FAMILY: "entityFamily",
  TRIBE: "entityTribe",
  BUILDING: "entityBuilding",
  NEIGHBORHOOD: "entityNeighborhood",
  COMMUNITY: "entityCommunity",
  CAMPAIGN: "entityCampaign",
};

export const DECISION_TYPE_KEYS: Record<string, string> = {
  CREATE_WALLET: "decisionCreateWallet",
  CREATE_PATH: "decisionCreatePath",
  DISBURSE_FUNDS: "decisionDisburseFunds",
  MODIFY_SUBSCRIPTION: "decisionModifySubscription",
  MODIFY_GOVERNANCE: "decisionModifyGovernance",
  TRANSFER_BALANCE: "decisionTransferBalance",
  ACCEPT_MEMBER: "decisionAcceptMember",
  EXPEL_MEMBER: "decisionExpelMember",
  OPEN_DISPUTE: "decisionOpenDispute",
  CLOSE_WALLET: "decisionCloseWallet",
  FREEZE_WALLET: "decisionFreezeWallet",
  MERGE_PATHS: "decisionMergePaths",
};

export const DISPUTE_TYPE_KEYS: Record<string, string> = {
  FINANCIAL_MISCONDUCT: "disputeFinancialMisconduct",
  GOVERNANCE_VIOLATION: "disputeGovernanceViolation",
  MEMBER_CONFLICT: "disputeMemberConflict",
  POLICY_BREACH: "disputePolicyBreach",
  UNFAIR_DECISION: "disputeUnfairDecision",
  TRANSPARENCY_ISSUE: "disputeTransparencyIssue",
  LEGAL_MATTER: "disputeLegalMatter",
};
