-- 0004_login_rate.sql
-- Login no longer asks for an email; the sigil goes to OWNER_EMAIL. Track the
-- requesting address so one button in the wild cannot be used to spam stones.

ALTER TABLE login_codes ADD COLUMN ip_hash TEXT;
CREATE INDEX idx_login_codes_created ON login_codes(created_at);
