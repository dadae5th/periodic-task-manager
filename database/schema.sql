-- 주기별 업무 관리 시스템 데이터베이스 스키마
-- Supabase PostgreSQL용

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 사용자 테이블 (Supabase Auth와 연동)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 업무 테이블
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    assignee VARCHAR(255) NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    frequency_details JSONB NOT NULL DEFAULT '{}',
    due_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 업무 완료 기록 테이블
CREATE TABLE task_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_by VARCHAR(255) NOT NULL,
    notes TEXT
);

-- 알림 설정 테이블
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT TRUE,
    email_time TIME DEFAULT '09:00',
    reminder_hours INTEGER DEFAULT 24,
    weekend_notifications BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id)
);

-- 이메일 발송 로그 테이블
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    recipients TEXT[] NOT NULL,
    success_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    today_tasks_count INTEGER DEFAULT 0,
    overdue_tasks_count INTEGER DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    results JSONB
);

-- Cron 작업 로그 테이블
CREATE TABLE cron_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER,
    total_users INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    today_tasks_count INTEGER DEFAULT 0,
    overdue_tasks_count INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT TRUE,
    error TEXT,
    results JSONB
);

-- 인덱스 생성
CREATE INDEX idx_tasks_assignee ON tasks(assignee);
CREATE INDEX idx_tasks_frequency ON tasks(frequency);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

CREATE INDEX idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX idx_task_completions_completed_at ON task_completions(completed_at);

CREATE INDEX idx_email_logs_type ON email_logs(type);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);

CREATE INDEX idx_cron_logs_type ON cron_logs(type);
CREATE INDEX idx_cron_logs_executed_at ON cron_logs(executed_at);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- tasks 테이블에 updated_at 트리거 설정
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정 (기본적으로 모든 사용자가 접근 가능하도록 설정)
-- 실제 운영 시에는 더 세밀한 권한 설정 필요

-- 사용자 테이블 정책
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (true);

-- 업무 테이블 정책
CREATE POLICY "Users can view all tasks" ON tasks
    FOR SELECT USING (true);

CREATE POLICY "Users can insert tasks" ON tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update tasks" ON tasks
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete tasks" ON tasks
    FOR DELETE USING (true);

-- 업무 완료 기록 정책
CREATE POLICY "Users can view all completions" ON task_completions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert completions" ON task_completions
    FOR INSERT WITH CHECK (true);

-- 알림 설정 정책
CREATE POLICY "Users can view all notification settings" ON notification_settings
    FOR SELECT USING (true);

CREATE POLICY "Users can insert notification settings" ON notification_settings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update notification settings" ON notification_settings
    FOR UPDATE USING (true);

-- 샘플 데이터 삽입
INSERT INTO users (email, name, role) VALUES 
    ('admin@example.com', '관리자', 'admin'),
    ('user@example.com', '사용자', 'user');

-- 샘플 업무 데이터
INSERT INTO tasks (title, description, assignee, frequency, frequency_details, due_date) VALUES 
    (
        '일일 백업 확인', 
        '서버 백업이 정상적으로 완료되었는지 확인',
        'admin@example.com',
        'daily',
        '{}',
        CURRENT_DATE
    ),
    (
        '주간 회의 준비',
        '팀 회의 자료 준비 및 일정 확인',
        'user@example.com',
        'weekly',
        '{"day_of_week": 1}',
        CURRENT_DATE + INTERVAL '1 day'
    ),
    (
        '월간 보고서 작성',
        '월간 업무 진행 상황 보고서 작성',
        'admin@example.com',
        'monthly',
        '{"week_of_month": 1, "day_of_week": 5}',
        CURRENT_DATE + INTERVAL '7 days'
    );

-- 샘플 알림 설정
INSERT INTO notification_settings (user_id, email_enabled, email_time, reminder_hours, weekend_notifications)
SELECT 
    id,
    true,
    '09:00',
    24,
    false
FROM users;

-- 뷰 생성: 업무 통계
CREATE VIEW task_statistics AS
SELECT 
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE completed = true AND DATE(updated_at) = CURRENT_DATE) as completed_today,
    COUNT(*) FILTER (WHERE completed = false AND due_date < CURRENT_DATE) as overdue_tasks,
    COUNT(*) FILTER (WHERE completed = false) as pending_tasks,
    CASE 
        WHEN COUNT(*) > 0 THEN
            ROUND((COUNT(*) FILTER (WHERE completed = true) * 100.0 / COUNT(*)), 1)
        ELSE 0 
    END as completion_rate
FROM tasks;

-- 뷰 생성: 오늘의 업무 (지연된 업무 포함)
CREATE VIEW todays_tasks AS
SELECT 
    t.*,
    CASE 
        WHEN t.completed = false AND t.due_date < CURRENT_DATE THEN true
        ELSE false
    END as is_overdue,
    CASE 
        WHEN t.completed = false AND t.due_date < CURRENT_DATE THEN 
            CURRENT_DATE - t.due_date
        ELSE 0
    END as days_overdue
FROM tasks t
WHERE 
    t.completed = false 
    AND (
        -- 오늘 해야할 일
        t.due_date = CURRENT_DATE 
        -- 또는 지연된 업무
        OR t.due_date < CURRENT_DATE
    )
ORDER BY 
    is_overdue DESC,
    t.due_date ASC,
    t.created_at ASC;

-- 함수: 업무 통계 조회
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
    total_tasks BIGINT,
    completed_today BIGINT,
    overdue_tasks BIGINT,
    pending_tasks BIGINT,
    completion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE t.completed = true AND DATE(t.updated_at) = CURRENT_DATE) as completed_today,
        COUNT(*) FILTER (WHERE t.completed = false AND t.due_date < CURRENT_DATE) as overdue_tasks,
        COUNT(*) FILTER (WHERE t.completed = false) as pending_tasks,
        CASE 
            WHEN COUNT(*) > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE t.completed = true) * 100.0 / COUNT(*)), 1)
            ELSE 0 
        END as completion_rate
    FROM tasks t;
END;
$$ LANGUAGE plpgsql;

-- 함수: 사용자별 오늘의 업무 조회
CREATE OR REPLACE FUNCTION get_user_todays_tasks(user_email TEXT)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    assignee VARCHAR,
    frequency VARCHAR,
    frequency_details JSONB,
    due_date DATE,
    completed BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_overdue BOOLEAN,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        t.description,
        t.assignee,
        t.frequency,
        t.frequency_details,
        t.due_date,
        t.completed,
        t.created_at,
        t.updated_at,
        CASE 
            WHEN t.completed = false AND t.due_date < CURRENT_DATE THEN true
            ELSE false
        END as is_overdue,
        CASE 
            WHEN t.completed = false AND t.due_date < CURRENT_DATE THEN 
                (CURRENT_DATE - t.due_date)::INTEGER
            ELSE 0
        END as days_overdue
    FROM tasks t
    WHERE 
        t.completed = false 
        AND (t.assignee = user_email OR t.assignee = 'all')
        AND (
            -- 오늘 해야할 일 (주기에 따른 계산은 애플리케이션에서 처리)
            t.due_date <= CURRENT_DATE 
        )
    ORDER BY 
        is_overdue DESC,
        t.due_date ASC,
        t.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 데이터베이스 설정 완료 메시지
SELECT 'Supabase 데이터베이스 설정이 완료되었습니다!' as message;
