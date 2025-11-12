import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * ⚠️ 완료 API 완전 제거됨 ⚠️ 
 * 이메일 완료 버튼이 완전히 제거되었으므로 이 API는 더 이상 사용되지 않습니다.
 * 업무 완료는 오직 대시보드에서만 가능합니다.
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://periodic-task-manager.vercel.app'
  
  // 🚫 완료 API 완전 제거 - 모든 요청을 대시보드로 리다이렉트
  console.log('🚫 완료 API가 제거되었습니다. 대시보드로 리다이렉트합니다.')
  
  if (req.method === 'GET') {
    // 이메일에서 오는 GET 요청을 대시보드로 리다이렉트
    return res.redirect(302, `${appUrl}/dashboard?message=${encodeURIComponent('완료 버튼이 제거되었습니다. 대시보드에서 완료 처리하세요.')}`)
  } else {
    // 다른 모든 요청은 404 반환
    return res.status(404).json({
      success: false,
      message: '완료 API가 제거되었습니다. 대시보드에서 완료 처리하세요.',
      redirect: `${appUrl}/dashboard`
    })
  }
}

/**
 * 이메일에서 GET 요청으로 완료 처리 (자동 로그인 포함) - 비활성화됨
 */
async function handleCompleteFromEmail(req: NextApiRequest, res: NextApiResponse, id: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://periodic-task-manager.vercel.app'
  
  // 🚫 이메일 완료 버튼 기능 완전 비활성화
  console.log('❌ 이메일 완료 버튼이 비활성화되었습니다. 대시보드에서 완료 처리하세요.')
  return res.redirect(302, `${appUrl}/dashboard?message=${encodeURIComponent('이메일 완료 버튼이 비활성화되었습니다. 대시보드에서 완료 처리하세요.')}`)
  
  try {
    console.log('=== 이메일 완료 요청 시작 ===')
    console.log('🕐 시각:', new Date().toISOString())
    console.log('📍 URL:', req.url)
    console.log('🔢 업무 ID:', id)
    console.log('📝 Query 파라미터:', JSON.stringify(req.query, null, 2))
    console.log('🌐 App URL:', appUrl)
    
    // 1단계: 업무 조회 및 담당자 확인
    console.log('🔍 1단계: 업무 조회 시작...')
    const { data: task, error: fetchError } = await (supabaseAdmin as any)
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('❌ 업무 조회 실패:', JSON.stringify(fetchError, null, 2))
      console.log('🚨 리다이렉트: dashboard?error=task_not_found')
      return res.redirect(302, `${appUrl}/dashboard?error=task_not_found`)
    }

    console.log('✅ 업무 조회 성공:', {
      id: task.id,
      title: task.title,
      assignee: task.assignee,
      completed: task.completed,
      frequency: task.frequency
    })

    if (task.completed && task.frequency === 'once') {
      console.log('⚠️ 이미 완료된 업무 감지')
      console.log('🚨 리다이렉트: dashboard?message=already_completed')
      return res.redirect(302, `${appUrl}/dashboard?message=already_completed`)
    }

    // 2단계: 완료자 결정 (우선순위: completed_by → recipient → assignee)
    console.log('🔍 2단계: 완료자 결정 시작...')
    const { completed_by, recipient } = req.query
    console.log('📋 완료자 후보들:', {
      completed_by: completed_by,
      recipient: recipient,
      task_assignee: task.assignee
    })
    
    const completedBy = (completed_by as string) || (recipient as string) || task.assignee

    if (!completedBy) {
      console.error('❌ 완료자 정보 없음 - 모든 후보가 비어있음')
      console.log('🚨 리다이렉트: dashboard?error=no_assignee')
      return res.redirect(302, `${appUrl}/dashboard?error=no_assignee`)
    }

    console.log('✅ 완료자 결정:', completedBy)

    // 3단계: 업무 완료 처리
    const completedAt = new Date().toISOString()

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
    }

    // 다음 마감일 계산 및 업무 상태 업데이트
    let nextDueDate: string
    let isCompleted: boolean

    if (task.frequency === 'daily' || task.frequency === 'weekly' || task.frequency === 'monthly') {
      // 주기적 업무: 다음 마감일 설정, 완료 상태는 false
      const nextDate = TaskScheduler.getNextScheduledDate(task, new Date())
      nextDueDate = nextDate.toISOString().split('T')[0]
      isCompleted = false
    } else {
      // 일회성 업무: 완료 상태로 변경
      nextDueDate = task.due_date
      isCompleted = true
    }

    const { error: updateError } = await (supabaseAdmin as any)
      .from('tasks')
      .update({
        completed: isCompleted,
        due_date: nextDueDate,
        updated_at: completedAt
      })
      .eq('id', id)

    if (updateError) {
      console.error('업무 업데이트 실패:', updateError)
    } else {
      console.log('✅ 업무 완료 처리 성공')
    }

    // 4단계: 자동 로그인 및 대시보드 이동
    try {
      // 사용자 조회 또는 생성
      let { data: user, error: userError } = await (supabaseAdmin as any)
        .from('users')
        .select('id, email, name, role')
        .eq('email', completedBy)
        .single()

      // 사용자가 없으면 자동 생성
      if (userError && userError.code === 'PGRST116') {
        console.log(`새 사용자 생성: ${completedBy}`)
        const { data: newUser, error: createError } = await (supabaseAdmin as any)
          .from('users')
          .insert([{
            email: completedBy,
            name: completedBy.split('@')[0],
            password: 'temp123',
            role: 'user'
          }])
          .select()
          .single()

        if (createError) {
          console.error('사용자 생성 실패:', createError)
          return res.redirect(302, `${appUrl}/dashboard?message=${encodeURIComponent('업무가 완료되었습니다. 로그인해주세요.')}`)
        }
        user = newUser
      }

      if (!user) {
        return res.redirect(302, `${appUrl}/dashboard?message=${encodeURIComponent('업무가 완료되었습니다. 로그인해주세요.')}`)
      }

      // 토큰 생성
      const sessionToken = generateToken(user)
      
      // CSP 우회: 완료 성공 페이지로 이동 (쿠키 + URL 파라미터)
      res.setHeader('Set-Cookie', [
        `authToken=${sessionToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`,
        `currentUser=${encodeURIComponent(JSON.stringify(user))}; Path=/; Max-Age=604800; SameSite=Lax`
      ])
      
      const successUrl = `${appUrl}/email-dashboard?token=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(JSON.stringify(user))}&message=${encodeURIComponent('업무가 완료되었습니다!')}`
      
      console.log('✅ 자동 로그인 성공, 완료 성공 페이지로 이동')
      return res.redirect(302, successUrl)

    } catch (error) {
      console.error('❌ 자동 로그인 오류:', error)
      console.log('🚨 리다이렉트: dashboard (로그인 필요)')
      return res.redirect(302, `${appUrl}/dashboard?message=${encodeURIComponent('업무가 완료되었습니다. 로그인해주세요.')}`)
    }

  } catch (error) {
    console.error('❌ 업무 완료 처리 최상위 오류:', error)
    console.log('🚨 최종 리다이렉트: dashboard (처리 오류)')
    return res.redirect(302, `${appUrl}/dashboard?error=${encodeURIComponent('처리 중 오류가 발생했습니다.')}`)
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
