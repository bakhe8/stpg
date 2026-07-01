import type { Entity } from "./api/entities";

type EntityDisplayRecord = Pick<Entity, "isCampaign" | "type">;

export function isCampaignRecord(entity?: EntityDisplayRecord | null) {
  return Boolean(entity?.isCampaign || entity?.type === "CAMPAIGN");
}
