import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'
import { Task } from '@/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req

  switch (method) {
    case 'GET':
      return handleGet(req, res)
    case 'POST':
      return handlePost(req, res)
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }
}

/**
 * 업무 목록 조회
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      assignee, 
      frequency, 
      completed = 'false',
      overdue = 'false',
      page = '1',
      limit = '50'
    } = req.query

    let query = supabaseAdmin
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    // 필터 적용
    if (assignee && assignee !== 'all') {
      query = query.eq('assignee', assignee)
    }

    if (frequency && frequency !== 'all') {
      query = query.eq('frequency', frequency)
    }

    if (completed !== 'all') {
      query = query.eq('completed', completed === 'true')
    }

    // 페이지네이션
    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const from = (pageNum - 1) * limitNum
    const to = from + limitNum - 1

    query = query.range(from, to)

    const { data: tasks, error, count } = await (query as any)

    if (error) {
      console.error('업무 조회 실패:', error)
      return res.status(500).json(
        createApiResponse(false, null, '업무 조회에 실패했습니다.', error.message)
      )
    }

    // 지연된 업무 필터링 (클라이언트 사이드에서 처리)
    let filteredTasks = tasks || []

    if (overdue === 'true') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      filteredTasks = filteredTasks.filter((task: any) => {
        if (task.completed) return false
        
        const dueDate = new Date(task.due_date)
        dueDate.setHours(0, 0, 0, 0)
        
        return dueDate < today
      })
    }

    return res.status(200).json(
      createApiResponse(true, {
        tasks: filteredTasks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum)
        }
      })
    )
  } catch (error) {
    console.error('업무 조회 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}

/**
 * 새 업무 생성
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { title, description, assignee, frequency, frequency_details, due_date } = req.body

    // 필수 필드 검증
    if (!title || !assignee || !frequency || !due_date) {
      return res.status(400).json(
        createApiResponse(false, null, '필수 필드가 누락되었습니다.')
      )
    }

    // 주기 세부사항 검증
    if (!frequency_details) {
      return res.status(400).json(
        createApiResponse(false, null, '주기 세부사항이 필요합니다.')
      )
    }

    const newTask = {
      title,
      description: description || null,
      assignee,
      frequency,
      frequency_details,
      due_date,
      completed: false,
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('tasks')
      .insert([newTask])
      .select()
      .single()

    if (error) {
      console.error('업무 생성 실패:', error)
      return res.status(500).json(
        createApiResponse(false, null, '업무 생성에 실패했습니다.', error.message)
      )
    }

    return res.status(201).json(
      createApiResponse(true, data, '업무가 성공적으로 생성되었습니다.')
    )
  } catch (error) {
    console.error('업무 생성 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}
