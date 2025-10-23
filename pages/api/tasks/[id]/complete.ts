import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'
import { getEmailService } from '@/lib/email'
import { TaskScheduler } from '@/lib/scheduler'
import { withAuth, AuthenticatedRequest, generateToken } from '@/lib/auth'

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
): Promise<void> {
  const { method } = req
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    res.status(400).json(
      createApiResponse(false, null, '업무 ID가 필요합니다.')
    )
    return
  }

  if (method === 'POST') {
    await handleComplete(req, res, id)
  } else if (method === 'GET') {
    await handleCompleteFromEmail(req, res, id)
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }
}

/**
 * 이메일에서 GET 요청으로 완료 처리 (자동 로그인 포함)
 */
async function handleCompleteFromEmail(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { completed_by, notify_email, auto_login } = req.query

    console.log('이메일 완료 요청:', { id, completed_by, auto_login })

    if (!completed_by || typeof completed_by !== 'string') {
      return res.redirect(302, `${process.env.NEXT_PUBLIC_APP_URL || 'https://periodic-task-manager.vercel.app'}/login?error=${encodeURIComponent('완료자 정보가 필요합니다.')}`)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://periodic-task-manager.vercel.app'

    // 먼저 업무 정보 조회
    const { data: task, error: fetchError } = await (supabaseAdmin as any)
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // 업무를 찾을 수 없는 경우 대시보드로 리다이렉트
        return res.redirect(302, `${process.env.NEXT_PUBLIC_APP_URL || 'https://periodic-task-manager.vercel.app'}/dashboard?error=task_not_found`)
      }
      
      console.error('업무 조회 실패:', fetchError)
      return res.redirect(302, `${process.env.NEXT_PUBLIC_APP_URL || 'https://periodic-task-manager.vercel.app'}/dashboard?error=fetch_failed`)
    }

    if (task.completed) {
      // 이미 완료된 업무인 경우 대시보드로 리다이렉트
      return res.redirect(302, `${process.env.NEXT_PUBLIC_APP_URL || 'https://periodic-task-manager.vercel.app'}/dashboard?message=already_completed`)
    }

    const completedAt = new Date().toISOString()
    const completedBy = completed_by || task.assignee

    // 완료 기록 추가
    const { data: completion, error: completionError } = await (supabaseAdmin as any)
      .from('task_completions')
      .insert([{
        task_id: id,
        completed_by: completedBy,
        completed_at: completedAt
      }])
      .select()
      .single()

    if (completionError) {
      console.error('완료 기록 생성 실패:', completionError)
      return res.redirect(302, `${process.env.NEXT_PUBLIC_APP_URL || 'https://periodic-task-manager.vercel.app'}/dashboard?error=completion_failed`)
    }

    // 업무 상태 업데이트 및 다음 마감일 계산
    let nextDueDate: string

    if (task.frequency === 'daily' || task.frequency === 'weekly' || task.frequency === 'monthly') {
      const nextDate = TaskScheduler.getNextScheduledDate(task, new Date())
      nextDueDate = nextDate.toISOString().split('T')[0]
    } else {
      nextDueDate = task.due_date
    }

    const { error: updateError } = await (supabaseAdmin as any)
      .from('tasks')
      .update({
        completed: task.frequency === 'daily' || task.frequency === 'weekly' || task.frequency === 'monthly' ? false : true,
        due_date: nextDueDate,
        updated_at: completedAt
      })
      .eq('id', id)

    if (updateError) {
      console.error('업무 업데이트 실패:', updateError)
      await (supabaseAdmin as any)
        .from('task_completions')
        .delete()
        .eq('id', completion.id)
      
      return res.redirect(302, `${appUrl}/login?error=${encodeURIComponent('업무 업데이트에 실패했습니다.')}`)
    }

    // 간소화된 자동 로그인 처리 (auto_login=true인 경우에만)
    if (auto_login === 'true') {
      try {
        console.log('자동 로그인 처리 시작:', { email: completedBy, task_id: id })
        
        // 사용자 정보 조회
        let { data: user, error: userError } = await (supabaseAdmin as any)
          .from('users')
          .select('id, email, name, role')
          .eq('email', completedBy)
          .single()

        // 사용자가 없으면 자동 생성
        if (userError && userError.code === 'PGRST116') {
          console.log(`사용자 ${completedBy} 자동 생성`)
          const { data: newUser, error: createError } = await (supabaseAdmin as any)
            .from('users')
            .insert([{
              email: completedBy,
              name: completedBy.split('@')[0],
              password: 'temp123', // 임시 비밀번호 설정
              role: 'user'
            }])
            .select()
            .single()

          if (createError) {
            console.error('사용자 생성 실패:', createError)
            return res.redirect(302, `${appUrl}/login?error=${encodeURIComponent('사용자 생성 실패')}`)
          }
          user = newUser
        } else if (userError || !user) {
          console.error('사용자 조회 실패:', userError)
          return res.redirect(302, `${appUrl}/login?error=${encodeURIComponent('사용자 조회 실패')}`)
        }

        // 간단한 인증 토큰 생성 (simplified)
        const sessionToken = generateToken(user)

        // URL에 토큰을 포함하여 대시보드로 리다이렉트 (임시 방식)
        const redirectUrl = `${appUrl}/task-complete?token=${encodeURIComponent(sessionToken)}&task=${id}&user=${encodeURIComponent(user.email)}&message=${encodeURIComponent('업무가 완료되었습니다!')}`
        console.log('자동 로그인 성공, 리디렉션:', redirectUrl)
        return res.redirect(302, redirectUrl)

      } catch (autoLoginError) {
        console.error('자동 로그인 처리 오류:', autoLoginError)
        // 자동 로그인 실패시 수동 로그인 페이지로
        return res.redirect(302, `${appUrl}/login?message=${encodeURIComponent('업무가 완료되었습니다. 로그인해주세요.')}&redirect=${encodeURIComponent(`/dashboard?completed_task=${id}`)}`)
      }
    } else {
      // auto_login이 false이거나 없는 경우 수동 로그인 페이지로
      return res.redirect(302, `${appUrl}/login?message=${encodeURIComponent('업무가 완료되었습니다. 로그인해주세요.')}&redirect=${encodeURIComponent(`/dashboard?completed_task=${id}`)}`)
    }
  } catch (error) {
    console.error('업무 완료 처리 중 오류:', error)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://periodic-task-manager.vercel.app'
    return res.redirect(302, `${appUrl}/login?error=${encodeURIComponent('업무 완료 처리 중 오류가 발생했습니다.')}`)
  }
}

/**
 * 업무 완료 처리
 */
async function handleComplete(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
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

    // 사용자 권한 체크: 자신의 업무만 완료할 수 있음 (관리자 제외)
    if (req.user?.role !== 'admin' && task.assignee !== req.user?.email && task.assignee !== 'all') {
      return res.status(403).json(
        createApiResponse(false, null, '이 업무를 완료할 권한이 없습니다.')
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

    // 3. 완료 로그 출력 (이메일 알림 기능은 간소화를 위해 제거됨)
    console.log(`업무 완료됨: ${task.title} (완료자: ${completed_by})`)

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

// POST 요청만 인증 필요, GET 요청(이메일에서)은 인증 불필요
export default async function wrappedHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // GET 요청은 인증 없이 처리 (이메일에서 오는 요청)
    return handler(req as AuthenticatedRequest, res)
  } else {
    // POST 요청은 인증 필요
    return withAuth(handler)(req, res)
  }
}
