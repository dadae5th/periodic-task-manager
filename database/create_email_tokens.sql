-- 이메일 인증 토큰 테이블 생성 (Supabase에서 직접 실행)

CREATE TABLE IF NOT EXISTS email_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(64) UNIQUE NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'task_completion', 'login' 등
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
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

-- 기존 정책이 있다면 삭제 후 재생성
DROP POLICY IF EXISTS "Allow all operations on email_tokens" ON email_tokens;

-- 모든 사용자가 접근 가능하도록 설정 (서비스 역할 키로 접근)
CREATE POLICY "Allow all operations on email_tokens" ON email_tokens
    FOR ALL USING (true);

SELECT 'email_tokens 테이블이 성공적으로 생성되었습니다!' as message;
