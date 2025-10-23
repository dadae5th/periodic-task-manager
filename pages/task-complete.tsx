import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function TaskCompletePage() {
  const router = useRouter()
  const { token, task, user, message } = router.query
  const [countdown, setCountdown] = useState(3)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    console.log('TaskCompletePage 파라미터:', { token, task, user, message })
    
    if (token && user) {
      // 토큰을 localStorage에 저장하고 대시보드로 리다이렉트
      try {
        console.log('토큰 저장 시도:', { token: token as string, user: user })
        localStorage.setItem('authToken', token as string)
        localStorage.setItem('currentUser', JSON.stringify({
          email: user,
          name: (user as string).split('@')[0],
          role: 'user'
        }))
        console.log('자동 로그인 토큰 저장됨:', { token: token, user: user })
        
        setIsProcessing(false)
        
        // 3초 카운트다운 후 대시보드로 이동
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              router.push('/dashboard')
              return 0
            }
            return prev - 1
          })
        }, 1000)

        return () => clearInterval(timer)
      } catch (error) {
        console.error('토큰 저장 실패:', error)
        setIsProcessing(false)
        router.push('/login')
      }
    } else {
      // 토큰이 없으면 로그인 페이지로
      console.log('토큰 또는 사용자 정보가 없음:', { token, user })
      setIsProcessing(false)
      router.push('/login')
    }
  }, [token, user, router])

  const goToDashboard = () => {
    router.push('/dashboard')
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">업무 완료 처리 중...</h2>
              <p className="text-sm text-gray-600">잠시만 기다려주세요.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">✅ 업무 완료!</h2>
            <p className="text-gray-600 mb-6">
              {message || '업무가 성공적으로 완료되었습니다.'}
            </p>
            
            {user && (
              <p className="text-sm text-gray-500 mb-4">
                로그인 사용자: {user}
              </p>
            )}
            
            <div className="space-y-4">
              <p className="text-gray-600">
                {countdown}초 후 대시보드로 자동 이동됩니다...
              </p>
              
              <button
                onClick={goToDashboard}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                지금 대시보드로 이동
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
