import { Task, FrequencyDetails } from '@/types'

/**
 * 주기별 업무 스케줄링 유틸리티
 */
export class TaskScheduler {
  /**
   * 주어진 날짜에 실행되어야 하는 업무 필터링
   */
  static getTasksForDate(tasks: Task[], targetDate: Date): Task[] {
    return tasks.filter(task => this.shouldRunOnDate(task, targetDate))
  }

  /**
   * 특정 업무가 특정 날짜에 실행되어야 하는지 확인
   */
  static shouldRunOnDate(task: Task, targetDate: Date): boolean {
    const { frequency, frequency_details } = task

    switch (frequency) {
      case 'daily':
        return this.shouldRunDaily(targetDate)

      case 'weekly':
        return this.shouldRunWeekly(frequency_details, targetDate)

      case 'monthly':
        return this.shouldRunMonthly(frequency_details, targetDate)

      default:
        return false
    }
  }

  /**
   * 일간 업무 체크 (매일 실행)
   */
  private static shouldRunDaily(targetDate: Date): boolean {
    return true // 매일 실행
  }

  /**
   * 주간 업무 체크
   */
  private static shouldRunWeekly(
    frequencyDetails: FrequencyDetails,
    targetDate: Date
  ): boolean {
    const { day_of_week } = frequencyDetails

    if (day_of_week === undefined) {
      return false
    }

    // JavaScript Date.getDay(): 0=일요일, 1=월요일, ..., 6=토요일
    return targetDate.getDay() === day_of_week
  }

  /**
   * 월간 업무 체크
   */
  private static shouldRunMonthly(
    frequencyDetails: FrequencyDetails,
    targetDate: Date
  ): boolean {
    const { week_of_month, day_of_week } = frequencyDetails

    if (week_of_month === undefined || day_of_week === undefined) {
      return false
    }

    // 해당 요일인지 먼저 확인
    if (targetDate.getDay() !== day_of_week) {
      return false
    }

    // 해당 월에서 몇 번째 주인지 계산
    const weekOfMonth = this.getWeekOfMonth(targetDate)

    // 마지막 주 처리 (week_of_month가 -1인 경우)
    if (week_of_month === -1) {
      return this.isLastWeekOfMonth(targetDate, day_of_week)
    }

    return weekOfMonth === week_of_month
  }

  /**
   * 월에서 몇 번째 주인지 계산
   */
  private static getWeekOfMonth(date: Date): number {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    const firstWeekday = firstDay.getDay()
    const dayOfMonth = date.getDate()

    // 첫 번째 주의 시작점 계산
    const firstWeekStart = 1 - firstWeekday
    
    // 몇 번째 주인지 계산
    return Math.ceil((dayOfMonth - firstWeekStart) / 7)
  }

  /**
   * 해당 월의 마지막 주 해당 요일인지 확인
   */
  private static isLastWeekOfMonth(date: Date, dayOfWeek: number): boolean {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    // 다음 달 첫날
    const nextMonth = new Date(year, month + 1, 1)
    
    // 이번 달 마지막 날
    const lastDay = new Date(nextMonth.getTime() - 1)
    
    // 마지막 주의 해당 요일 찾기
    let lastOccurrence = lastDay
    while (lastOccurrence.getDay() !== dayOfWeek) {
      lastOccurrence = new Date(lastOccurrence.getTime() - 24 * 60 * 60 * 1000)
    }

    return date.toDateString() === lastOccurrence.toDateString()
  }

  /**
   * 업무의 다음 실행 예정일 계산
   */
  static getNextScheduledDate(task: Task, fromDate: Date = new Date()): Date {
    const { frequency, frequency_details } = task

    switch (frequency) {
      case 'daily':
        return this.getNextDailyDate(fromDate)

      case 'weekly':
        return this.getNextWeeklyDate(frequency_details, fromDate)

      case 'monthly':
        return this.getNextMonthlyDate(frequency_details, fromDate)

      default:
        return fromDate
    }
  }

  /**
   * 다음 일간 실행일 (내일)
   */
  private static getNextDailyDate(fromDate: Date): Date {
    const nextDate = new Date(fromDate)
    nextDate.setDate(nextDate.getDate() + 1)
    return nextDate
  }

  /**
   * 다음 주간 실행일
   */
  private static getNextWeeklyDate(
    frequencyDetails: FrequencyDetails,
    fromDate: Date
  ): Date {
    const { day_of_week } = frequencyDetails

    if (day_of_week === undefined) {
      return fromDate
    }

    const nextDate = new Date(fromDate)
    const currentDay = nextDate.getDay()
    
    let daysToAdd = day_of_week - currentDay
    if (daysToAdd <= 0) {
      daysToAdd += 7 // 다음 주
    }

    nextDate.setDate(nextDate.getDate() + daysToAdd)
    return nextDate
  }

  /**
   * 다음 월간 실행일
   */
  private static getNextMonthlyDate(
    frequencyDetails: FrequencyDetails,
    fromDate: Date
  ): Date {
    const { week_of_month, day_of_week } = frequencyDetails

    if (week_of_month === undefined || day_of_week === undefined) {
      return fromDate
    }

    let nextDate = new Date(fromDate)
    nextDate.setMonth(nextDate.getMonth() + 1) // 다음 달

    // 다음 달의 해당 주, 해당 요일 찾기
    const targetDate = this.findDateInMonth(
      nextDate.getFullYear(),
      nextDate.getMonth(),
      week_of_month,
      day_of_week
    )

    return targetDate || nextDate
  }

  /**
   * 특정 월의 특정 주, 특정 요일 찾기
   */
  private static findDateInMonth(
    year: number,
    month: number,
    weekOfMonth: number,
    dayOfWeek: number
  ): Date | null {
    // 마지막 주인 경우
    if (weekOfMonth === -1) {
      const lastDay = new Date(year, month + 1, 0) // 해당 월의 마지막 날
      let targetDate = lastDay
      
      while (targetDate.getDay() !== dayOfWeek) {
        targetDate = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000)
      }
      
      return targetDate
    }

    // 일반적인 주차
    const firstDay = new Date(year, month, 1)
    let targetDate = new Date(firstDay)

    // 첫 번째 해당 요일 찾기
    while (targetDate.getDay() !== dayOfWeek) {
      targetDate.setDate(targetDate.getDate() + 1)
    }

    // 해당 주차로 이동
    targetDate.setDate(targetDate.getDate() + (weekOfMonth - 1) * 7)

    // 해당 월을 벗어났는지 확인
    if (targetDate.getMonth() !== month) {
      return null
    }

    return targetDate
  }

  /**
   * 지연된 업무 확인
   */
  static getOverdueTasks(tasks: Task[], currentDate: Date = new Date()): Task[] {
    return tasks
      .filter(task => !task.completed)
      .filter(task => {
        const dueDate = new Date(task.due_date)
        const today = new Date(currentDate)
        today.setHours(0, 0, 0, 0)
        dueDate.setHours(0, 0, 0, 0)
        
        return dueDate < today
      })
      .map(task => ({
        ...task,
        is_overdue: true
      }))
  }

  /**
   * 주기 설명 텍스트 생성
   */
  static getFrequencyDescription(
    frequency: Task['frequency'],
    frequencyDetails: FrequencyDetails
  ): string {
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    
    switch (frequency) {
      case 'daily':
        return '매일'

      case 'weekly':
        const dayName = frequencyDetails.day_of_week !== undefined 
          ? dayNames[frequencyDetails.day_of_week] 
          : '?'
        return `매주 ${dayName}`

      case 'monthly':
        const dayName2 = frequencyDetails.day_of_week !== undefined 
          ? dayNames[frequencyDetails.day_of_week] 
          : '?'
        
        if (frequencyDetails.week_of_month === -1) {
          return `매월 마지막주 ${dayName2}`
        }
        
        const weekNames = ['', '첫째', '둘째', '셋째', '넷째', '다섯째']
        const weekName = frequencyDetails.week_of_month !== undefined 
          ? weekNames[frequencyDetails.week_of_month] 
          : '?'
        
        return `매월 ${weekName}주 ${dayName2}`

      default:
        return '알 수 없음'
    }
  }

  /**
   * 업무 생성 시 첫 번째 마감일 계산
   */
  static calculateFirstDueDate(
    frequency: Task['frequency'],
    frequencyDetails: FrequencyDetails,
    createDate: Date = new Date()
  ): Date {
    switch (frequency) {
      case 'daily':
        // 일간: 오늘 또는 내일
        return createDate

      case 'weekly':
        // 주간: 이번 주 해당 요일 또는 다음 주 해당 요일
        const { day_of_week } = frequencyDetails
        if (day_of_week === undefined) return createDate

        const today = createDate.getDay()
        let daysToAdd = day_of_week - today

        if (daysToAdd < 0) {
          daysToAdd += 7 // 다음 주
        }

        const dueDate = new Date(createDate)
        dueDate.setDate(dueDate.getDate() + daysToAdd)
        return dueDate

      case 'monthly':
        // 월간: 이번 달 해당일 또는 다음 달 해당일
        return this.getNextMonthlyDate(frequencyDetails, createDate)

      default:
        return createDate
    }
  }
}

/**
 * 현재 시간 기준 오늘 해야할 일과 지연된 업무 가져오기
 */
export function getTodayTasksAndOverdue(tasks: Task[]): {
  todayTasks: Task[]
  overdueTasks: Task[]
} {
  const today = new Date()
  
  // 오늘 해야할 일
  const todayTasks = TaskScheduler.getTasksForDate(
    tasks.filter(task => !task.completed),
    today
  )

  // 지연된 업무
  const overdueTasks = TaskScheduler.getOverdueTasks(tasks, today)

  return { todayTasks, overdueTasks }
}

export default TaskScheduler
