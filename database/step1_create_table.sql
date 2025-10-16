-- 간단한 email_tokens 테이블 생성 (단계별 실행)

-- 1단계: 테이블 생성 (이미 존재하면 건너뜀)
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
