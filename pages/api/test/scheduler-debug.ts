import type { NextApiRequest, NextApiResponse } from 'next'
import { getTasksByPeriod } from '@/lib/scheduler'
import { createApiResponse } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    // SSL 인증서 우회 설정
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

    // 직접 REST API로 모든 활성 업무 조회
    console.log('스케줄러 디버그: 직접 REST API를 사용하여 tasks 조회...')
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tasks?order=due_date.asc`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const allTasks = await response.json()
    console.log(`스케줄러 디버그: 총 ${allTasks.length}개 업무 조회됨`)
    
    // 기간별 업무 분류
    const { todayTasks, overdueTasks, thisWeekTasks, thisMonthTasks } = getTasksByPeriod(allTasks)
    
    console.log('=== 스케줄러 디버그 결과 ===')
    console.log(`오늘 업무: ${todayTasks.length}개`)
    todayTasks.forEach(task => console.log(`  - ${task.title} (${task.due_date}, ${task.frequency})`))
    
    console.log(`지연 업무: ${overdueTasks.length}개`)
    overdueTasks.forEach(task => console.log(`  - ${task.title} (${task.due_date}, ${task.frequency})`))
    
    console.log(`이번주 업무: ${thisWeekTasks.length}개`)
    thisWeekTasks.forEach(task => console.log(`  - ${task.title} (${task.due_date}, ${task.frequency})`))
    
    console.log(`이번달 업무: ${thisMonthTasks.length}개`)
    thisMonthTasks.forEach(task => console.log(`  - ${task.title} (${task.due_date}, ${task.frequency})`))
    
    // AI Agent 업무 특별 확인
    const aiAgentTask = allTasks.find((task: any) => task.title.includes('AI Agent'))
    if (aiAgentTask) {
      console.log('=== AI Agent 업무 상세 ===')
      console.log(`제목: ${aiAgentTask.title}`)
      console.log(`마감일: ${aiAgentTask.due_date}`)
      console.log(`주기: ${aiAgentTask.frequency}`)
      console.log(`완료 상태: ${aiAgentTask.completed}`)
    }

    return res.status(200).json(createApiResponse(true, {
      all_tasks: allTasks.length,
      today_tasks: todayTasks.length,
      overdue_tasks: overdueTasks.length,
      this_week_tasks: thisWeekTasks.length,
      this_month_tasks: thisMonthTasks.length,
      today: todayTasks.map(t => ({ title: t.title, due_date: t.due_date, frequency: t.frequency })),
      overdue: overdueTasks.map(t => ({ title: t.title, due_date: t.due_date, frequency: t.frequency })),
      this_week: thisWeekTasks.map(t => ({ title: t.title, due_date: t.due_date, frequency: t.frequency })),
      this_month: thisMonthTasks.map(t => ({ title: t.title, due_date: t.due_date, frequency: t.frequency })),
      ai_agent_task: aiAgentTask ? {
        title: aiAgentTask.title,
        due_date: aiAgentTask.due_date,
        frequency: aiAgentTask.frequency,
        completed: aiAgentTask.completed
      } : null
    }))

  } catch (error) {
    console.error('스케줄러 디버그 실패:', error)
    return res.status(500).json(
      createApiResponse(false, null, '디버그 실패', error instanceof Error ? error.message : String(error))
    )
  }
}
