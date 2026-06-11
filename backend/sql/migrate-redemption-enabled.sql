-- 兑换码运营：启用 / 停用
ALTER TABLE redemption_codes ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_redemption_codes_enabled ON redemption_codes(enabled);
