import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'
import { getEmailService } from '@/lib/email'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    // 기본 수신자
    const recipients = ['bae.jae.kwon@drbworld.com']

    // 모든 업무 조회
    const { data: allTasks, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true })

    if (error) {
      console.error('업무 조회 실패:', error)
      return res.status(500).json(createApiResponse(false, null, '업무 조회 실패'))
    }

    const today = new Date().toISOString().split('T')[0]
    
    // 오늘 할 일과 지연된 업무 분류
    const todayTasks = allTasks.filter(task => 
      task.due_date === today && !task.completed
    )
    
    const overdueTasks = allTasks.filter(task => 
      task.due_date < today && !task.completed
    )

    console.log(`오늘 업무: ${todayTasks.length}개, 지연 업무: ${overdueTasks.length}개`)

    // 이메일 발송
    const emailService = getEmailService()
    const results = []

    for (const recipient of recipients) {
      try {
        const result = await emailService.sendDailyTaskEmail(
          recipient,
          todayTasks,
          overdueTasks
        )
        results.push(result)
      } catch (error) {
        console.error(`${recipient}에게 이메일 발송 실패:`, error)
        results.push({
          recipient,
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        })
      }
    }

    const successCount = results.filter(r => r.success).length

    return res.status(200).json(
      createApiResponse(true, {
        summary: {
          total_recipients: recipients.length,
          success_count: successCount,
          fail_count: recipients.length - successCount,
          today_tasks: todayTasks.length,
          overdue_tasks: overdueTasks.length
        },
        results
      })
    )
  } catch (error) {
    console.error('일일 이메일 발송 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}
