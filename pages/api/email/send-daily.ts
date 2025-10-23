import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'
import { getEmailService } from '@/lib/email'
import { Task } from '@/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    console.log('이메일 발송 API 호출됨')

    // 모든 업무 조회
    console.log('업무 데이터 조회 시작...')
    const { data: allTasks, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true })

    if (error) {
      console.error('업무 조회 실패:', error)
      return res.status(500).json(createApiResponse(false, null, '업무 조회 실패', error.message))
    }

    console.log(`총 ${allTasks?.length || 0}개 업무 조회됨`)

    const today = new Date().toISOString().split('T')[0]
    const tasks = (allTasks || []) as Task[]
    
    // 오늘 할 일과 지연된 업무 분류
    const todayTasks = tasks.filter(task => 
      task.due_date === today && !task.completed
    )
    
    const overdueTasks = tasks.filter(task => 
      task.due_date < today && !task.completed
    )

    console.log(`오늘 업무: ${todayTasks.length}개, 지연 업무: ${overdueTasks.length}개`)

    // 담당자별로 업무 그룹화
    const assigneeTaskMap: Record<string, { today: Task[], overdue: Task[] }> = {}
    
    // 오늘 업무를 담당자별로 분류
    todayTasks.forEach(task => {
      if (task.assignee) {
        if (!assigneeTaskMap[task.assignee]) {
          assigneeTaskMap[task.assignee] = { today: [], overdue: [] }
        }
        assigneeTaskMap[task.assignee].today.push(task)
      }
    })
    
    // 지연 업무를 담당자별로 분류
    overdueTasks.forEach(task => {
      if (task.assignee) {
        if (!assigneeTaskMap[task.assignee]) {
          assigneeTaskMap[task.assignee] = { today: [], overdue: [] }
        }
        assigneeTaskMap[task.assignee].overdue.push(task)
      }
    })

    // 이메일 발송
    console.log('이메일 서비스 초기화 중...')
    const emailService = getEmailService()
    const results = []
    const assignees = Object.keys(assigneeTaskMap)

    console.log(`총 ${assignees.length}명의 담당자에게 개별 이메일 발송`)

    for (const assignee of assignees) {
      try {
        const assigneeTasks = assigneeTaskMap[assignee]
        console.log(`${assignee}에게 이메일 발송 시작... (오늘: ${assigneeTasks.today.length}개, 지연: ${assigneeTasks.overdue.length}개)`)
        
        const result = await emailService.sendDailyTaskEmail(
          assignee,
          assigneeTasks.today,
          assigneeTasks.overdue
        )
        console.log(`${assignee} 발송 결과:`, result.success ? '성공' : '실패')
        results.push({
          ...result,
          recipient: assignee
        })
      } catch (error) {
        console.error(`${assignee}에게 이메일 발송 실패:`, error)
        results.push({
          recipient: assignee,
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`이메일 발송 완료: ${successCount}/${assignees.length} 성공`)

    return res.status(200).json(
      createApiResponse(true, {
        summary: {
          total_recipients: assignees.length,
          success_count: successCount,
          fail_count: assignees.length - successCount,
          today_tasks: todayTasks.length,
          overdue_tasks: overdueTasks.length
        },
        results
      })
    )
  } catch (error) {
    console.error('일일 이메일 발송 중 전체 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.', error instanceof Error ? error.message : String(error))
    )
  }
}
