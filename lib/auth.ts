import { NextApiRequest, NextApiResponse } from 'next'
import { User } from '@/types'

// 사용자 정보를 포함한 확장된 NextApiRequest
export interface AuthenticatedRequest extends NextApiRequest {
  user?: User
}

// 인증 토큰 검증 함수
export function verifyToken(token: string): User | null {
  try {
    // 간단한 Base64 디코딩 방식 (실제 운영에서는 JWT 사용 권장)
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
    
    // 토큰 만료 확인
    if (decoded.exp && Date.now() > decoded.exp) {
      return null
    }

    return {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name || 'Unknown',
      role: decoded.role || 'user',
      created_at: new Date().toISOString()
    }
  } catch (error) {
    console.error('토큰 검증 실패:', error)
    return null
  }
}

// 토큰 생성 함수
export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7일 후 만료
  }
  
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

// 인증 미들웨어
export function withAuth(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: '인증 토큰이 필요합니다.'
        })
      }

      const token = authHeader.substring(7)
      const user = verifyToken(token)

      if (!user) {
        return res.status(401).json({
          success: false,
          error: '유효하지 않은 토큰입니다.'
        })
      }

      // 사용자 정보를 request에 추가
      req.user = user

      return handler(req, res)
    } catch (error) {
      console.error('인증 미들웨어 오류:', error)
      return res.status(500).json({
        success: false,
        error: '인증 처리 중 오류가 발생했습니다.'
      })
    }
  }
}

// 관리자 권한 확인 미들웨어
export function withAdminAuth(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
  return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다.'
      })
    }

    return handler(req, res)
  })
}

// 클라이언트 측 인증 확인 함수
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  
  try {
    // 1. 먼저 localStorage에서 확인 (일반 로그인)
    let userStr = localStorage.getItem('currentUser')
    let token = localStorage.getItem('authToken')
    
    if (userStr && token) {
      const user = JSON.parse(userStr)
      const tokenData = verifyToken(token)
      
      if (tokenData) {
        return user
      } else {
        // 토큰이 만료된 경우 스토리지 정리
        localStorage.removeItem('currentUser')
        localStorage.removeItem('authToken')
      }
    }
    
    // 2. localStorage에 없으면 쿠키에서 확인 (이메일 자동 로그인용)
    const cookieToken = getCookie('auth-token')
    const cookieEmail = getCookie('user-email')
    const cookieName = getCookie('user-name')
    const cookieRole = getCookie('user-role')
    
    if (cookieToken && cookieEmail) {
      // 쿠키 토큰 유효성 검사
      const tokenData = verifyToken(cookieToken)
      if (!tokenData) {
        // 쿠키 토큰이 만료된 경우 쿠키 정리
        const authCookies = ['auth-token', 'user-email', 'user-name', 'user-role']
        authCookies.forEach(cookieName => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`
        })
        return null
      }
      
      // 쿠키에서 사용자 정보 복원
      const user: User = {
        id: 'email-user', // 임시 ID
        email: cookieEmail,
        name: cookieName ? decodeURIComponent(cookieName) : cookieEmail.split('@')[0],
        role: (cookieRole === 'admin' ? 'admin' : 'user') as 'user' | 'admin',
        created_at: new Date().toISOString()
      }
      
      // 메일 세션임을 표시
      sessionStorage.setItem('emailSession', 'true')
      
      return user
    }
    
    return null
  } catch (error) {
    console.error('사용자 정보 로드 실패:', error)
    return null
  }
}

// 쿠키 읽기 헬퍼 함수
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift()
    return cookieValue || null
  }
  return null
}

// 메일 세션 여부 확인 함수
export function isEmailSession(): boolean {
  if (typeof window === 'undefined') return false
  
  // 1. sessionStorage에서 확인
  const emailSessionFlag = sessionStorage.getItem('emailSession')
  if (emailSessionFlag === 'true') return true
  
  // 2. localStorage에 일반 로그인 정보가 없으면서 쿠키에 auth-token이 있으면 메일 세션
  const hasLocalStorage = localStorage.getItem('currentUser') && localStorage.getItem('authToken')
  const hasCookie = getCookie('auth-token')
  
  return !hasLocalStorage && !!hasCookie
}

// 로그아웃 함수 (세션 유형에 따라 다르게 처리)
export function logout(force: boolean = false) {
  if (typeof window !== 'undefined') {
    const emailSession = isEmailSession()
    console.log('로그아웃 시작...', { emailSession, force })
    
    // 로컬 스토리지 정리 (일반 로그인)
    localStorage.removeItem('currentUser')
    localStorage.removeItem('authToken')
    
    // 세션 스토리지 정리
    sessionStorage.clear()
    
    // 쿠키 정리 (메일 세션)
    if (emailSession || force) {
      const authCookies = ['auth-token', 'user-email', 'user-name', 'user-role']
      authCookies.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`
      })
      
      // 전체 쿠키 정리 (백업용)
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    }
    
    console.log('로그아웃 완료: 모든 인증 정보 정리됨')
    
    // 페이지 리로드로 완전한 초기화
    window.location.replace('/login')
  }
}

// 메일 세션만 정리하는 함수 (자동 로그아웃용)
export function clearEmailSession() {
  if (typeof window !== 'undefined' && isEmailSession()) {
    console.log('메일 세션 자동 정리...')
    
    // 쿠키만 정리 (localStorage는 유지)
    const authCookies = ['auth-token', 'user-email', 'user-name', 'user-role']
    authCookies.forEach(cookieName => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`
    })
    
    // 세션 스토리지에서 메일 세션 플래그 제거
    sessionStorage.removeItem('emailSession')
    
    console.log('메일 세션 정리 완료')
  }
}

// 인증된 API 요청을 위한 헤더 생성
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return { 'Content-Type': 'application/json' }
  }
  
  // localStorage에서 먼저 확인
  let token = localStorage.getItem('authToken')
  
  // localStorage에 없으면 쿠키에서 확인
  if (!token) {
    token = getCookie('auth-token')
  }
  
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}
