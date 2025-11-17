import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { ApiResponse } from '@/types'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // 로그인 페이지에서는 항상 로그인 화면을 보여줌 (다중 사용자 환경)
    // 기존 세션이 있어도 명시적으로 로그인하도록 함

    // URL 파라미터에서 이메일과 메시지 처리
    const { message, error: urlError, email: urlEmail, redirect } = router.query
    
    // 이메일 파라미터가 있으면 자동으로 입력 필드에 설정
    if (urlEmail && typeof urlEmail === 'string') {
      setEmail(urlEmail)
      console.log('이메일 자동 설정:', urlEmail)
      
      // 이메일이 있으면 자동 로그인 시도 (임시 비밀번호로)
      if (urlEmail.includes('@')) {
        setPassword('temp123') // 임시 비밀번호
        console.log('자동 로그인 시도 중...')
        
        // 약간의 딜레이 후 자동 로그인
        setTimeout(() => {
          handleAutoLogin(urlEmail, redirect as string)
        }, 500)
      }
    }
    
    if (message && typeof message === 'string') {
      // 성공 메시지는 콘솔에만 표시 (UI는 깔끔하게 유지)
      console.log('알림:', message)
    }
    if (urlError && typeof urlError === 'string') {
      setError(urlError)
    }
  }, [router])

  // 자동 로그인 함수
  const handleAutoLogin = async (userEmail: string, redirectUrl?: string) => {
    try {
      setLoading(true)
      console.log('자동 로그인 시도:', { userEmail, redirectUrl })
      
      // 임시 비밀번호로 로그인 시도
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: userEmail, 
          password: 'temp123' 
        })
      })

      if (response.ok) {
        const data: ApiResponse = await response.json()
        console.log('자동 로그인 성공:', data)
        
        if (data.success && data.data?.token) {
          // 토큰 저장
          localStorage.setItem('authToken', data.data.token)
          localStorage.setItem('currentUser', JSON.stringify(data.data.user))
          
          // 리다이렉트 URL이 있으면 해당 페이지로, 없으면 사용자별 대시보드로
          const targetUrl = redirectUrl || `/dashboard?user=${encodeURIComponent(userEmail)}`
          console.log('리다이렉트:', targetUrl)
          router.push(targetUrl)
          return
        }
      }
      
      // 자동 로그인 실패시 수동 로그인 유도
      console.log('자동 로그인 실패, 수동 로그인 필요')
      setLoading(false)
    } catch (error) {
      console.error('자동 로그인 오류:', error)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const body = isLogin 
        ? { email, password }
        : { email, password, name }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('HTTP Error:', response.status, errorText)
        
        if (response.status >= 500) {
          setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        } else if (response.status === 409) {
          setError('이미 등록된 이메일입니다.')
        } else if (response.status === 401) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        } else {
          setError(`요청 처리 중 오류가 발생했습니다. (${response.status})`)
        }
        return
      }

      const result: ApiResponse = await response.json()

      if (result.success) {
        // 로그인 성공 시 사용자 정보 저장
        localStorage.setItem('currentUser', JSON.stringify(result.data.user))
        localStorage.setItem('authToken', result.data.token)
        
        // 사용자 이메일을 파라미터로 포함하여 대시보드로 리다이렉트
        const userEmail = result.data.user.email
        router.push(`/dashboard?user=${encodeURIComponent(userEmail)}`)
      } else {
        setError(result.error || (isLogin ? '로그인에 실패했습니다.' : '회원가입에 실패했습니다.'))
      }
    } catch (error) {
      console.error('Auth error:', error)
      setError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError(null)
    setEmail('')
    setPassword('')
    setName('')
  }

  return (
    <>
      <Head>
        <title>{isLogin ? '로그인' : '회원가입'} - 업무 관리 시스템</title>
        <meta name="description" content="업무 관리 시스템 로그인" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">📋</h1>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {isLogin ? '로그인' : '회원가입'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              업무 관리 시스템에 {isLogin ? '로그인' : '가입'}하세요
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-600">{error}</div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    이름
                  </label>
                  <div className="mt-1">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required={!isLogin}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="홍길동"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  이메일 주소
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="user@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  비밀번호
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
                {!isLogin && (
                  <p className="mt-1 text-xs text-gray-500">6자 이상 입력해주세요</p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      처리 중...
                    </div>
                  ) : (
                    isLogin ? '로그인' : '회원가입'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">또는</span>
                </div>
              </div>

              <div className="mt-6 text-center space-y-2">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium block w-full"
                >
                  {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
                </button>
                
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => router.push('/forgot-password')}
                    className="text-gray-600 hover:text-gray-500 text-sm block w-full"
                  >
                    비밀번호를 잊으셨나요?
                  </button>
                )}
              </div>
            </div>

            {/* 임시 테스트 계정 안내 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-2">테스트 계정</h4>
              <p className="text-xs text-gray-600 mb-1">
                <strong>이메일:</strong> test@example.com
              </p>
              <p className="text-xs text-gray-600">
                <strong>비밀번호:</strong> test123
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
