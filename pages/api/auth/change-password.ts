import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'
import { verifyToken } from '@/lib/auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    const { currentPassword, newPassword } = req.body

    // 입력 검증
    if (!currentPassword || !newPassword) {
      return res.status(400).json(
        createApiResponse(false, null, '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.')
      )
    }

    if (newPassword.length < 6) {
      return res.status(400).json(
        createApiResponse(false, null, '새 비밀번호는 최소 6자 이상이어야 합니다.')
      )
    }

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

    // 현재 사용자 정보 조회
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, password')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      console.error('사용자 조회 오류:', userError)
      return res.status(404).json(
        createApiResponse(false, null, '사용자를 찾을 수 없습니다.')
      )
    }

    // 현재 비밀번호 확인
    if ((userData as any).password !== currentPassword) {
      return res.status(400).json(
        createApiResponse(false, null, '현재 비밀번호가 올바르지 않습니다.')
      )
    }

    // 새 비밀번호로 업데이트
    const { error: updateError } = await (supabaseAdmin as any)
      .from('users')
      .update({ 
        password: newPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('비밀번호 업데이트 오류:', updateError)
      return res.status(500).json(
        createApiResponse(false, null, '비밀번호 변경 중 오류가 발생했습니다.')
      )
    }

    console.log(`사용자 ${(userData as any).email}의 비밀번호가 변경되었습니다.`)

    return res.status(200).json(
      createApiResponse(true, {
        email: (userData as any).email,
        message: '비밀번호가 성공적으로 변경되었습니다.'
      })
    )

  } catch (error) {
    console.error('비밀번호 변경 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.', error instanceof Error ? error.message : String(error))
    )
  }
}
