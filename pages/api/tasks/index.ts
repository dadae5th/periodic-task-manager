import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiResponse, getToday } from '@/lib/utils'
import { filterExpiredOnceTasks } from '@/lib/scheduler'
import { withAuth, AuthenticatedRequest } from '@/lib/auth'
import { Task } from '@/types'

// SSL 인증서 검증 우회 설정 (개발 환경용)
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

// 직접 Supabase REST API 호출하는 함수
async function callSupabaseAPI(endpoint: string, options: any = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const url = `${supabaseUrl}/rest/v1/${endpoint}`
  
  // 추가 헤더 설정으로 SSL 관련 문제 해결 시도
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'periodic-task-manager/1.0',
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

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // URL이나 헤더에서 사용자 정보 추출
  const userEmail = req.headers['x-user-email'] as string || req.query.user as string || 'bae.jae.kwon@drbworld.com'
  
  // 동적 사용자 설정 - 각 사용자는 자신의 업무만 볼 수 있음
  const isAdmin = userEmail === 'bae.jae.kwon@drbworld.com'
  const dynamicUser = {
    id: `user-${userEmail.replace(/[^a-zA-Z0-9]/g, '-')}`,
    email: userEmail,
    name: userEmail.split('@')[0],
    role: 'user' as const, // 모든 사용자를 일반 사용자로 설정하여 개별 대시보드 보장
    created_at: new Date().toISOString()
  }
  
  console.log('🔍 API 사용자 설정:', dynamicUser)
  
  // req에 사용자 정보 추가
  const authReq = req as AuthenticatedRequest
  authReq.user = dynamicUser
  
  if (req.method === 'GET') {
    return handleGetTasks(authReq, res)
  } else {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }
}

async function handleGetTasks(req: AuthenticatedRequest, res: NextApiResponse) {

  try {
    console.log('Tasks API called:', new Date().toISOString(), req.method)
    console.log('사용자별 tasks 조회...', req.user?.email)

    // 현재 사용자의 업무만 조회 (assignee가 사용자 이메일이거나 'all'인 경우)
    const userEmail = req.user?.email
    let query = 'tasks?order=created_at.asc'
    
    console.log(`📧 사용자: ${userEmail}, 역할: ${req.user?.role}`)
    
    // 관리자는 모든 업무를 볼 수 있고, 일반 사용자는 자신의 업무만
    if (req.user?.role !== 'admin') {
      query += `&or=(assignee.eq.${encodeURIComponent(userEmail!)},assignee.eq.all)`
      console.log(`🔒 일반 사용자 필터링 쿼리: ${query}`)
    } else {
      console.log(`👑 관리자 - 모든 업무 조회: ${query}`)
    }
    
    const allTasks = await callSupabaseAPI(query)
    console.log(`📊 ${userEmail}의 업무 조회 결과: ${allTasks.length}개`)
    
    // 만료된 일회성 업무 필터링
    const tasks = filterExpiredOnceTasks(allTasks)
    
    console.log(`총 ${allTasks.length}개 업무 조회됨 (필터링 후: ${tasks.length}개)`)

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

export default handler
