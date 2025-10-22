-- 주기별 업무 관리 시스템 통합 스키마
-- 이 파일 하나로 모든 테이블, 인덱스, 정책을 생성합니다.

-- 1. 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 업무 테이블
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assignee TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly')),
  frequency_details JSONB DEFAULT '{}',
  due_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 업무 완료 기록 테이블
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_by TEXT NOT NULL
);

-- 4. 이메일 자동 로그인 토큰 테이블
CREATE TABLE IF NOT EXISTS email_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT DEFAULT 'user',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE
);

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_frequency ON tasks(frequency);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_at ON task_completions(completed_at);
CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires_at ON email_tokens(expires_at);

-- 6. Row Level Security (RLS) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tokens ENABLE ROW LEVEL SECURITY;

-- 7. RLS 정책 (모든 사용자가 모든 데이터에 접근 가능하도록 설정)
CREATE POLICY "모든 사용자 접근 허용" ON users FOR ALL USING (true);
CREATE POLICY "모든 사용자 접근 허용" ON tasks FOR ALL USING (true);
CREATE POLICY "모든 사용자 접근 허용" ON task_completions FOR ALL USING (true);
CREATE POLICY "모든 사용자 접근 허용" ON email_tokens FOR ALL USING (true);

-- 8. 기본 관리자 사용자 생성 (존재하지 않는 경우에만)
INSERT INTO users (email, name, password, role) 
VALUES ('bae.jae.kwon@drbworld.com', '배재권', 'test123', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 9. 샘플 업무 데이터 (개발/테스트용)
INSERT INTO tasks (title, description, assignee, frequency, due_date) VALUES
('📊 일일 매출 보고서 작성', '전날 매출 데이터를 정리하고 보고서를 작성합니다.', 'bae.jae.kwon@drbworld.com', 'daily', CURRENT_DATE),
('📧 주간 뉴스레터 발송', '회사 소식과 업계 트렌드를 담은 주간 뉴스레터를 작성하고 발송합니다.', 'bae.jae.kwon@drbworld.com', 'weekly', CURRENT_DATE + INTERVAL '1 day'),
('💰 월간 예산 검토', '이번 달 예산 사용 현황을 검토하고 다음 달 계획을 수립합니다.', 'bae.jae.kwon@drbworld.com', 'monthly', CURRENT_DATE + INTERVAL '2 days'),
('🔧 시스템 백업 확인', '데이터베이스와 파일 시스템의 백업 상태를 확인합니다.', 'bae.jae.kwon@drbworld.com', 'daily', CURRENT_DATE - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- 완료
SELECT 'Database schema setup completed successfully!' as status;
