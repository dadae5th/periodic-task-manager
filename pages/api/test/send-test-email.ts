import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiResponse } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 하드코딩된 테스트 업무들 - Supabase 없이도 테스트 가능
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const testTasks = [
      {
        id: 'test-1',
        title: '📊 일일 매출 보고서 작성',
        description: '전날 매출 데이터를 정리하고 보고서를 작성합니다.',
        assignee: 'bae.jae.kwon@drbworld.com',
        frequency: 'daily' as const,
        frequency_details: {},
        due_date: today.toISOString().split('T')[0],
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test-2',
        title: '📧 고객 문의 답변',
        description: '접수된 고객 문의사항에 대한 답변을 작성합니다.',
        assignee: 'bae.jae.kwon@drbworld.com',
        frequency: 'daily' as const,
        frequency_details: {},
        due_date: today.toISOString().split('T')[0],
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test-3',
        title: '🔍 시스템 상태 점검 (지연)',
        description: '서버 상태 및 시스템 로그를 확인합니다.',
        assignee: 'bae.jae.kwon@drbworld.com',
        frequency: 'daily' as const,
        frequency_details: {},
        due_date: yesterday.toISOString().split('T')[0],
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    // 이메일 서비스 직접 호출
    const { getEmailService } = await import('@/lib/email')
    const emailService = getEmailService()
    
    // 오늘 업무와 지연 업무 분리
    const todayTasks = testTasks.filter(task => task.due_date === today.toISOString().split('T')[0])
    const overdueTasks = testTasks.filter(task => task.due_date === yesterday.toISOString().split('T')[0])

    console.log('오늘 업무:', todayTasks.length, '개')
    console.log('지연 업무:', overdueTasks.length, '개')

    // 테스트 이메일 발송
    const result = await emailService.sendDailyTaskEmail(
      'bae.jae.kwon@drbworld.com',
      todayTasks,
      overdueTasks
    )

    return res.status(200).json(
      createApiResponse(true, {
        email_result: result,
        test_data: {
          today_tasks: todayTasks.length,
          overdue_tasks: overdueTasks.length,
          tasks: testTasks
        }
      }, '테스트 이메일 발송 완료')
    )
  } catch (error) {
    console.error('테스트 이메일 발송 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '테스트 이메일 발송 실패', 
        error instanceof Error ? error.message : '알 수 없는 오류')
    )
  }
}
