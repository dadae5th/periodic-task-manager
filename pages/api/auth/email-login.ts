import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'
import { generateToken } from '@/lib/auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[EMAIL_LOGIN] 요청 수신:', { method: req.method, query: req.query })
  
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    const { token, redirect } = req.query
    
    console.log('[EMAIL_LOGIN] 파라미터 확인:', { hasToken: !!token, tokenType: typeof token, redirect })

    if (!token || typeof token !== 'string') {
      console.log('[EMAIL_LOGIN] 토큰 없음 - 로그인 페이지로 리디렉션')
      // 토큰이 없으면 로그인 페이지로 리디렉션
      const redirectUrl = `/login${redirect ? `?redirect=${encodeURIComponent(redirect as string)}` : ''}`
      return res.redirect(302, redirectUrl)
    }

    // 토큰 검증
    console.log('[EMAIL_LOGIN] 토큰 검증 시작:', { token: token.substring(0, 8) + '...' })
    
    const { data: emailToken, error: tokenError } = await (supabaseAdmin as any)
      .from('email_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single()

    console.log('[EMAIL_LOGIN] 토큰 검증 결과:', { 
      hasToken: !!emailToken, 
      tokenError: tokenError?.message || null,
      tokenFound: !!emailToken,
      tokenUsed: emailToken?.used,
      tokenExpired: emailToken ? new Date(emailToken.expires_at) < new Date() : null
    })

    if (tokenError || !emailToken) {
      console.error('[EMAIL_LOGIN] 토큰 검증 실패:', tokenError)
      // 유효하지 않은 토큰이면 로그인 페이지로 리디렉션
      const redirectUrl = `/login?error=${encodeURIComponent('링크가 만료되었거나 유효하지 않습니다.')}`
      return res.redirect(302, redirectUrl)
    }

    // 사용자 정보 조회
    console.log('[EMAIL_LOGIN] 사용자 조회 시도:', { userEmail: emailToken.user_email })
    
    const { data: user, error: userError } = await (supabaseAdmin as any)
      .from('users')
      .select('id, email, name, role')
      .eq('email', emailToken.user_email)
      .single()

    console.log('[EMAIL_LOGIN] 사용자 조회 결과:', { 
      hasUser: !!user, 
      userError: userError?.message || null,
      userEmail: user?.email
    })

    if (userError || !user) {
      console.error('[EMAIL_LOGIN] 사용자 조회 실패:', userError)
      const redirectUrl = `/login?error=${encodeURIComponent('사용자를 찾을 수 없습니다.')}`
      return res.redirect(302, redirectUrl)
    }

    // 토큰을 사용됨으로 표시
    console.log('[EMAIL_LOGIN] 토큰을 사용됨으로 표시')
    await (supabaseAdmin as any)
      .from('email_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('token', token)

    // 세션 토큰 생성
    console.log('[EMAIL_LOGIN] 세션 토큰 생성 시도')
    const sessionToken = generateToken(user)
    console.log('[EMAIL_LOGIN] 세션 토큰 생성 완료:', { hasSessionToken: !!sessionToken })

    // 쿠키 설정
    console.log('[EMAIL_LOGIN] 쿠키 설정')
    res.setHeader('Set-Cookie', [
      `auth-token=${sessionToken}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`,
      `user-email=${user.email}; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`,
      `user-name=${encodeURIComponent(user.name)}; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`,
      `user-role=${user.role}; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`
    ])

    // 리디렉션 URL 결정
    let redirectUrl = '/dashboard'
    
    if (redirect && typeof redirect === 'string') {
      redirectUrl = redirect
    } else if (emailToken.purpose === 'task_completion' && emailToken.task_id) {
      // 업무 완료 목적인 경우 완료 처리 후 대시보드로
      redirectUrl = `/dashboard?completed_task=${emailToken.task_id}&auto_login=true`
    }

    console.log(`[EMAIL_LOGIN] 자동 로그인 성공 - 리디렉션 실행: ${user.email} -> ${redirectUrl}`)

    return res.redirect(302, redirectUrl)

  } catch (error) {
    console.error('이메일 토큰 인증 오류:', error)
    const redirectUrl = `/login?error=${encodeURIComponent('인증 처리 중 오류가 발생했습니다.')}`
    return res.redirect(302, redirectUrl)
  }
}
