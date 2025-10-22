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
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json(
        createApiResponse(false, null, '모든 필드를 입력해주세요.')
      )
    }

    if (password.length < 6) {
      return res.status(400).json(
        createApiResponse(false, null, '비밀번호는 6자 이상이어야 합니다.')
      )
    }

    // 기존 사용자 확인
    const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?email=eq.${email}`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json'
      }
    })

    if (!checkResponse.ok) {
      throw new Error(`사용자 확인 실패: ${checkResponse.status}`)
    }

    const existingUsers = await checkResponse.json()
    
    if (existingUsers.length > 0) {
      return res.status(409).json(
        createApiResponse(false, null, '이미 등록된 이메일입니다.')
      )
    }

    // 새 사용자 생성 (비밀번호 포함)
    const createResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        email,
        name,
        password, // 비밀번호 추가
        role: 'user'
      })
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error('사용자 생성 실패:', errorText)
      console.error('Response status:', createResponse.status)
      console.error('Response headers:', Object.fromEntries(createResponse.headers.entries()))
      
      // 더 자세한 오류 정보 제공
      let errorMessage = '사용자 생성에 실패했습니다.'
      if (createResponse.status === 409) {
        errorMessage = '이미 등록된 이메일입니다.'
      } else if (createResponse.status === 400) {
        errorMessage = '잘못된 요청입니다. 입력 정보를 확인해주세요.'
      } else if (createResponse.status === 401 || createResponse.status === 403) {
        errorMessage = '데이터베이스 접근 권한이 없습니다.'
      }
      
      return res.status(createResponse.status).json(
        createApiResponse(false, null, errorMessage)
      )
    }

    const newUsers = await createResponse.json()
    
    if (!newUsers || newUsers.length === 0) {
      throw new Error('사용자 생성 응답이 비어있습니다.')
    }
    
    const newUser = newUsers[0]

    // 알림 설정 생성
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/notification_settings`, {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: newUser.id,
          email_enabled: true,
          email_time: '09:00',
          reminder_hours: 24,
          weekend_notifications: false
        })
      })
    } catch (error) {
      console.error('알림 설정 생성 실패:', error)
      // 사용자는 생성되었으니 알림 설정 실패는 무시
    }

    // JWT 토큰 생성 (임시로 간단한 방식 사용)
    const token = Buffer.from(JSON.stringify({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7일
    })).toString('base64')

    // 사용자 정보 반환 (password 필드는 없음)
    const userInfo = newUser

    return res.status(201).json(
      createApiResponse(true, {
        user: userInfo,
        token
      }, '회원가입 성공')
    )

  } catch (error) {
    console.error('회원가입 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}
