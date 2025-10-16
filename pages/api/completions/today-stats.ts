import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { createApiResponse } from '../../../lib/utils'
import { withAuth, AuthenticatedRequest } from '../../../lib/auth'

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  // UTF-8 인코딩 설정
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  
  console.log('Today stats API called:', new Date().toISOString(), req.method)
  
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).json(
        createApiResponse(false, null, '허용되지 않는 메서드')
      )
    }

    // 오늘 날짜 계산 (한국 시간 기준)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD 형식
    const tomorrowStr = tomorrow.toISOString()

    console.log('Calculating today stats for date:', todayStr)

    const userEmail = req.user?.email
    console.log('Filtering tasks for user:', userEmail)

    // 1. 오늘 마감인 업무들 조회 (사용자별 필터링)
    let tasksQuery = supabaseAdmin
      .from('tasks')
      .select('id, title, due_date')
      .eq('due_date', todayStr)

    // 관리자가 아닌 경우 자신의 업무만 조회
    if (req.user?.role !== 'admin' && userEmail) {
      tasksQuery = tasksQuery.or(`assignee.eq.${userEmail},assignee.eq.all`)
    }

    const { data: todayTasks, error: tasksError } = await tasksQuery

    if (tasksError) {
      console.error('Today tasks query error:', tasksError)
      return res.status(500).json(
        createApiResponse(false, null, `오늘 업무 조회 실패: ${tasksError.message}`)
      )
    }

    const todayTaskIds = (todayTasks || []).map((task: any) => task.id)
    console.log('Today tasks:', todayTasks?.length || 0, 'tasks')

    if (todayTaskIds.length === 0) {
      return res.status(200).json(
        createApiResponse(true, {
          today_tasks_count: 0,
          today_completed_count: 0,
          today_completion_rate: 0,
          today_tasks: [],
          completed_today_tasks: []
        }, '오늘 마감인 업무가 없습니다.')
      )
    }

    // 2. 오늘 완료된 업무 중에서 오늘 마감인 업무들만 필터링
    const todayStartStr = today.toISOString()
    const tomorrowStartStr = tomorrow.toISOString()
    
    console.log('Filtering completions between:', todayStartStr, 'and', tomorrowStartStr)
    console.log('Today task IDs to match:', todayTaskIds)
    
    let completionsQuery = supabaseAdmin
      .from('task_completions')
      .select('id, task_id, completed_by, completed_at, tasks(title, due_date)')
      .gte('completed_at', todayStartStr)
      .lt('completed_at', tomorrowStartStr)
      .in('task_id', todayTaskIds)

    // 관리자가 아닌 경우 자신이 완료한 업무만 조회
    if (req.user?.role !== 'admin' && userEmail) {
      completionsQuery = completionsQuery.eq('completed_by', userEmail)
    }

    const { data: completions, error: completionsError } = await completionsQuery

    if (completionsError) {
      console.error('Today completions query error:', completionsError)
      return res.status(500).json(
        createApiResponse(false, null, `완료 기록 조회 실패: ${completionsError.message}`)
      )
    }

    const todayCompletedCount = completions?.length || 0
    const todayCompletionRate = todayTaskIds.length > 0 ? 
      Math.round((todayCompletedCount / todayTaskIds.length) * 100) : 0

    console.log('Today completion stats:', {
      todayTasksCount: todayTaskIds.length,
      todayCompletedCount,
      todayCompletionRate
    })

    return res.status(200).json(
      createApiResponse(true, {
        today_tasks_count: todayTaskIds.length,
        today_completed_count: todayCompletedCount,
        today_completion_rate: todayCompletionRate,
        today_tasks: todayTasks || [],
        completed_today_tasks: completions || []
      }, `오늘 업무: ${todayTaskIds.length}개 중 ${todayCompletedCount}개 완료 (${todayCompletionRate}%)`)
    )

  } catch (error) {
    console.error('Handler error:', error)
    return res.status(500).json(
      createApiResponse(false, null, error instanceof Error ? error.message : '알 수 없는 오류')
    )
  }
}

export default withAuth(handler)
