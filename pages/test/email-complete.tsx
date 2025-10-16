import { useState } from 'react'
import Head from 'next/head'

export default function EmailCompleteTest() {
  const [taskId, setTaskId] = useState('')
  const [email, setEmail] = useState('bae.jae.kwon@drbworld.com')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testEmailComplete = async () => {
    if (!taskId.trim()) {
      alert('업무 ID를 입력해주세요.')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      // 이메일 완료 링크 시뮬레이션
      const url = `/api/tasks/${taskId}/complete?completed_by=${encodeURIComponent(email)}`
      
      // GET 요청으로 완료 처리 (이메일에서 오는 방식)
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual' // 리디렉션을 수동으로 처리
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)

      if (response.status === 0) {
        // redirect가 발생한 경우
        setResult({
          success: true,
          message: '완료 처리 후 리디렉션 발생 (정상)',
          status: response.status,
          redirected: true
        })
      } else if (response.ok) {
        const data = await response.json()
        setResult({
          success: true,
          message: '완료 처리 성공',
          data
        })
      } else {
        const errorText = await response.text()
        setResult({
          success: false,
          message: `완료 처리 실패: ${response.status}`,
          error: errorText
        })
      }
    } catch (error) {
      console.error('테스트 오류:', error)
      setResult({
        success: false,
        message: '테스트 중 오류 발생',
        error: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setLoading(false)
    }
  }

  const openEmailCompleteLink = () => {
    if (!taskId.trim()) {
      alert('업무 ID를 입력해주세요.')
      return
    }

    const url = `/api/tasks/${taskId}/complete?completed_by=${encodeURIComponent(email)}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Head>
        <title>이메일 완료 테스트 - 업무 관리</title>
      </Head>

      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">📧 이메일 완료 테스트</h1>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="space-y-6">
            {/* 입력 필드들 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                업무 ID *
              </label>
              <input
                type="text"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="예: 123e4567-e89b-12d3-a456-426614174000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                대시보드에서 업무 ID를 복사해서 입력하세요
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                완료자 이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 테스트 버튼들 */}
            <div className="flex space-x-4">
              <button
                onClick={testEmailComplete}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '테스트 중...' : '🧪 완료 처리 테스트'}
              </button>

              <button
                onClick={openEmailCompleteLink}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                🔗 새 탭에서 완료 링크 열기
              </button>
            </div>

            {/* 사용법 안내 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📋 사용법</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. 대시보드에서 테스트할 업무의 ID를 복사</li>
                <li>2. 위 입력란에 업무 ID 붙여넣기</li>
                <li>3. "새 탭에서 완료 링크 열기" 버튼 클릭</li>
                <li>4. 자동 로그인 후 대시보드로 이동하는지 확인</li>
                <li>5. 해당 업무가 완료 처리되었는지 확인</li>
              </ol>
            </div>

            {/* 결과 표시 */}
            {result && (
              <div className={`border rounded-lg p-4 ${
                result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <h3 className={`font-semibold mb-2 ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {result.success ? '✅ 테스트 결과' : '❌ 테스트 실패'}
                </h3>
                <p className={`text-sm mb-2 ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.message}
                </p>
                
                {result.data && (
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
                
                {result.error && (
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto text-red-600">
                    {result.error}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← 대시보드로 돌아가기
          </a>
        </div>
      </div>
    </div>
  )
}
