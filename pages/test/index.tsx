import { useState } from 'react'
import Head from 'next/head'

export default function TestPage() {
  const [emailRecipient, setEmailRecipient] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const sendTestEmail = async () => {
    if (!emailRecipient) {
      alert('이메일 주소를 입력해주세요.')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/email/send-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: [emailRecipient],
          test_mode: true
        })
      })

      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        alert('테스트 이메일이 발송되었습니다!')
      } else {
        alert('이메일 발송에 실패했습니다: ' + data.message)
      }
    } catch (error) {
      console.error('API 호출 실패:', error)
      alert('API 호출 중 오류가 발생했습니다.')
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testTasksAPI = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Tasks API 호출 실패:', error)
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const createSampleTask = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '테스트 업무',
          description: '테스트용 샘플 업무입니다.',
          assignee: emailRecipient || 'test@example.com',
          frequency: 'daily',
          frequency_details: {},
          due_date: new Date().toISOString().split('T')[0] // 오늘 날짜
        })
      })

      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        alert('샘플 업무가 생성되었습니다!')
      } else {
        alert('업무 생성에 실패했습니다: ' + data.message)
      }
    } catch (error) {
      console.error('업무 생성 실패:', error)
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>API 테스트 - 주기별 업무 관리 시스템</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              🧪 API 테스트 페이지
            </h1>

            {/* 이메일 입력 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                테스트용 이메일 주소
              </label>
              <input
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="test@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 테스트 버튼들 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button
                onClick={testTasksAPI}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                📋 업무 목록 API 테스트
              </button>

              <button
                onClick={createSampleTask}
                disabled={loading || !emailRecipient}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                ➕ 샘플 업무 생성
              </button>

              <button
                onClick={sendTestEmail}
                disabled={loading || !emailRecipient}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                📧 테스트 이메일 발송
              </button>
            </div>

            {/* 로딩 상태 */}
            {loading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">처리 중...</p>
              </div>
            )}

            {/* 결과 표시 */}
            {result && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">API 응답 결과:</h3>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}

            {/* 연결 상태 확인 */}
            <div className="mt-8 p-4 bg-blue-50 rounded-md">
              <h3 className="text-lg font-medium text-blue-900 mb-2">연결 상태:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✅ Next.js 서버: 실행 중</li>
                <li>✅ API 라우트: 활성화</li>
                <li>⚠️ Supabase: 환경 변수 확인 필요</li>
                <li>⚠️ Gmail SMTP: 환경 변수 확인 필요</li>
              </ul>
            </div>

            {/* 링크 */}
            <div className="mt-6 flex space-x-4">
              <a
                href="/dashboard"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                📊 대시보드로 이동
              </a>
              <a
                href="/"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                🏠 홈으로 이동
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
