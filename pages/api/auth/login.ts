import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiResponse } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json(
        createApiResponse(false, null, '이메일과 비밀번호를 입력해주세요.')
      )
    }

    // 직접 REST API로 사용자 조회 (비밀번호 포함)
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?email=eq.${email}&select=*`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`사용자 조회 실패: ${response.status}`)
    }

    const users = await response.json()
    
    if (users.length === 0) {
      return res.status(401).json(
        createApiResponse(false, null, '존재하지 않는 계정입니다.')
      )
    }

    const user = users[0]

    // 실제 비밀번호 검증
    const isValidPassword = user.password === password

    if (!isValidPassword) {
      return res.status(401).json(
        createApiResponse(false, null, '비밀번호가 일치하지 않습니다.')
      )
    }

    // JWT 토큰 생성 (임시로 간단한 방식 사용)
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7일
    })).toString('base64')

    // 사용자 정보 반환 (비밀번호 제외)
    const userInfo = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at
    }

    return res.status(200).json(
      createApiResponse(true, {
        user: userInfo,
        token
      }, '로그인 성공')
    )

  } catch (error) {
    console.error('로그인 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}
