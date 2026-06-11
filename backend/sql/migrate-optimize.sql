-- 性能与功能优化（可重复执行）

ALTER TABLE users ADD COLUMN IF NOT EXISTS divination_count INT NOT NULL DEFAULT 0;

UPDATE users u
SET divination_count = COALESCE(sub.c, 0)
FROM (
  SELECT user_id, COUNT(*)::int AS c
  FROM divinations
  GROUP BY user_id
) sub
WHERE u.id = sub.user_id
  AND u.divination_count IS DISTINCT FROM sub.c;

CREATE OR REPLACE FUNCTION sync_user_divination_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
    UPDATE users SET divination_count = divination_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' AND OLD.user_id IS NOT NULL THEN
    UPDATE users SET divination_count = GREATEST(0, divination_count - 1) WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_divinations_count_insert ON divinations;
CREATE TRIGGER trg_divinations_count_insert
  AFTER INSERT ON divinations
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_divination_count();

DROP TRIGGER IF EXISTS trg_divinations_count_delete ON divinations;
CREATE TRIGGER trg_divinations_count_delete
  AFTER DELETE ON divinations
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_divination_count();

CREATE INDEX IF NOT EXISTS idx_div_user_created ON divinations(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
