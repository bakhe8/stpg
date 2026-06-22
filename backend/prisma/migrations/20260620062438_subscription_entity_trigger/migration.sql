-- Migration: subscription_entity_trigger
-- Enforces that a Subscription's membership and governance path belong to the same entity.

CREATE OR REPLACE FUNCTION check_subscription_entity_match()
RETURNS TRIGGER AS $$
DECLARE
  v_membership_entity_id UUID;
  v_path_entity_id       UUID;
BEGIN
  SELECT entity_id INTO v_membership_entity_id
  FROM memberships
  WHERE id = NEW.membership_id;

  SELECT w.entity_id INTO v_path_entity_id
  FROM governance_paths gp
  JOIN wallets w ON w.id = gp.wallet_id
  WHERE gp.id = NEW.governance_path_id;

  IF v_membership_entity_id IS DISTINCT FROM v_path_entity_id THEN
    RAISE EXCEPTION
      'الاشتراك يجب أن يكون داخل نفس الكيان: membership.entityId (%) != path.entityId (%)',
      v_membership_entity_id,
      v_path_entity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subscription_entity_match
BEFORE INSERT OR UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION check_subscription_entity_match();
