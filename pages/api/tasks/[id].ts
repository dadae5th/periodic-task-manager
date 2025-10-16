import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'
import { getEmailService } from '@/lib/email'
import { withAuth, AuthenticatedRequest } from '@/lib/auth'

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  const { method } = req
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json(
      createApiResponse(false, null, '업무 ID가 필요합니다.')
    )
  }

  switch (method) {
    case 'GET':
      return handleGet(req, res, id)
    case 'PUT':
      return handlePut(req, res, id)
    case 'DELETE':
      return handleDelete(req, res, id)
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
      return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }
}

/**
 * 개별 업무 조회
 */
async function handleGet(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const { data: task, error } = await (supabaseAdmin as any)
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json(
          createApiResponse(false, null, '업무를 찾을 수 없습니다.')
        )
      }
      
      console.error('업무 조회 실패:', error)
      return res.status(500).json(
        createApiResponse(false, null, '업무 조회에 실패했습니다.', error.message)
      )
    }

    // 사용자 권한 체크: 자신의 업무만 볼 수 있음 (관리자 제외)
    if (req.user?.role !== 'admin' && task.assignee !== req.user?.email && task.assignee !== 'all') {
      return res.status(403).json(
        createApiResponse(false, null, '이 업무를 조회할 권한이 없습니다.')
      )
    }

    return res.status(200).json(createApiResponse(true, task))
  } catch (error) {
    console.error('업무 조회 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}

/**
 * 업무 수정
 */
async function handlePut(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const { title, description, assignee, frequency, frequency_details, due_date, completed } = req.body

    // 먼저 기존 업무를 조회하여 권한 확인
    const { data: existingTask, error: fetchError } = await (supabaseAdmin as any)
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json(
          createApiResponse(false, null, '업무를 찾을 수 없습니다.')
        )
      }
      
      console.error('업무 조회 실패:', fetchError)
      return res.status(500).json(
        createApiResponse(false, null, '업무 조회에 실패했습니다.', fetchError.message)
      )
    }

    // 사용자 권한 체크: 자신의 업무만 수정할 수 있음 (관리자 제외)
    if (req.user?.role !== 'admin' && existingTask.assignee !== req.user?.email && existingTask.assignee !== 'all') {
      return res.status(403).json(
        createApiResponse(false, null, '이 업무를 수정할 권한이 없습니다.')
      )
    }

    const updates: any = {
      updated_at: new Date().toISOString()
    }

    // 제공된 필드만 업데이트
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (assignee !== undefined) updates.assignee = assignee
    if (frequency !== undefined) updates.frequency = frequency
    if (frequency_details !== undefined) updates.frequency_details = frequency_details
    if (due_date !== undefined) updates.due_date = due_date
    if (completed !== undefined) updates.completed = completed

    const { data: task, error } = await (supabaseAdmin as any)
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json(
          createApiResponse(false, null, '업무를 찾을 수 없습니다.')
        )
      }
      
      console.error('업무 수정 실패:', error)
      return res.status(500).json(
        createApiResponse(false, null, '업무 수정에 실패했습니다.', error.message)
      )
    }

    return res.status(200).json(
      createApiResponse(true, task, '업무가 성공적으로 수정되었습니다.')
    )
  } catch (error) {
    console.error('업무 수정 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}

/**
 * 업무 삭제
 */
async function handleDelete(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    // 먼저 업무가 존재하는지 확인
    const { data: existingTask, error: fetchError } = await (supabaseAdmin as any)
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json(
          createApiResponse(false, null, '업무를 찾을 수 없습니다.')
        )
      }
      
      console.error('업무 확인 실패:', fetchError)
      return res.status(500).json(
        createApiResponse(false, null, '업무 확인에 실패했습니다.', fetchError.message)
      )
    }

    // 사용자 권한 체크: 자신의 업무만 삭제할 수 있음 (관리자 제외)
    if (req.user?.role !== 'admin' && existingTask.assignee !== req.user?.email && existingTask.assignee !== 'all') {
      return res.status(403).json(
        createApiResponse(false, null, '이 업무를 삭제할 권한이 없습니다.')
      )
    }

    // 관련된 완료 기록도 함께 삭제
    const { error: completionsError } = await (supabaseAdmin as any)
      .from('task_completions')
      .delete()
      .eq('task_id', id)

    if (completionsError) {
      console.error('완료 기록 삭제 실패:', completionsError)
      // 완료 기록 삭제 실패는 치명적이지 않으므로 계속 진행
    }

    // 업무 삭제
    const { error: deleteError } = await (supabaseAdmin as any)
      .from('tasks')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('업무 삭제 실패:', deleteError)
      return res.status(500).json(
        createApiResponse(false, null, '업무 삭제에 실패했습니다.', deleteError.message)
      )
    }

    return res.status(200).json(
      createApiResponse(true, { id, title: existingTask.title }, '업무가 성공적으로 삭제되었습니다.')
    )
  } catch (error) {
    console.error('업무 삭제 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}

export default withAuth(handler)
