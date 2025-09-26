import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { createApiResponse } from '../../../lib/utils'

export default async function handler(
  req: NextApiRequest,
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

    // 1. 오늘 마감인 업무들 조회
    const { data: todayTasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('id, title, due_date')
      .eq('due_date', todayStr)

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
    const { data: completions, error: completionsError } = await supabaseAdmin
      .from('task_completions')
      .select('id, task_id, completed_by, completed_at, tasks(title, due_date)')
      .gte('completed_at', tomorrowStr.slice(0, 10) + 'T00:00:00')
      .lt('completed_at', tomorrowStr)
      .in('task_id', todayTaskIds)

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
