import { Task, FrequencyDetails } from '@/types'
import { getKSTDate, isOverdueKST, isDueTodayKST } from './kst-utils'

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
      case 'once':
        return this.shouldRunOnce(task, targetDate)

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
   * 일회성 업무 체크 (마감일이 오늘인 경우에만)
   */
  private static shouldRunOnce(task: Task, targetDate: Date): boolean {
    const dueDate = new Date(task.due_date)
    const target = new Date(targetDate)
    
    // 날짜만 비교 (시간 제외)
    return dueDate.toDateString() === target.toDateString()
  }

  /**
   * 일간 업무 체크 (평일에만 실행)
   */
  private static shouldRunDaily(targetDate: Date): boolean {
    const dayOfWeek = targetDate.getDay() // 0: 일요일, 6: 토요일
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    return !isWeekend // 주말이 아닌 경우에만 실행
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
   * 다음 일간 실행일 (주말 제외)
   */
  private static getNextDailyDate(fromDate: Date): Date {
    const nextDate = new Date(fromDate)
    nextDate.setDate(nextDate.getDate() + 1)
    
    // 주말인 경우 다음 평일로 이동
    while (true) {
      const dayOfWeek = nextDate.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      
      if (!isWeekend) {
        break // 평일이면 중단
      }
      
      nextDate.setDate(nextDate.getDate() + 1) // 하루 더 추가
    }
    
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
        return '매일 (평일만)'

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
        // 일간: 오늘이 평일이면 오늘, 주말이면 다음 평일
        const todayDayOfWeek = createDate.getDay()
        const isTodayWeekend = todayDayOfWeek === 0 || todayDayOfWeek === 6
        
        if (!isTodayWeekend) {
          return createDate // 오늘이 평일이면 오늘
        } else {
          return this.getNextDailyDate(createDate) // 주말이면 다음 평일
        }

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
 * 현재 시간 기준 오늘 해야할 일과 지연된 업무 가져오기 (한국 시간 기준)
 */
export function getTodayTasksAndOverdue(tasks: Task[]): {
  todayTasks: Task[]
  overdueTasks: Task[]
} {
  const today = getKSTDate() // 한국 시간 사용
  
  // 오늘 해야할 일
  const todayTasks = TaskScheduler.getTasksForDate(
    tasks.filter(task => !task.completed),
    today
  )

  // 지연된 업무 (한국 시간 기준)
  const overdueTasks = tasks
    .filter(task => !task.completed)
    .filter(task => isOverdueKST(task.due_date))
    .map(task => ({
      ...task,
      is_overdue: true
    }))

  return { todayTasks, overdueTasks }
}

/**
 * 이번주, 이번달 업무까지 포함한 분류 함수
 */
export function getTasksByPeriod(tasks: Task[]): {
  todayTasks: Task[]
  overdueTasks: Task[]
  thisWeekTasks: Task[]
  thisMonthTasks: Task[]
} {
  const today = new Date()
  const activeTasks = tasks.filter(task => !task.completed)
  
  // 오늘 해야할 일
  const todayTasks = TaskScheduler.getTasksForDate(activeTasks, today)
  
  // 지연된 업무
  const overdueTasks = TaskScheduler.getOverdueTasks(tasks, today)
  
  // 이번 주 업무 (오늘 제외, 매일 업무 제외)
  const thisWeekTasks: Task[] = []
  const thisWeekStart = getWeekStart(today)
  const thisWeekEnd = getWeekEnd(today)
  
  // 주기적 업무 처리
  for (let d = new Date(thisWeekStart); d <= thisWeekEnd; d.setDate(d.getDate() + 1)) {
    if (d.toDateString() !== today.toDateString()) { // 오늘 제외
      const dayTasks = TaskScheduler.getTasksForDate(activeTasks, new Date(d))
        .filter(task => task.frequency !== 'daily') // 매일 업무 제외
      dayTasks.forEach(task => {
        if (!thisWeekTasks.find(existing => existing.id === task.id)) {
          thisWeekTasks.push(task)
        }
      })
    }
  }
  
  // 마감일 기준 이번주 업무 추가
  activeTasks.forEach(task => {
    const dueDate = new Date(task.due_date)
    if (dueDate >= thisWeekStart && dueDate <= thisWeekEnd && 
        dueDate.toDateString() !== today.toDateString() && // 오늘 제외
        task.frequency !== 'daily' && // 매일 업무 제외
        !thisWeekTasks.find(existing => existing.id === task.id) &&
        !overdueTasks.find(existing => existing.id === task.id)) { // 지연 업무 제외
      thisWeekTasks.push(task)
    }
  })
  
  // 이번 달 업무 (오늘, 이번주 제외, 매일 업무 제외)
  const thisMonthTasks: Task[] = []
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  
  // 주기적 업무 처리
  for (let d = new Date(thisMonthStart); d <= thisMonthEnd; d.setDate(d.getDate() + 1)) {
    if (d < thisWeekStart || d > thisWeekEnd) { // 이번주 제외
      const dayTasks = TaskScheduler.getTasksForDate(activeTasks, new Date(d))
        .filter(task => task.frequency !== 'daily') // 매일 업무 제외
      dayTasks.forEach(task => {
        if (!thisMonthTasks.find(existing => existing.id === task.id)) {
          thisMonthTasks.push(task)
        }
      })
    }
  }
  
  // 마감일 기준 이번달 업무 추가
  activeTasks.forEach(task => {
    const dueDate = new Date(task.due_date)
    if (dueDate >= thisMonthStart && dueDate <= thisMonthEnd && 
        (dueDate < thisWeekStart || dueDate > thisWeekEnd) && // 이번주 제외
        dueDate.toDateString() !== today.toDateString() && // 오늘 제외
        task.frequency !== 'daily' && // 매일 업무 제외
        !thisMonthTasks.find(existing => existing.id === task.id) &&
        !overdueTasks.find(existing => existing.id === task.id)) { // 지연 업무 제외
      thisMonthTasks.push(task)
    }
  })
  
  // 날짜순 정렬
  thisWeekTasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
  thisMonthTasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
  
  return { todayTasks, overdueTasks, thisWeekTasks, thisMonthTasks }
}

/**
 * 주의 시작일 (월요일) 구하기
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 월요일부터 시작
  return new Date(d.setDate(diff))
}

/**
 * 주의 마지막일 (일요일) 구하기
 */
function getWeekEnd(date: Date): Date {
  const d = getWeekStart(date)
  return new Date(d.setDate(d.getDate() + 6))
}

/**
 * 만료된 일회성 업무 필터링 (마감일이 지난 일회성 업무 제외) - 한국 시간 기준
 */
export function filterExpiredOnceTasks(tasks: Task[]): Task[] {
  return tasks.filter(task => {
    // 일회성 업무가 아니면 통과
    if (task.frequency !== 'once') {
      return true
    }
    
    // 완료된 일회성 업무는 통과 (완료 기록 보존)
    if (task.completed) {
      return true
    }
    
    // 일회성 업무이고 미완료인 경우, 마감일 확인 (한국 시간 기준)
    return !isOverdueKST(task.due_date)
  })
}

export default TaskScheduler
