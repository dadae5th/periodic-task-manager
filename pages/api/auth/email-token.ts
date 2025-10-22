import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'
import crypto from 'crypto'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('이메일 토큰 생성 요청:', { method: req.method, body: req.body })

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    const { email, purpose, task_id } = req.body

    if (!email || !purpose) {
      console.log('필수 필드 누락:', { email, purpose })
      return res.status(400).json(
        createApiResponse(false, null, '이메일과 목적이 필요합니다.')
      )
    }

    // 사용자 존재 확인
    let { data: user, error: userError } = await (supabaseAdmin as any)
      .from('users')
      .select('id, email, name, role')
      .eq('email', email)
      .single()

    // 사용자가 없으면 자동으로 생성 (이메일에서 오는 완료 요청의 경우)
    if (userError && userError.code === 'PGRST116') {
      console.log(`사용자 ${email}가 존재하지 않아 자동 생성합니다.`)
      
      const { data: newUser, error: createError } = await (supabaseAdmin as any)
        .from('users')
        .insert([{
          email: email,
          name: email.split('@')[0], // 이메일 앞부분을 이름으로 사용
          password: 'temp123', // 임시 비밀번호 설정
          role: 'user'
        }])
        .select()
        .single()

      if (createError) {
        console.error('사용자 자동 생성 실패:', createError)
        return res.status(500).json(
          createApiResponse(false, null, '사용자 생성에 실패했습니다.')
        )
      }
      
      user = newUser
    } else if (userError || !user) {
      return res.status(404).json(
        createApiResponse(false, null, '사용자를 찾을 수 없습니다.')
      )
    }

    // 일회용 토큰 생성 (10분 유효 - 이메일 확인에 충분한 시간)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    // 토큰을 데이터베이스에 저장
    console.log('토큰 DB 저장 시도:', { token: token.substring(0, 8) + '...', email, purpose })
    
    const { error: tokenError } = await (supabaseAdmin as any)
      .from('email_tokens')
      .insert([{
        token,
        user_email: email,
        purpose,
        task_id: task_id || null,
        expires_at: expiresAt.toISOString(),
        used: false
      }])

    if (tokenError) {
      console.error('토큰 저장 실패:', tokenError)
      return res.status(500).json(
        createApiResponse(false, null, '토큰 생성에 실패했습니다.')
      )
    }

    console.log('토큰 생성 성공:', { email, purpose })
    return res.status(200).json(
      createApiResponse(true, { token }, '토큰이 생성되었습니다.')
    )

  } catch (error) {
    console.error('토큰 생성 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}
