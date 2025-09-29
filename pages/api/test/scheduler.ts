import { NextApiRequest, NextApiResponse } from 'next'
import TaskScheduler from '@/lib/scheduler'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 현재 날짜부터 7일간의 테스트
    const results = []
    const today = new Date()
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    
    for (let i = 0; i < 7; i++) {
      const testDate = new Date(today)
      testDate.setDate(today.getDate() + i)
      
      const dayName = dayNames[testDate.getDay()]
      
      // 가상의 일간 업무 객체
      const mockTask = {
        id: 'test-daily',
        title: '테스트 일간 업무',
        frequency: 'daily' as const,
        frequency_details: {},
        due_date: testDate.toISOString().split('T')[0],
        assignee: 'test@example.com',
        completed: false,
        description: '테스트용 일간 업무',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const shouldRun = TaskScheduler.shouldRunOnDate(mockTask, testDate)
      
      results.push({
        date: testDate.toISOString().split('T')[0],
        day_name: dayName,
        day_of_week: testDate.getDay(),
        is_weekend: testDate.getDay() === 0 || testDate.getDay() === 6,
        should_run_daily: shouldRun
      })
    }

    // 다음 실행일 테스트
    const nextDailyDate = TaskScheduler.getNextScheduledDate({
      id: 'test',
      title: 'Test',
      frequency: 'daily',
      frequency_details: {},
      due_date: today.toISOString().split('T')[0],
      assignee: 'test@example.com',
      completed: false,
      description: 'Test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, today)

    return res.status(200).json({
      message: '일간 업무 스케줄링 테스트 (주말 제외)',
      current_date: today.toISOString().split('T')[0],
      current_day: dayNames[today.getDay()],
      next_daily_date: {
        date: nextDailyDate.toISOString().split('T')[0],
        day_name: dayNames[nextDailyDate.getDay()]
      },
      test_results: results
    })
  } catch (error) {
    console.error('스케줄링 테스트 오류:', error)
    return res.status(500).json({ 
      error: '테스트 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}
