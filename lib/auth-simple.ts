import { NextApiRequest, NextApiResponse } from 'next'
import { User } from '@/types'

// 사용자 정보를 포함한 확장된 NextApiRequest
export interface AuthenticatedRequest extends NextApiRequest {
  user?: User
}

// 토큰 생성 함수 (간단한 Base64 인코딩)
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

// 토큰 검증 함수
export function verifyToken(token: string): User | null {
  try {
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

// 클라이언트 측 현재 사용자 확인
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  
  try {
    // localStorage에서 사용자 정보 확인
    const userStr = localStorage.getItem('currentUser')
    const token = localStorage.getItem('authToken')
    
    if (userStr && token) {
      const user = JSON.parse(userStr)
      const tokenData = verifyToken(token)
      
      if (tokenData) {
        return user
      } else {
        // 토큰 만료시 정리
        localStorage.removeItem('currentUser')
        localStorage.removeItem('authToken')
      }
    }
    
    return null
  } catch (error) {
    console.error('사용자 정보 확인 실패:', error)
    return null
  }
}

// 로그인 처리
export function login(user: User, token: string): void {
  if (typeof window === 'undefined') return
  
  localStorage.setItem('currentUser', JSON.stringify(user))
  localStorage.setItem('authToken', token)
}

// 로그아웃 처리
export function logout(): void {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem('currentUser')
  localStorage.removeItem('authToken')
  
  // 페이지 새로고침
  window.location.href = '/'
}

// API 요청용 헤더 생성
export function getAuthHeaders(): { [key: string]: string } {
  const token = localStorage.getItem('authToken')
  
  if (!token) {
    return {}
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

// 쿠키 읽기 유틸리티
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  
  return null
}

// 이메일 자동 로그인용 토큰 생성 (5분 만료)
export function generateEmailToken(user: User): string {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + (5 * 60 * 1000) // 5분 후 만료
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
