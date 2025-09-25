import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'
import { getEmailService } from '@/lib/email'
import { TaskScheduler } from '@/lib/scheduler'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json(
      createApiResponse(false, null, '업무 ID가 필요합니다.')
    )
  }

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  return handleComplete(req, res, id)
}

/**
 * 업무 완료 처리
 */
async function handleComplete(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { completed_by, notes, notify_email } = req.body

    if (!completed_by) {
      return res.status(400).json(
        createApiResponse(false, null, '완료자 정보가 필요합니다.')
      )
    }

    // 먼저 업무 정보 조회
    const { data: task, error: fetchError } = await (supabaseAdmin as any)
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

    if (task.completed) {
      return res.status(400).json(
        createApiResponse(false, null, '이미 완료된 업무입니다.')
      )
    }

    const completedAt = new Date().toISOString()

    // 트랜잭션 시작 (Supabase에서는 RPC를 사용하거나 여러 작업을 순차적으로 수행)
    
    // 1. 완료 기록 추가
    const { data: completion, error: completionError } = await (supabaseAdmin as any)
      .from('task_completions')
      .insert([{
        task_id: id,
        completed_by,
        notes: notes || null,
        completed_at: completedAt
      }])
      .select()
      .single()

    if (completionError) {
      console.error('완료 기록 생성 실패:', completionError)
      return res.status(500).json(
        createApiResponse(false, null, '완료 기록 생성에 실패했습니다.', completionError.message)
      )
    }

    // 2. 업무 상태 업데이트 및 다음 마감일 계산
    let nextDueDate: string

    if (task.frequency === 'daily' || task.frequency === 'weekly' || task.frequency === 'monthly') {
      // 주기적 업무인 경우 다음 마감일 계산
      const nextDate = TaskScheduler.getNextScheduledDate(task, new Date())
      nextDueDate = nextDate.toISOString().split('T')[0] // YYYY-MM-DD 형식
    } else {
      // 일회성 업무인 경우 완료 상태로 설정
      nextDueDate = task.due_date
    }

    const { data: updatedTask, error: updateError } = await (supabaseAdmin as any)
      .from('tasks')
      .update({
        completed: task.frequency === 'daily' || task.frequency === 'weekly' || task.frequency === 'monthly' ? false : true,
        due_date: nextDueDate,
        updated_at: completedAt
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('업무 업데이트 실패:', updateError)
      
      // 롤백: 완료 기록 삭제
      await (supabaseAdmin as any)
        .from('task_completions')
        .delete()
        .eq('id', completion.id)
      
      return res.status(500).json(
        createApiResponse(false, null, '업무 업데이트에 실패했습니다.', updateError.message)
      )
    }

    // 3. 이메일 알림 발송 (선택사항)
    if (notify_email) {
      try {
        const emailService = getEmailService()
        const result = await emailService.sendTaskCompletionEmail(
          notify_email,
          task,
          completed_by
        )
        
        if (!result.success) {
          console.error('완료 알림 이메일 발송 실패:', result.error)
          // 이메일 실패는 치명적이지 않으므로 계속 진행
        }
      } catch (emailError) {
        console.error('이메일 서비스 오류:', emailError)
        // 이메일 실패는 치명적이지 않으므로 계속 진행
      }
    }

    return res.status(200).json(
      createApiResponse(true, {
        task: updatedTask,
        completion: completion,
        next_due_date: nextDueDate
      }, '업무가 성공적으로 완료되었습니다.')
    )
  } catch (error) {
    console.error('업무 완료 처리 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}
