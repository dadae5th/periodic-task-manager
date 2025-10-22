import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'
import { verifyToken } from '@/lib/auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    // 토큰에서 사용자 정보 확인
    const token = req.cookies.auth_token
    if (!token) {
      return res.status(401).json(
        createApiResponse(false, null, '로그인이 필요합니다.')
      )
    }

    const user = verifyToken(token)
    if (!user) {
      return res.status(401).json(
        createApiResponse(false, null, '유효하지 않은 토큰입니다.')
      )
    }

    // 최신 사용자 정보 조회 (비밀번호 제외)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, created_at, updated_at')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      console.error('사용자 조회 오류:', userError)
      return res.status(404).json(
        createApiResponse(false, null, '사용자를 찾을 수 없습니다.')
      )
    }

    return res.status(200).json(
      createApiResponse(true, userData)
    )

  } catch (error) {
    console.error('사용자 정보 조회 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.', error instanceof Error ? error.message : String(error))
    )
  }
}
