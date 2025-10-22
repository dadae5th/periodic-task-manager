-- 이메일 토큰 테이블만 생성 (기존 테이블은 건드리지 않음)

CREATE TABLE IF NOT EXISTS email_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(64) UNIQUE NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    task_id UUID,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user_email ON email_tokens(user_email);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires_at ON email_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_tokens_used ON email_tokens(used);

-- RLS 정책 설정
ALTER TABLE email_tokens ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Allow all operations on email_tokens" ON email_tokens;

-- 새 정책 생성
CREATE POLICY "Allow all operations on email_tokens" ON email_tokens
    FOR ALL USING (true);

SELECT 'email_tokens 테이블이 성공적으로 생성되었습니다!' as message;
