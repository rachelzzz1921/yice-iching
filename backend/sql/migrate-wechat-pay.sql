-- 微信支付：订单 prepay_id、用户 openid
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS prepay_id VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_openid VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_users_wechat_openid ON users(wechat_openid);
