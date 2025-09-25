export interface Task {
  id: string
  title: string
  description?: string
  assignee: string
  frequency: 'daily' | 'weekly' | 'monthly'
  frequency_details: FrequencyDetails
  due_date: string
  completed: boolean
  created_at: string
  updated_at: string
  is_overdue?: boolean
}

export interface FrequencyDetails {
  // 주간 반복의 경우
  day_of_week?: number // 0: 일요일, 1: 월요일, ..., 6: 토요일
  
  // 월간 반복의 경우
  week_of_month?: number // 1: 첫째주, 2: 둘째주, ..., -1: 마지막주
  
  // 추가 설정
  time?: string // HH:MM 형식
}

export interface TaskCompletion {
  id: string
  task_id: string
  completed_at: string
  completed_by: string
  notes?: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  created_at: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  html_content: string
  text_content: string
  is_active: boolean
}

export interface NotificationSettings {
  id: string
  user_id: string
  email_enabled: boolean
  email_time: string // HH:MM 형식
  reminder_hours: number // 마감 전 몇 시간 전에 알림
  weekend_notifications: boolean
}

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 대시보드 통계 타입
export interface DashboardStats {
  total_tasks: number
  completed_today: number
  overdue_tasks: number
  pending_tasks: number
  completion_rate: number
}

// 이메일 발송 결과 타입
export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  recipient: string
}

// 필터 및 정렬 옵션
export interface TaskFilters {
  assignee?: string
  frequency?: Task['frequency']
  completed?: boolean
  overdue?: boolean
  date_range?: {
    start: string
    end: string
  }
}

export interface SortOptions {
  field: keyof Task
  direction: 'asc' | 'desc'
}
