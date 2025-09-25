import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse, getToday } from '@/lib/utils'
import { getEmailService } from '@/lib/email'
import { TaskScheduler, getTodayTasksAndOverdue } from '@/lib/scheduler'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  return handleSendDaily(req, res)
}

/**
 * 일일 업무 이메일 발송
 */
async function handleSendDaily(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { recipients, test_mode = false } = req.body

    // 수신자 목록 검증
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json(
        createApiResponse(false, null, '수신자 목록이 필요합니다.')
      )
    }

    // 모든 활성 업무 조회
    const { data: allTasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true })

    if (tasksError) {
      console.error('업무 조회 실패:', tasksError)
      return res.status(500).json(
        createApiResponse(false, null, '업무 조회에 실패했습니다.', tasksError.message)
      )
    }

    const tasks = allTasks || []
    const today = getToday()

    // 오늘 해야할 일과 지연된 업무 분류
    const { todayTasks, overdueTasks } = getTodayTasksAndOverdue(tasks)

    // 이메일 서비스 초기화
    const emailService = getEmailService()

    // 연결 테스트
    const isConnected = await emailService.testConnection()
    if (!isConnected) {
      return res.status(500).json(
        createApiResponse(false, null, '이메일 서비스에 연결할 수 없습니다.')
      )
    }

    // 각 수신자에게 이메일 발송
    const results = []
    
    for (const recipient of recipients) {
      if (typeof recipient !== 'string' || !recipient.includes('@')) {
        results.push({
          recipient,
          success: false,
          error: '유효하지 않은 이메일 주소'
        })
        continue
      }

      try {
        // 담당자별 업무 필터링 (선택사항)
        const recipientTodayTasks = todayTasks.filter(task => 
          task.assignee === recipient || task.assignee === 'all' || !task.assignee
        )
        
        const recipientOverdueTasks = overdueTasks.filter(task => 
          task.assignee === recipient || task.assignee === 'all' || !task.assignee
        )

        const result = await emailService.sendDailyTaskEmail(
          recipient,
          recipientTodayTasks,
          recipientOverdueTasks
        )

        results.push(result)

        // 테스트 모드가 아닌 경우에만 딜레이 (API 제한 방지)
        if (!test_mode && results.length < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1초 딜레이
        }
      } catch (error) {
        console.error(`${recipient}에게 이메일 발송 실패:`, error)
        results.push({
          recipient,
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        })
      }
    }

    // 발송 결과 집계
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    // 발송 로그 저장 (선택사항)
    if (!test_mode) {
      try {
        await (supabaseAdmin as any)
          .from('email_logs')
          .insert([{
            recipient: recipients.join(','),
            subject: '일일 업무 알림',
            type: 'daily_tasks',
            success: successCount > 0,
            task_count: todayTasks.length,
            overdue_count: overdueTasks.length,
            sent_at: new Date().toISOString()
          }])
      } catch (logError) {
        console.error('이메일 로그 저장 실패:', logError)
        // 로그 저장 실패는 치명적이지 않음
      }
    }

    return res.status(200).json(
      createApiResponse(true, {
        summary: {
          total_recipients: recipients.length,
          success_count: successCount,
          fail_count: failCount,
          today_tasks: todayTasks.length,
          overdue_tasks: overdueTasks.length
        },
        results: results,
        test_mode
      }, `이메일 발송 완료: ${successCount}/${recipients.length} 성공`)
    )
  } catch (error) {
    console.error('일일 이메일 발송 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}
