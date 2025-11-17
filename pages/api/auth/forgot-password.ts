import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiResponse } from '@/lib/utils'
import crypto from 'crypto'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json(
        createApiResponse(false, null, '이메일을 입력해주세요.')
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json(
        createApiResponse(false, null, '올바른 이메일 형식을 입력해주세요.')
      )
    }

    // 사용자 확인
    const userResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?email=eq.${email}`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json'
      }
    })

    if (!userResponse.ok) {
      throw new Error(`사용자 조회 실패: ${userResponse.status}`)
    }

    const users = await userResponse.json()
    
    if (users.length === 0) {
      // 보안상 이유로 사용자가 없어도 성공 메시지를 보냄
      return res.status(200).json(
        createApiResponse(true, null, '비밀번호 재설정 링크를 이메일로 발송했습니다. (등록되지 않은 이메일인 경우 발송되지 않습니다)')
      )
    }

    const user = users[0]

    // 비밀번호 재설정 토큰 생성
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000) // 1시간 후 만료

    // 기존 토큰 삭제 (사용자당 하나의 유효한 토큰만)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/email_tokens?user_email=eq.${email}&purpose=eq.password_reset`, {
        method: 'DELETE',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.log('기존 토큰 삭제 시도:', error)
    }

    // 새 토큰 저장
    const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/email_tokens`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: resetToken,
        user_email: email,
        purpose: 'password_reset',
        expires_at: expiresAt.toISOString()
      })
    })

    if (!tokenResponse.ok) {
      throw new Error(`토큰 저장 실패: ${tokenResponse.status}`)
    }

    // 비밀번호 재설정 이메일 발송
    try {
      const { getEmailService } = await import('@/lib/email')
      const emailService = getEmailService()
      
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
      
      console.log(`${email}에게 비밀번호 재설정 이메일 발송 시작`)
      
      // 비밀번호 재설정 이메일 발송
      const { generatePasswordResetEmailTemplate } = await import('@/lib/simple-email-template')
      await sendPasswordResetEmail(email, user.name, resetUrl, emailService, generatePasswordResetEmailTemplate)
      
      console.log(`✅ ${email} 비밀번호 재설정 이메일 발송 완료`)
    } catch (emailError) {
      console.error('비밀번호 재설정 이메일 발송 실패:', emailError)
      
      // 토큰 삭제 (이메일 발송 실패 시)
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/email_tokens?token=eq.${resetToken}`, {
          method: 'DELETE',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            'Content-Type': 'application/json'
          }
        })
      } catch (deleteError) {
        console.error('토큰 삭제 실패:', deleteError)
      }

      return res.status(500).json(
        createApiResponse(false, null, '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.')
      )
    }

    return res.status(200).json(
      createApiResponse(true, null, '비밀번호 재설정 링크를 이메일로 발송했습니다. 이메일을 확인해주세요.')
    )

  } catch (error) {
    console.error('비밀번호 찾기 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}

// 비밀번호 재설정 이메일 발송 함수
async function sendPasswordResetEmail(email: string, name: string, resetUrl: string, emailService: any, generatePasswordResetEmailTemplate: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  const htmlContent = generatePasswordResetEmailTemplate(resetUrl, email)

  const textContent = `
비밀번호 재설정 - 업무 관리 시스템

안녕하세요, ${name}님!

비밀번호 재설정 요청을 받았습니다.

아래 링크를 클릭하여 새로운 비밀번호를 설정하세요:
${resetUrl}

⚠️ 보안 안내:
- 이 링크는 1시간 후 만료됩니다
- 링크를 클릭하면 기존 링크는 무효화됩니다  
- 요청하지 않았다면 이 이메일을 무시하세요

문의: 시스템 관리자
대시보드: ${appUrl}
  `

  // 실제 이메일 발송 (nodemailer 사용)
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
    subject: '🔐 비밀번호 재설정 요청 - 업무 관리 시스템',
    html: htmlContent,
    text: textContent,
  })
}
