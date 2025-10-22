import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { User, ApiResponse } from '@/types'
import { getCurrentUser, logout, getAuthHeaders } from '@/lib/auth'

export default function Users() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 사용자 인증 및 관리자 권한 체크
  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push('/login')
      return
    }
    if (user.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    setCurrentUser(user)
    loadUsers()
  }, [router])

  // 사용자 목록 로드
  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/users', {
        headers: getAuthHeaders()
      })

      const result: ApiResponse = await response.json()
      
      if (result.success) {
        setUsers(result.data || [])
      } else {
        setError(result.error || '사용자 목록을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error)
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 사용자 역할 변경
  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole })
      })

      const result: ApiResponse = await response.json()
      
      if (result.success) {
        await loadUsers()
        alert('사용자 역할이 변경되었습니다.')
      } else {
        alert(`역할 변경 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('역할 변경 실패:', error)
      alert('역할 변경 중 오류가 발생했습니다.')
    }
  }

  // 사용자 삭제
  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`정말로 "${userName}" 사용자를 삭제하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      const result: ApiResponse = await response.json()
      
      if (result.success) {
        await loadUsers()
        alert('사용자가 삭제되었습니다.')
      } else {
        alert(`사용자 삭제 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('사용자 삭제 실패:', error)
      alert('사용자 삭제 중 오류가 발생했습니다.')
    }
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">권한 확인 중...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>사용자 관리 - 업무 관리 시스템</title>
        <meta name="description" content="사용자 관리 페이지" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ← 대시보드로
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                  👥 사용자 관리
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{currentUser.name}</div>
                  <div className="text-gray-500">{currentUser.email}</div>
                </div>
                <button
                  onClick={() => logout()}
                  className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-3 py-1 hover:bg-gray-50"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 로딩 및 에러 상태 */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                사용자 목록을 불러오는 중...
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">오류 발생</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={loadUsers}
                      className="bg-red-100 px-2 py-1 rounded-md text-red-800 text-sm font-medium hover:bg-red-200"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 사용자 목록 */}
          {!loading && !error && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">
                  등록된 사용자 ({users.length}명)
                </h2>
                <button
                  onClick={loadUsers}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600"
                >
                  새로고침
                </button>
              </div>

              <div className="divide-y divide-gray-200">
                {users.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-gray-500">등록된 사용자가 없습니다.</p>
                  </div>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-sm font-medium text-gray-900">
                              {user.name}
                            </h3>
                            
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role === 'admin' ? '관리자' : '사용자'}
                            </span>

                            {user.id === currentUser.id && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                현재 사용자
                              </span>
                            )}
                          </div>

                          <div className="mt-1 text-sm text-gray-500">
                            이메일: {user.email} | 
                            가입일: {new Date(user.created_at).toLocaleDateString('ko-KR')}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {user.id !== currentUser.id && (
                            <>
                              <select
                                value={user.role}
                                onChange={(e) => updateUserRole(user.id, e.target.value as 'admin' | 'user')}
                                className="text-xs border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="user">사용자</option>
                                <option value="admin">관리자</option>
                              </select>
                              
                              <button
                                onClick={() => deleteUser(user.id, user.name)}
                                className="px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600"
                              >
                                삭제
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
