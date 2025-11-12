import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function SimpleLogin() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const handleTestLogin = () => {
    setLoading(true)
    
    // 테스트 사용자 정보
    const testUser = {
      id: 'test-user-1',
      email: 'bae.jae.kwon@drbworld.com',
      name: '배재권',
      role: 'admin',
      created_at: new Date().toISOString()
    }
    
    // 테스트 토큰 생성
    const testToken = Buffer.from(JSON.stringify({
      userId: testUser.id,
      email: testUser.email,
      name: testUser.name,
      role: testUser.role,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24시간 후 만료
    })).toString('base64')
    
    // localStorage에 저장
    localStorage.setItem('currentUser', JSON.stringify(testUser))
    localStorage.setItem('authToken', testToken)
    
    console.log('✅ 테스트 로그인 완료:', testUser)
    
    // 대시보드로 이동
    setTimeout(() => {
      router.push('/dashboard')
    }, 500)
  }

  const handleQuickAccess = () => {
    // 즉시 대시보드로 이동 (인증 우회)
    router.push('/dashboard')
  }

  return (
    <>
      <Head>
        <title>간단 로그인 - 업무 관리 시스템</title>
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              📋 업무 관리 시스템
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              간단 로그인 페이지
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              
              {/* 테스트 로그인 */}
              <div>
                <button
                  onClick={handleTestLogin}
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? '로그인 중...' : '🚀 테스트 로그인 (관리자)'}
                </button>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  bae.jae.kwon@drbworld.com (관리자)로 자동 로그인
                </p>
              </div>

              {/* 구분선 */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">또는</span>
                </div>
              </div>

              {/* 빠른 접근 */}
              <div>
                <button
                  onClick={handleQuickAccess}
                  className="w-full flex justify-center py-3 px-4 border-2 border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  ⚡ 빠른 접근 (인증 우회)
                </button>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  인증 없이 대시보드에 바로 접근
                </p>
              </div>

              {/* 기본 로그인 페이지로 */}
              <div className="text-center">
                <button
                  onClick={() => router.push('/login')}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  🔐 일반 로그인 페이지로 이동
                </button>
              </div>

            </div>

            {/* 시스템 정보 */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  🎯 대시보드 직접 링크
                </p>
                <p className="text-xs text-blue-600 font-mono mt-1">
                  https://periodic-task-manager.vercel.app/dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
