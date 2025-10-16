-- 3단계: RLS 정책 설정
ALTER TABLE email_tokens ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Allow all operations on email_tokens" ON email_tokens;

-- 새 정책 생성
CREATE POLICY "Allow all operations on email_tokens" ON email_tokens
    FOR ALL USING (true);
