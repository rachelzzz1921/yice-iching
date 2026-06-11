-- 会员 / 兑换码 / 单次付费（在已有库上执行一次）
ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_credits INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS redemption_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  kind VARCHAR(20) NOT NULL DEFAULT 'lifetime',
  credit_amount INT NOT NULL DEFAULT 0,
  max_redemptions INT NOT NULL DEFAULT 1,
  redemption_count INT NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS redemption_uses (
  id SERIAL PRIMARY KEY,
  code_id INT NOT NULL REFERENCES redemption_codes(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (code_id, user_id)
);

CREATE TABLE IF NOT EXISTS payment_orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_no VARCHAR(64) UNIQUE NOT NULL,
  amount_cents INT NOT NULL,
  credits INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  provider VARCHAR(20) NOT NULL DEFAULT 'wechat',
  provider_trade_no VARCHAR(128),
  code_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_uses_user ON redemption_uses(user_id);
