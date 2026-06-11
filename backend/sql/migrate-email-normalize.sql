-- 邮箱统一小写，避免登录时大小写不一致导致「用户不存在」
UPDATE users
SET email = LOWER(TRIM(email))
WHERE email != LOWER(TRIM(email))
  AND email NOT LIKE '%@guest.local';
