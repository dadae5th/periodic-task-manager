import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { createApiResponse } from '../../../lib/utils'
import { withAuth, AuthenticatedRequest } from '../../../lib/auth'

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // URL이나 헤더에서 사용자 정보 추출
  const userEmail = req.headers['x-user-email'] as string || req.query.user as string || 'bae.jae.kwon@drbworld.com'
  
  // 동적 사용자 설정
  const isAdmin = userEmail === 'bae.jae.kwon@drbworld.com'
  const dynamicUser = {
    id: `user-${userEmail.replace(/[^a-zA-Z0-9]/g, '-')}`,
    email: userEmail,
    name: userEmail.split('@')[0],
    role: isAdmin ? 'admin' as const : 'user' as const,
    created_at: new Date().toISOString()
  }
  
  // req에 사용자 정보 추가
  const authReq = req as AuthenticatedRequest
  authReq.user = dynamicUser
  // UTF-8 인코딩 설정
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  
  console.log('Today completions API called:', new Date().toISOString(), req.method)
  
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

    const todayStr = today.toISOString()
    const tomorrowStr = tomorrow.toISOString()

    console.log('Querying completions between:', todayStr, 'and', tomorrowStr)

    const userEmail = authReq.user?.email
    console.log('Filtering completions for user:', userEmail)

    // 오늘 완료된 업무 개수 조회 (사용자별 필터링)
    let query = supabaseAdmin
      .from('task_completions')
      .select('id, task_id, completed_by, completed_at, tasks(title)', { count: 'exact' })
      .gte('completed_at', todayStr)
      .lt('completed_at', tomorrowStr)
      .order('completed_at', { ascending: false })

    // 관리자가 아닌 경우 자신이 완료한 업무만 조회
    if (authReq.user?.role !== 'admin' && userEmail) {
      query = query.eq('completed_by', userEmail)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Completions query error:', error)
      return res.status(500).json(
        createApiResponse(false, null, `Database query failed: ${error.message}`)
      )
    }

    console.log('Today completions found:', count, 'records')

    return res.status(200).json(
      createApiResponse(true, {
        count: count || 0,
        completions: data || [],
        date: today.toISOString().split('T')[0]
      }, `오늘 완료된 업무: ${count || 0}개`)
    )

  } catch (error) {
    console.error('Handler error:', error)
    return res.status(500).json(
      createApiResponse(false, null, error instanceof Error ? error.message : '알 수 없는 오류')
    )
  }
}

export default handler
