import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function TaskCompletePage() {
  const router = useRouter()
  const { task_id, completed_by, status, message } = router.query
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      // 5초 후 로그인 페이지로 리디렉션
      router.push('/login')
    }
  }, [countdown, router])

  const loginNow = () => {
    router.push('/login')
  }

  if (status === 'success') {
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
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                ✅ 업무 완료됨!
              </h2>
              
              <p className="text-gray-600 mb-2">
                업무가 성공적으로 완료 처리되었습니다.
              </p>
              
              {completed_by && (
                <p className="text-sm text-gray-500 mb-6">
                  완료자: {completed_by}
                </p>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  대시보드에서 완료 상태를 확인하시려면 로그인해주세요.
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  {countdown}초 후 자동으로 로그인 페이지로 이동합니다.
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={loginNow}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  지금 로그인하기
                </button>
                
                <button
                  onClick={() => window.close()}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  창 닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                ❌ 완료 처리 실패
              </h2>
              
              <p className="text-gray-600 mb-6">
                업무 완료 처리 중 오류가 발생했습니다.
              </p>
              
              {message && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                  <p className="text-red-800 text-sm">{message}</p>
                </div>
              )}
              
              <div className="space-y-3">
                <button
                  onClick={loginNow}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  로그인하여 대시보드에서 처리
                </button>
                
                <button
                  onClick={() => window.close()}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  창 닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 로딩 상태
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">처리 중...</h2>
            <p className="text-gray-600">업무 완료를 처리하고 있습니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
