import { useState, useEffect } from 'react'
import Head from 'next/head'
import { Task, ApiResponse } from '@/types'

interface DashboardStats {
  total_tasks: number
  completed_today: number
  overdue_tasks: number
  pending_tasks: number
  completion_rate: number
  today_tasks: number
  today_completion_rate: number
}

// 유틸리티 함수들
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ko-KR')
}

const formatDDay = (dateString: string): string => {
  const today = new Date()
  const dueDate = new Date(dateString)
  const diffTime = dueDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'D-Day'
  if (diffDays > 0) return `D-${diffDays}`
  return `D+${Math.abs(diffDays)}`
}

const getFrequencyDescription = (frequency: string): string => {
  switch (frequency) {
    case 'daily': return '매일'
    case 'weekly': return '매주'
    case 'monthly': return '매월'
    default: return frequency
  }
}

export default function Dashboard() {
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

  // 초기 데이터 로딩
  const loadInitialData = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('Fetching tasks from API...')
      const tasksResponse = await fetch('/api/tasks', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      console.log('API Response status:', tasksResponse.status)
      
      if (!tasksResponse.ok) {
        throw new Error(`HTTP error! status: ${tasksResponse.status}`)
      }
      
      const tasksResult = await tasksResponse.json()
      console.log('API Response data:', tasksResult)
      
      if (tasksResult.success) {
        const taskList = tasksResult.data?.tasks || []
        setTasks(taskList)
        
        // 통계 계산을 위해 완료 기록도 가져오기
        const completionsResponse = await fetch('/api/completions/today', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        // 오늘 업무 통계 가져오기
        const todayStatsResponse = await fetch('/api/completions/today-stats', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        let completedToday = 0
        let accurateTodayCompletionRate = 0
        
        if (completionsResponse.ok) {
          const completionsResult = await completionsResponse.json()
          if (completionsResult.success) {
            completedToday = completionsResult.data?.count || 0
          }
        }
        
        if (todayStatsResponse.ok) {
          const todayStatsResult = await todayStatsResponse.json()
          if (todayStatsResult.success) {
            accurateTodayCompletionRate = todayStatsResult.data?.today_completion_rate || 0
          }
        }
        
        // 기본 통계 계산
        const now = new Date()
        
        const totalTasks = taskList.length
        const overdueTasks = taskList.filter((task: Task) => 
          !task.completed && new Date(task.due_date) < now
        ).length
        const pendingTasks = taskList.filter((task: Task) => !task.completed).length
        
        // 오늘과 내일까지의 업무를 "현재 활성 업무"로 간주
        const activeTasks = taskList.filter((task: Task) => {
          const taskDate = new Date(task.due_date)
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const dayAfterTomorrow = new Date(today)
          dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
          return taskDate >= today && taskDate < dayAfterTomorrow
        }).length
        
        // 완료율: 오늘 완료된 업무 / 현재 활성 업무 (최대 100%)
        const completionRate = activeTasks > 0 ? Math.min(100, Math.round((completedToday / activeTasks) * 100)) : 0
        
        // 오늘 마감인 업무 개수 계산
        const todayTasks = taskList.filter((task: Task) => {
          const taskDate = new Date(task.due_date).toDateString()
          const today = now.toDateString()
          return taskDate === today
        }).length

        // API에서 받은 정확한 당일 완성율 사용
        
        setStats({
          total_tasks: totalTasks,
          completed_today: completedToday,
          overdue_tasks: overdueTasks,
          pending_tasks: pendingTasks,
          completion_rate: completionRate,
          today_tasks: activeTasks,
          today_completion_rate: accurateTodayCompletionRate
        })
      } else {
        console.error('API response not successful:', tasksResult)
        setError(tasksResult.error || '데이터 로딩에 실패했습니다.')
      }
    } catch (error) {
      console.error('데이터 로딩 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      setError(`데이터 로딩 중 오류가 발생했습니다: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // 업무 완료 처리
  const completeTask = async (taskId: string, completedBy: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed_by: completedBy,
          notify_email: completedBy
        })
      })

      const result: ApiResponse = await response.json()
      
      if (result.success) {
        await loadInitialData()
        alert('업무가 완료되었습니다!')
      } else {
        alert(`완료 처리 실패: ${result.error || result.message}`)
      }
    } catch (error) {
      console.error('업무 완료 처리 실패:', error)
      alert('업무 완료 처리 중 오류가 발생했습니다.')
    }
  }

  // 업무 삭제
  const deleteTask = async (taskId: string) => {
    if (!confirm('정말로 이 업무를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })

      const result: ApiResponse = await response.json()
      
      if (result.success) {
        await loadInitialData()
        alert('업무가 삭제되었습니다.')
      } else {
        alert(`삭제 실패: ${result.error || result.message}`)
      }
    } catch (error) {
      console.error('업무 삭제 실패:', error)
      alert('업무 삭제 중 오류가 발생했습니다.')
    }
  }

  // 초기 데이터 로딩
  useEffect(() => {
    loadInitialData()
  }, [])

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
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
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
                데이터를 불러오는 중...
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
                      onClick={loadInitialData}
                      className="bg-red-100 px-2 py-1 rounded-md text-red-800 text-sm font-medium hover:bg-red-200"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              </div>
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
                    <p className="text-sm font-medium text-gray-500">활성 업무</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.today_tasks}</p>
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
                      <span className="text-white text-sm font-medium">⚠️</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">지연된 업무</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.overdue_tasks}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📈</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">활동률</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.completion_rate}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">🎯</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">당일 완성율</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.today_completion_rate}%</p>
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
                  업무 목록 ({tasks.length}개)
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadInitialData}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading ? '새로고침 중...' : '새로고침'}
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/'}
                    className="px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600"
                  >
                    + 업무 추가
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {tasks.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-gray-500">등록된 업무가 없습니다.</p>
                  </div>
                ) : (
                  tasks.map((task) => {
                    const isOverdue = !task.completed && new Date(task.due_date) < new Date()
                    
                    return (
                      <div
                        key={task.id}
                        className={`px-6 py-4 hover:bg-gray-50 ${
                          isOverdue ? 'bg-red-50 border-l-4 border-red-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-sm font-medium text-gray-900">
                                {task.title}
                              </h3>
                              
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
      </div>
    </>
  )
}
