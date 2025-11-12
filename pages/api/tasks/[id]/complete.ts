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
    console.log('=== 이메일 완료 요청 디버깅 ===')
    console.log('요청 시각:', new Date().toISOString())
    console.log('HTTP Method:', req.method)
    console.log('Full URL:', req.url)
    console.log('전체 query 객체:', JSON.stringify(req.query, null, 2))
    
    const { completed_by, auto_login, force_login, source, recipient } = req.query
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://periodic-task-manager.vercel.app'

    console.log('추출된 파라미터:', { completed_by, auto_login, force_login, source, recipient })

    // force_login이 true이면 무조건 자동 로그인 처리
    if (force_login === 'true') {
      console.log('🚀 강제 자동 로그인 모드 활성화')
      
      let assignee = completed_by as string || recipient as string
      
      console.log(`🔍 담당자 결정 과정:`, {
        completed_by: completed_by,
        recipient: recipient,
        selectedAssignee: assignee
      })
      
      // completed_by와 recipient 모두 없으면 업무의 assignee를 사용
      if (!assignee || typeof assignee !== 'string') {
        try {
          console.log('🔄 업무 담당자 조회 시도...')
          const { data: task, error: fetchError } = await (supabaseAdmin as any)
            .from('tasks')
            .select('assignee, title')
            .eq('id', id)
            .single()
          
          if (!fetchError && task && task.assignee) {
            assignee = task.assignee
            console.log(`✅ 업무 담당자 사용: ${assignee} (업무: ${task.title})`)
          } else {
            console.log('❌ 업무 담당자 조회 실패, 기본값 사용')
            assignee = 'test@example.com'
          }
        } catch (error) {
          console.error('❌ 업무 담당자 조회 예외:', error)
          assignee = 'test@example.com'
        }
      }
      
      // 강제 자동 로그인으로 업무 완료 처리
      console.log(`� 강제 자동 로그인으로 업무 완료 처리: ${assignee}`)
      req.query.completed_by = assignee
      req.query.auto_login = 'true'
      
      // 계속해서 처리...
    }

    const completed_by_final = req.query.completed_by as string

    if (!completed_by_final || typeof completed_by_final !== 'string') {
      console.error('❌ completed_by 파라미터 최종 확인 실패')
      const errorMsg = `완료자 정보가 누락되었습니다. 디버깅 정보: URL=${req.url}, Query=${JSON.stringify(req.query, null, 2)}`
      console.error('❌ 최종 에러:', errorMsg)
      return res.redirect(302, `${appUrl}/login?error=${encodeURIComponent(errorMsg)}`)
    }

    console.log('✅ completed_by 파라미터 최종 확인:', completed_by_final)

    // 먼저 업무 완료 처리 수행
    console.log('📋 업무 완료 처리 시작...')
    
    // 업무 정보 조회
    const { data: taskData, error: taskFetchError } = await (supabaseAdmin as any)
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (taskFetchError) {
      console.error('업무 조회 실패:', taskFetchError)
      if (taskFetchError.code === 'PGRST116') {
        return res.redirect(302, `${appUrl}/dashboard?error=task_not_found`)
      }
      return res.redirect(302, `${appUrl}/dashboard?error=fetch_failed`)
    }

    if (taskData.completed) {
      console.log('이미 완료된 업무')
      return res.redirect(302, `${appUrl}/dashboard?message=already_completed`)
    }

    const taskCompletedAt = new Date().toISOString()

    // 완료 기록 추가
    const { data: taskCompletion, error: taskCompletionError } = await (supabaseAdmin as any)
      .from('task_completions')
      .insert([{
        task_id: id,
        completed_by: completed_by_final,
        completed_at: taskCompletedAt
      }])
      .select()
      .single()

    if (taskCompletionError) {
      console.error('완료 기록 생성 실패:', taskCompletionError)
    }

    // 업무 상태 업데이트
    const { error: taskUpdateError } = await (supabaseAdmin as any)
      .from('tasks')
      .update({
        completed: taskData.frequency === 'once' ? true : false,
        updated_at: taskCompletedAt
      })
      .eq('id', id)

    if (taskUpdateError) {
      console.error('업무 업데이트 실패:', taskUpdateError)
    } else {
      console.log('✅ 업무 완료 처리 성공')
    }

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

    // 간소화된 자동 로그인 처리
    console.log('🔄 자동 로그인 처리 시작:', { email: completed_by_final, task_id: id })
    
    try {
      // 사용자 정보 조회 또는 생성
      let { data: user, error: userError } = await (supabaseAdmin as any)
        .from('users')
        .select('id, email, name, role')
        .eq('email', completed_by_final)
        .single()

      // 사용자가 없으면 자동 생성
      if (userError && userError.code === 'PGRST116') {
        console.log(`🆕 사용자 ${completed_by_final} 자동 생성`)
        const { data: newUser, error: createError } = await (supabaseAdmin as any)
          .from('users')
          .insert([{
            email: completed_by_final,
            name: completed_by_final.split('@')[0],
            password: 'temp123',
            role: 'user'
          }])
          .select()
          .single()

        if (createError) {
          console.error('❌ 사용자 생성 실패:', createError)
        } else {
          user = newUser
          console.log('✅ 새 사용자 생성 성공:', user)
        }
      }

      if (!user) {
        console.error('❌ 사용자 정보 없음')
        throw new Error('사용자 정보를 찾을 수 없습니다')
      }

      // 인증 토큰 생성
      const sessionToken = generateToken(user)
      console.log('✅ 토큰 생성 성공')

      // 토큰과 사용자 정보를 URL에 포함하여 대시보드로 바로 이동
      const dashboardUrl = `${appUrl}/dashboard?auto_login=true&token=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(JSON.stringify(user))}&message=${encodeURIComponent('업무가 완료되었습니다!')}&completed_task=${id}`
      
      console.log('✅ 대시보드로 직접 리다이렉트:', dashboardUrl)
      return res.redirect(302, dashboardUrl)

    } catch (error) {
      console.error('❌ 자동 로그인 처리 오류:', error)
      // 자동 로그인 실패시에도 업무는 이미 완료된 상태이므로 대시보드로 이동
      return res.redirect(302, `${appUrl}/dashboard?message=${encodeURIComponent('업무가 완료되었습니다. 로그인이 필요합니다.')}&completed_task=${id}`)
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
