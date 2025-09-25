import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Tailwind CSS 클래스 병합 유틸리티
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 날짜 포맷팅
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }
  
  return dateObj.toLocaleDateString('ko-KR', defaultOptions)
}

/**
 * 시간 포맷팅
 */
export function formatTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 날짜와 시간 포맷팅
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 상대적 시간 표시 (예: "2시간 전", "3일 후")
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInMs = dateObj.getTime() - now.getTime()
  const diffInSeconds = Math.floor(Math.abs(diffInMs) / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  const isPast = diffInMs < 0

  if (diffInDays > 0) {
    return isPast ? `${diffInDays}일 전` : `${diffInDays}일 후`
  } else if (diffInHours > 0) {
    return isPast ? `${diffInHours}시간 전` : `${diffInHours}시간 후`
  } else if (diffInMinutes > 0) {
    return isPast ? `${diffInMinutes}분 전` : `${diffInMinutes}분 후`
  } else {
    return isPast ? '방금 전' : '곧'
  }
}

/**
 * D-Day 계산 (마감일까지 남은 일수)
 */
export function getDDay(dueDate: string | Date): number {
  const dateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  const today = new Date()
  
  // 시간을 0으로 설정하여 날짜만 비교
  today.setHours(0, 0, 0, 0)
  dateObj.setHours(0, 0, 0, 0)
  
  const diffInMs = dateObj.getTime() - today.getTime()
  return Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
}

/**
 * D-Day 텍스트 포맷팅
 */
export function formatDDay(dueDate: string | Date): string {
  const dDay = getDDay(dueDate)
  
  if (dDay === 0) {
    return 'D-Day'
  } else if (dDay > 0) {
    return `D-${dDay}`
  } else {
    return `D+${Math.abs(dDay)}`
  }
}

/**
 * 이메일 유효성 검사
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 문자열을 슬러그로 변환 (URL 친화적)
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

/**
 * 배열을 청크로 나누기
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * 딜레이 함수 (Promise 기반)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 랜덤 ID 생성
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * 안전한 JSON 파싱
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

/**
 * 파일 크기 포맷팅
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 색상 밝기 계산 (헥스 색상 기준)
 */
export function getColorBrightness(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  
  // YIQ 공식 사용
  return (r * 299 + g * 587 + b * 114) / 1000
}

/**
 * 밝은 색상인지 확인
 */
export function isLightColor(hex: string): boolean {
  return getColorBrightness(hex) > 128
}

/**
 * 객체 깊은 복사
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  
  return obj
}

/**
 * 텍스트 하이라이트 (검색어 강조)
 */
export function highlightText(text: string, query: string): string {
  if (!query) return text
  
  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

/**
 * 페이지네이션 계산
 */
export function calculatePagination(
  currentPage: number,
  totalItems: number,
  itemsPerPage: number
) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems - 1)
  
  return {
    totalPages,
    startIndex,
    endIndex,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
  }
}

/**
 * 환경 변수 확인
 */
export function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name]
  if (!value && !fallback) {
    throw new Error(`환경 변수 ${name}이 설정되지 않았습니다.`)
  }
  return value || fallback || ''
}

/**
 * API 응답 생성 헬퍼
 */
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string
) {
  return {
    success,
    data,
    message,
    error,
    timestamp: new Date().toISOString(),
  }
}

/**
 * 한국 시간대로 변환
 */
export function toKoreanTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Date(dateObj.toLocaleString("en-US", {timeZone: "Asia/Seoul"}))
}

/**
 * 오늘 날짜 (한국 시간)
 */
export function getToday(): Date {
  return toKoreanTime(new Date())
}

/**
 * 내일 날짜 (한국 시간)
 */
export function getTomorrow(): Date {
  const tomorrow = toKoreanTime(new Date())
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow
}
