import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Task, ApiResponse, User } from '@/types'
import { formatKSTDate, calculateKSTDDay, isOverdueKST, getKSTToday } from '@/lib/kst-utils'

interface DashboardStats {
  total_tasks: number
  completed_today: number
  overdue_tasks: number
  pending_tasks: number
  completion_rate: number
  today_tasks: number
  today_completion_rate: number
}

interface NewTask {
  title: string
  description: string
  assignee: string
  frequency: 'once' | 'daily' | 'weekly' | 'monthly'
  due_date: string
}

// 유틸리티 함수들 (한국 시간 기준)
const formatDate = (dateString: string): string => {
  return formatKSTDate(dateString)
}

const formatDDay = (dateString: string): string => {
  return calculateKSTDDay(dateString)
}

const getFrequencyDescription = (frequency: string): string => {
  switch (frequency) {
    case 'once': return '일회성'
    case 'daily': return '매일'
    case 'weekly': return '매주'
    case 'monthly': return '매월'
    default: return frequency
  }
}

export default function Dashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    total_tasks: 0,
    completed_today: 0,
    overdue_tasks: 0,
    pending_tasks: 0,
    completion_rate: 0,
    today_tasks: 0,
    today_completion_rate: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewMode, setViewMode] = useState<'active' | 'all'>('active')

  // 다중 선택 삭제 관련 state
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const [newTask, setNewTask] = useState<NewTask>({
    title: '',
    description: '',
    assignee: '',
    frequency: 'once',
    due_date: getKSTToday()
  })

  // 초기 데이터 로드
  useEffect(() => {
    const initializeDashboard = async () => {
      // 오래된 토큰 클리어
      try {
        localStorage.removeItem('authToken')
        localStorage.removeItem('currentUser')
      } catch (e) {
        console.log('토큰 클리어 실행됨')
      }
      
      // URL 파라미터에서 사용자 정보 확인
      const urlParams = new URLSearchParams(window.location.search)
      const userParam = urlParams.get('user')
      
      let targetUser: User
      
      if (userParam) {
        targetUser = {
          id: `user-${userParam}`,
          email: userParam,
          name: userParam.split('@')[0],
          role: 'admin',
          created_at: new Date().toISOString()
        }
        setCurrentUser(targetUser)
        setNewTask(prev => ({ ...prev, assignee: userParam }))
      } else {
        targetUser = {
          id: 'default-user',
          email: 'bae.jae.kwon@drbworld.com',
          name: '배재권',
          role: 'admin',
          created_at: new Date().toISOString()
        }
        setCurrentUser(targetUser)
        setNewTask(prev => ({ ...prev, assignee: 'bae.jae.kwon@drbworld.com' }))
      }
      
      // 사용자 정보를 직접 전달하여 업무 로드
      await loadTasksForUser(targetUser.email)
    }
    
    initializeDashboard()
  }, [])

  // 특정 사용자의 업무 목록 로드
  const loadTasksForUser = async (userEmail: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`${userEmail} 사용자의 업무를 로드합니다.`)
      
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Email': userEmail
      }
      
      const response = await fetch('/api/tasks', { headers })
      const result: ApiResponse = await response.json()
      
      if (result.success && result.data?.tasks) {
        console.log(`${userEmail}의 업무 ${result.data.tasks.length}개 로드됨`)
        setTasks(result.data.tasks)
        if (result.data.stats) {
          setStats(result.data.stats)
        }
      } else {
        throw new Error(result.message || '업무를 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('업무 로드 실패:', error)
      setError(error instanceof Error ? error.message : '업무를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 현재 사용자의 업무 목록 로드
  const loadTasks = async () => {
    const userEmail = currentUser?.email || 'bae.jae.kwon@drbworld.com'
    await loadTasksForUser(userEmail)
  }

  // 업무 삭제
  const deleteTask = async (taskId: string) => {
    if (!confirm('정말로 이 업무를 삭제하시겠습니까?')) return

    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Email': currentUser?.email || 'bae.jae.kwon@drbworld.com'
      }
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers
      })
      const result: ApiResponse = await response.json()
      
      if (result.success) {
        await loadTasks()
        alert('업무가 삭제되었습니다.')
      } else {
        alert(`삭제 실패: ${result.message}`)
      }
    } catch (error) {
      console.error('업무 삭제 실패:', error)
      alert('업무 삭제 중 오류가 발생했습니다.')
    }
  }

  // 다중 선택 관련 함수들
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode)
    setSelectedTasks(new Set())
  }

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const selectAllTasks = () => {
    const filteredTasks = viewMode === 'active' 
      ? tasks.filter(task => !task.completed)
      : tasks
    const allTaskIds = filteredTasks.map(task => task.id)
    setSelectedTasks(new Set(allTaskIds))
  }

  const deselectAllTasks = () => {
    setSelectedTasks(new Set())
  }

  const bulkDeleteTasks = async () => {
    if (selectedTasks.size === 0) {
      alert('삭제할 업무를 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedTasks.size}개의 업무를 모두 삭제하시겠습니까?`)) {
      return
    }

    setIsBulkDeleting(true)
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Email': currentUser?.email || 'bae.jae.kwon@drbworld.com'
      }

      const deletePromises = Array.from(selectedTasks).map(taskId =>
        fetch(`/api/tasks/${taskId}`, { method: 'DELETE', headers })
      )

      const responses = await Promise.all(deletePromises)
      const results = await Promise.all(responses.map(res => res.json()))
      
      const successCount = results.filter(result => result.success).length
      const failCount = results.length - successCount

      if (failCount === 0) {
        alert(`${successCount}개의 업무가 모두 삭제되었습니다.`)
      } else {
        alert(`${successCount}개 성공, ${failCount}개 실패했습니다.`)
      }

      setSelectedTasks(new Set())
      setIsSelectMode(false)
      await loadTasks()

    } catch (error) {
      console.error('일괄 삭제 실패:', error)
      alert('일괄 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  // 업무 완료 처리
  const completeTask = async (taskId: string, completedBy: string) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Email': currentUser?.email || 'bae.jae.kwon@drbworld.com'
      }
      
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ completed_by: completedBy })
      })
      
      const result: ApiResponse = await response.json()
      
      if (result.success) {
        await loadTasks()
        alert('업무가 완료 처리되었습니다.')
      } else {
        alert(`완료 처리 실패: ${result.message}`)
      }
    } catch (error) {
      console.error('완료 처리 실패:', error)
      alert('완료 처리 중 오류가 발생했습니다.')
    }
  }

  // 업무 추가
  const addTask = async () => {
    if (!newTask.title.trim()) {
      alert('업무 제목을 입력해주세요.')
      return
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Email': currentUser?.email || 'bae.jae.kwon@drbworld.com'
      }
      
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(newTask)
      })

      const result: ApiResponse = await response.json()
      
      if (result.success) {
        setNewTask({
          title: '',
          description: '',
          assignee: currentUser?.email || 'bae.jae.kwon@drbworld.com',
          frequency: 'once',
          due_date: getKSTToday()
        })
        setShowAddModal(false)
        await loadTasks()
        alert('업무가 추가되었습니다.')
      } else {
        alert(`업무 추가 실패: ${result.message}`)
      }
    } catch (error) {
      console.error('업무 추가 실패:', error)
      alert('업무 추가 중 오류가 발생했습니다.')
    }
  }

  const filteredTasks = viewMode === 'active' 
    ? tasks.filter(task => !task.completed)
    : tasks

  return (
    <>
      <Head>
        <title>업무 관리 대시보드</title>
        <meta name="description" content="주기별 업무 관리 시스템" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">
                📋 업무 관리 대시보드
              </h1>
              
              <div className="flex items-center space-x-4">
                {currentUser && (
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{currentUser.name}</div>
                    <div className="text-gray-500">{currentUser.email}</div>
                  </div>
                )}
                
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm font-medium hover:bg-gray-600"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* 통계 카드 */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📊</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">전체 업무</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_tasks}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">✅</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">오늘 완료</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.completed_today}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">🚨</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">지연 업무</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.overdue_tasks}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">⏳</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">대기 업무</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pending_tasks}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📈</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">완료율</p>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(stats.completion_rate)}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 업무 목록 */}
          {!loading && !error && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">
                  업무 목록 ({filteredTasks.length}개)
                </h2>
                
                <div className="flex items-center gap-2">
                  {/* 일괄삭제 버튼 */}
                  <button
                    onClick={toggleSelectMode}
                    className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 border-2 border-red-700"
                  >
                    🗑️ 일괄삭제
                  </button>

                  {/* 선택 모드일 때 추가 버튼들 */}
                  {isSelectMode && (
                    <>
                      <span className="text-sm text-gray-600 bg-yellow-100 px-2 py-1 rounded">
                        {selectedTasks.size}개 선택됨
                      </span>
                      <button
                        onClick={selectAllTasks}
                        className="px-3 py-1 bg-gray-500 text-white rounded text-sm font-medium hover:bg-gray-600"
                      >
                        전체선택
                      </button>
                      <button
                        onClick={deselectAllTasks}
                        className="px-3 py-1 bg-gray-400 text-white rounded text-sm font-medium hover:bg-gray-500"
                      >
                        선택해제
                      </button>
                      <button
                        onClick={bulkDeleteTasks}
                        disabled={selectedTasks.size === 0 || isBulkDeleting}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        {isBulkDeleting ? '삭제중...' : `${selectedTasks.size}개삭제`}
                      </button>
                      <button
                        onClick={toggleSelectMode}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-400"
                      >
                        취소
                      </button>
                    </>
                  )}

                  <button
                    onClick={loadTasks}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading ? '로딩중...' : '새로고침'}
                  </button>
                  
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600"
                  >
                    + 업무 추가
                  </button>
                </div>
              </div>
              
              {/* 탭 네비게이션 */}
              <div className="px-6 py-3 border-b border-gray-200">
                <div className="flex space-x-8">
                  <button
                    onClick={() => setViewMode('active')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      viewMode === 'active'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    진행 중 업무 ({tasks.filter(task => !task.completed).length}개)
                  </button>
                  <button
                    onClick={() => setViewMode('all')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      viewMode === 'all'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    전체 업무 ({tasks.length}개)
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {filteredTasks.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-gray-500">
                      {viewMode === 'active' ? '진행 중인 업무가 없습니다.' : '등록된 업무가 없습니다.'}
                    </p>
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const isOverdue = task.due_date ? isOverdueKST(task.due_date) : false
                    
                    return (
                      <div
                        key={task.id}
                        className={`px-6 py-4 hover:bg-gray-50 ${
                          isOverdue ? 'bg-red-50 border-l-4 border-red-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          {/* 체크박스 (선택 모드일 때만 표시) */}
                          {isSelectMode && (
                            <div className="flex-shrink-0 mr-4">
                              <input
                                type="checkbox"
                                checked={selectedTasks.has(task.id)}
                                onChange={() => toggleTaskSelection(task.id)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-sm font-medium text-gray-900">
                                {task.title}
                              </h3>
                              
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                task.frequency === 'once' ? 'bg-gray-100 text-gray-800' :
                                task.frequency === 'daily' ? 'bg-blue-100 text-blue-800' :
                                task.frequency === 'weekly' ? 'bg-green-100 text-green-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {getFrequencyDescription(task.frequency)}
                              </span>

                              {task.completed && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  ✅ 완료
                                </span>
                              )}

                              {isOverdue && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  ⚠️ 지연
                                </span>
                              )}
                            </div>

                            <div className="mt-1 text-sm text-gray-500">
                              담당자: {task.assignee} | 
                              마감일: {formatDate(task.due_date)} ({formatDDay(task.due_date)})
                            </div>

                            {task.description && (
                              <p className="mt-2 text-sm text-gray-600">{task.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {!task.completed && (
                              <button
                                onClick={() => {
                                  const completedBy = prompt('완료자 이름 또는 이메일을 입력하세요:', task.assignee)
                                  if (completedBy) {
                                    completeTask(task.id, completedBy)
                                  }
                                }}
                                className="px-3 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600"
                              >
                                ✅ 완료
                              </button>
                            )}
                            
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600"
                            >
                              🗑️ 삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* 업무 추가 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">새 업무 추가</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">제목</label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="업무 제목을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">설명</label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="업무 설명을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">담당자</label>
                    <input
                      type="email"
                      value={newTask.assignee}
                      onChange={(e) => setNewTask(prev => ({ ...prev, assignee: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="담당자 이메일을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">주기</label>
                    <select
                      value={newTask.frequency}
                      onChange={(e) => setNewTask(prev => ({ ...prev, frequency: e.target.value as any }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="once">일회성</option>
                      <option value="daily">매일</option>
                      <option value="weekly">매주</option>
                      <option value="monthly">매월</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">마감일</label>
                    <input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-400"
                  >
                    취소
                  </button>
                  <button
                    onClick={addTask}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600"
                  >
                    추가
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
