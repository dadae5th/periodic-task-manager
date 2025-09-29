import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiResponse } from '@/lib/utils'
import { Task } from '@/types'

// 직접 Supabase REST API 호출하는 함수
async function callSupabaseAPI(endpoint: string, options: any = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const url = `${supabaseUrl}/rest/v1/${endpoint}`
  
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Supabase API Error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    console.log('Tasks API called:', new Date().toISOString(), req.method)
    console.log('직접 REST API를 사용하여 tasks 조회...')

    // tasks 조회
    const tasks = await callSupabaseAPI('tasks?order=created_at.asc')
    
    console.log(`총 ${tasks.length}개 업무 조회됨`)

    // 기본 통계 계산
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    const totalTasks = tasks.length
    const overdueTasks = tasks.filter((task: Task) => 
      !task.completed && new Date(task.due_date) < now
    ).length
    const pendingTasks = tasks.filter((task: Task) => !task.completed).length
    
    // 오늘 완료된 업무 수
    const completedToday = tasks.filter((task: Task) => {
      const completedDate = task.updated_at ? new Date(task.updated_at).toISOString().split('T')[0] : null
      return task.completed && completedDate === today
    }).length

    // 완료율 계산
    const completionRate = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0

    const stats = {
      total_tasks: totalTasks,
      completed_today: completedToday,
      overdue_tasks: overdueTasks,
      pending_tasks: pendingTasks,
      completion_rate: completionRate,
      today_tasks: tasks.filter((task: Task) => task.due_date === today).length,
      today_completion_rate: completionRate
    }

    console.log('통계 계산 완료:', stats)

    return res.status(200).json(
      createApiResponse(true, { 
        tasks: tasks, 
        count: tasks.length,
        stats: stats
      }, `${tasks.length}개 업무를 조회했습니다.`)
    )

  } catch (error) {
    console.error('Tasks API 오류:', error)
    
    // 에러 발생시 Mock 데이터 반환
    console.log('에러 발생으로 Mock 데이터 반환')
    const mockTasks = [
      {
        id: 'mock-1',
        title: '일일 시스템 점검',
        description: '서버 상태 및 성능 모니터링',
        assignee: 'bae.jae.kwon@drbworld.com',
        frequency: 'daily',
        due_date: new Date().toISOString().split('T')[0],
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-2',
        title: '주간 보고서 작성',
        description: '업무 현황 및 성과 정리',
        assignee: 'bae.jae.kwon@drbworld.com',
        frequency: 'weekly',
        due_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 어제 날짜 (지연된 업무)
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-3',
        title: '데이터베이스 백업',
        description: '중요 데이터 백업 및 검증',
        assignee: 'bae.jae.kwon@drbworld.com',
        frequency: 'daily',
        due_date: new Date().toISOString().split('T')[0],
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
    
    return res.status(200).json(createApiResponse(true, { 
      tasks: mockTasks, 
      count: mockTasks.length,
      stats: {
        total_tasks: 3,
        completed_today: 0,
        overdue_tasks: 1,
        pending_tasks: 3,
        completion_rate: 0,
        today_tasks: 2,
        today_completion_rate: 0
      }
    }, 'Mock 데이터를 반환했습니다.'))
  }
}
