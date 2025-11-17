/**
 * 한국 시간(KST) 처리 유틸리티 함수들
 * UTC 시간을 한국 시간으로 변환하고 표시
 */

export const KST_OFFSET = 9 * 60 * 60 * 1000 // 9시간을 밀리초로

/**
 * 한국 시간으로 현재 날짜 객체 생성
 */
export function getKSTDate(date?: Date | string): Date {
  const targetDate = date ? new Date(date) : new Date()
  return new Date(targetDate.getTime() + KST_OFFSET)
}

/**
 * 한국 시간 기준 오늘 날짜 문자열 (YYYY-MM-DD)
 */
export function getKSTToday(): string {
  const kstDate = getKSTDate()
  return kstDate.toISOString().split('T')[0]
}

/**
 * 한국 시간 기준 현재 시간 문자열 (ISO format)
 */
export function getKSTNow(): string {
  const kstDate = getKSTDate()
  return kstDate.toISOString()
}

/**
 * 날짜를 한국어 형식으로 포맷 (YYYY년 MM월 DD일)
 */
export function formatKSTDate(date: Date | string): string {
  const kstDate = getKSTDate(date)
  return kstDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Seoul'
  })
}

/**
 * 날짜와 시간을 한국어 형식으로 포맷
 */
export function formatKSTDateTime(date: Date | string): string {
  const kstDate = getKSTDate(date)
  return kstDate.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric', 
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul'
  })
}

/**
 * 날짜를 짧은 한국어 형식으로 포맷 (MM/DD)
 */
export function formatKSTDateShort(date: Date | string): string {
  const kstDate = getKSTDate(date)
  return kstDate.toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Seoul'
  })
}

/**
 * 요일 포함 한국어 날짜 포맷
 */
export function formatKSTDateWithWeekday(date?: Date | string): string {
  const kstDate = getKSTDate(date)
  return kstDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Seoul'
  })
}

/**
 * D-Day 계산 (한국 시간 기준)
 */
export function calculateKSTDDay(targetDate: string): string {
  const today = getKSTDate()
  const target = getKSTDate(targetDate)
  
  // 시간 부분 제거하고 날짜만 비교
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  
  const diffTime = target.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'D-Day'
  if (diffDays > 0) return `D-${diffDays}`
  return `D+${Math.abs(diffDays)}`
}

/**
 * 한국 시간 기준으로 지연 여부 확인
 */
export function isOverdueKST(dueDate: string): boolean {
  const today = getKSTDate()
  const due = getKSTDate(dueDate)
  
  // 시간 부분 제거하고 날짜만 비교
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  
  return due.getTime() < today.getTime()
}

/**
 * 한국 시간 기준으로 오늘 마감 여부 확인
 */
export function isDueTodayKST(dueDate: string): boolean {
  const today = getKSTToday()
  const due = getKSTDate(dueDate).toISOString().split('T')[0]
  return today === due
}
