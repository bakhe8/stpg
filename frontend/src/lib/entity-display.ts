type EntityDisplayRecord = {
  isCampaign?: boolean | null;
  type?: string | null;
};

export function isCampaignRecord(entity?: EntityDisplayRecord | null) {
  return Boolean(entity?.isCampaign || entity?.type === "CAMPAIGN");
}
