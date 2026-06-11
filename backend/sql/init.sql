CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  plan VARCHAR(20) DEFAULT 'free',
  default_method VARCHAR(20) DEFAULT 'coin',
  ritual_guide BOOLEAN DEFAULT true,
  is_guest BOOLEAN DEFAULT false,
  bonus_credits INT NOT NULL DEFAULT 0,
  divination_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS divinations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  lower_gua SMALLINT,
  upper_gua SMALLINT,
  changing_line SMALLINT NOT NULL DEFAULT 0,
  gua_id SMALLINT,
  bian_gua_id SMALLINT,
  question_category VARCHAR(20),
  question_text TEXT,
  ai_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_div_user ON divinations(user_id);
CREATE INDEX IF NOT EXISTS idx_div_cat ON divinations(question_category);

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
