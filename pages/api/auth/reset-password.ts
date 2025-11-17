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
    const { token, newPassword, confirmPassword } = req.body

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json(
        createApiResponse(false, null, '모든 필드를 입력해주세요.')
      )
    }

    if (newPassword.length < 6) {
      return res.status(400).json(
        createApiResponse(false, null, '비밀번호는 6자 이상이어야 합니다.')
      )
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json(
        createApiResponse(false, null, '비밀번호가 일치하지 않습니다.')
      )
    }

    // 토큰 유효성 검증
    const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/email_tokens?token=eq.${token}&purpose=eq.password_reset&used=eq.false`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json'
      }
    })

    if (!tokenResponse.ok) {
      throw new Error(`토큰 조회 실패: ${tokenResponse.status}`)
    }

    const tokens = await tokenResponse.json()
    
    if (tokens.length === 0) {
      return res.status(400).json(
        createApiResponse(false, null, '유효하지 않거나 만료된 토큰입니다.')
      )
    }

    const resetToken = tokens[0]
    
    // 토큰 만료 확인
    const now = new Date()
    const expiresAt = new Date(resetToken.expires_at)
    
    if (now > expiresAt) {
      // 만료된 토큰 삭제
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/email_tokens?id=eq.${resetToken.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json'
        }
      })

      return res.status(400).json(
        createApiResponse(false, null, '토큰이 만료되었습니다. 다시 비밀번호 재설정을 요청해주세요.')
      )
    }

    // 사용자 비밀번호 업데이트
    const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?email=eq.${resetToken.user_email}`, {
      method: 'PATCH',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password: newPassword
      })
    })

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('비밀번호 업데이트 실패:', errorText)
      
      return res.status(500).json(
        createApiResponse(false, null, '비밀번호 업데이트에 실패했습니다.')
      )
    }

    // 토큰을 사용됨으로 표시
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/email_tokens?id=eq.${resetToken.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        used: true,
        used_at: new Date().toISOString()
      })
    })

    // 해당 사용자의 다른 모든 비밀번호 재설정 토큰 삭제 (보안)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/email_tokens?user_email=eq.${resetToken.user_email}&purpose=eq.password_reset&id=neq.${resetToken.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.log('다른 토큰 정리 실패:', error)
    }

    // 비밀번호 변경 완료 이메일 발송
    try {
      const { generatePasswordResetSuccessEmailTemplate } = await import('@/lib/simple-email-template')
      await sendPasswordChangeNotification(resetToken.user_email, generatePasswordResetSuccessEmailTemplate)
    } catch (emailError) {
      console.error('비밀번호 변경 알림 이메일 발송 실패:', emailError)
      // 이메일 실패는 무시하고 계속 진행
    }

    return res.status(200).json(
      createApiResponse(true, null, '비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인하세요.')
    )

  } catch (error) {
    console.error('비밀번호 재설정 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}

// 비밀번호 변경 완료 알림 이메일
async function sendPasswordChangeNotification(email: string, generatePasswordResetSuccessEmailTemplate: any) {
  const htmlContent = generatePasswordResetSuccessEmailTemplate(email)

  const nodemailer = require('nodemailer')
  
  const transporter = nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    }
  })

  await transporter.sendMail({
    from: `"업무 관리 시스템" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '✅ 비밀번호 변경 완료 - 업무 관리 시스템',
    html: htmlContent
  })
}
