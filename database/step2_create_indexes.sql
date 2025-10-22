-- 2단계: 인덱스 생성 (이미 존재하면 건너뜀)
CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user_email ON email_tokens(user_email);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires_at ON email_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_tokens_used ON email_tokens(used);
