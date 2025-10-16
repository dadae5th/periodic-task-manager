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
    // 1. 먼저 localStorage에서 확인
    let userStr = localStorage.getItem('currentUser')
    let token = localStorage.getItem('authToken')
    
    // 2. localStorage에 없으면 쿠키에서 확인 (이메일 자동 로그인용)
    if (!userStr || !token) {
      const cookieToken = getCookie('auth-token')
      const cookieEmail = getCookie('user-email')
      const cookieName = getCookie('user-name')
      const cookieRole = getCookie('user-role')
      
      if (cookieToken && cookieEmail) {
        // 쿠키에서 사용자 정보 복원
        const user: User = {
          id: 'email-user', // 임시 ID
          email: cookieEmail,
          name: cookieName ? decodeURIComponent(cookieName) : cookieEmail.split('@')[0],
          role: (cookieRole === 'admin' ? 'admin' : 'user') as 'user' | 'admin',
          created_at: new Date().toISOString()
        }
        
        // localStorage에도 저장 (일관성 유지)
        localStorage.setItem('currentUser', JSON.stringify(user))
        localStorage.setItem('authToken', cookieToken)
        
        return user
      }
      
      return null
    }
    
    const user = JSON.parse(userStr)
    const tokenData = verifyToken(token)
    
    if (!tokenData) {
      // 토큰이 만료된 경우 스토리지 정리
      localStorage.removeItem('currentUser')
      localStorage.removeItem('authToken')
      return null
    }
    
    return user
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

// 로그아웃 함수 (완전한 세션 정리)
export function logout() {
  if (typeof window !== 'undefined') {
    // 로컬 스토리지 완전 정리
    localStorage.removeItem('currentUser')
    localStorage.removeItem('authToken')
    
    // 세션 스토리지도 정리 (있다면)
    sessionStorage.clear()
    
    // 쿠키 정리 (auth 관련)
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // 페이지 리로드로 완전한 초기화
    window.location.replace('/login')
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
