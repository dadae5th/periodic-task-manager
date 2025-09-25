import { useState, useEffect } from 'react'
import Head from 'next/head'
import { Task, DashboardStats, ApiResponse } from '@/types'
import { formatDate, formatDDay, createApiResponse } from '@/lib/utils'
import { TaskScheduler } from '@/lib/scheduler'

interface DashboardProps {
  initialTasks: Task[]
  initialStats: DashboardStats
}

export default function Dashboard({ initialTasks, initialStats }: DashboardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [stats, setStats] = useState<DashboardStats>(initialStats)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState({
    assignee: 'all',
    frequency: 'all',
    completed: 'false',
    overdue: 'false'
  })

  // 업무 목록 새로고침
  const refreshTasks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(filter)
      const response = await fetch(`/api/tasks?${params}`)
      const result: ApiResponse<{ tasks: Task[] }> = await response.json()
      
      if (result.success && result.data) {
        setTasks(result.data.tasks)
      }
    } catch (error) {
      console.error('업무 목록 새로고침 실패:', error)
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
        await refreshTasks()
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
        await refreshTasks()
        alert('업무가 삭제되었습니다.')
      } else {
        alert(`삭제 실패: ${result.error || result.message}`)
      }
    } catch (error) {
      console.error('업무 삭제 실패:', error)
      alert('업무 삭제 중 오류가 발생했습니다.')
    }
  }

  // 필터 변경 시 업무 목록 새로고침
  useEffect(() => {
    refreshTasks()
  }, [filter])

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
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                  <p className="text-sm font-medium text-gray-500">완료율</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completion_rate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* 필터 및 액션 */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <select
                    value={filter.assignee}
                    onChange={(e) => setFilter(prev => ({ ...prev, assignee: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">모든 담당자</option>
                  </select>

                  <select
                    value={filter.frequency}
                    onChange={(e) => setFilter(prev => ({ ...prev, frequency: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">모든 주기</option>
                    <option value="daily">일간</option>
                    <option value="weekly">주간</option>
                    <option value="monthly">월간</option>
                  </select>

                  <select
                    value={filter.completed}
                    onChange={(e) => setFilter(prev => ({ ...prev, completed: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="false">미완료</option>
                    <option value="true">완료</option>
                    <option value="all">전체</option>
                  </select>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filter.overdue === 'true'}
                      onChange={(e) => setFilter(prev => ({ 
                        ...prev, 
                        overdue: e.target.checked ? 'true' : 'false' 
                      }))}
                      className="mr-2"
                    />
                    지연된 업무만
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshTasks}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading ? '새로고침 중...' : '새로고침'}
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/tasks/new'}
                    className="px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600"
                  >
                    + 업무 추가
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 업무 목록 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                업무 목록 ({tasks.length}개)
              </h2>
            </div>

            <div className="divide-y divide-gray-200">
              {tasks.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-500">조건에 맞는 업무가 없습니다.</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`px-6 py-4 hover:bg-gray-50 ${
                      task.is_overdue ? 'bg-red-50 border-l-4 border-red-500' : ''
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
                            {TaskScheduler.getFrequencyDescription(task.frequency, task.frequency_details)}
                          </span>

                          {task.is_overdue && (
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
                          onClick={() => window.location.href = `/tasks/${task.id}/edit`}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600"
                        >
                          ✏️ 편집
                        </button>
                        
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600"
                        >
                          🗑️ 삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// 서버 사이드 데이터 페칭
export async function getServerSideProps() {
  try {
    // 실제 환경에서는 API를 호출하거나 직접 데이터베이스에서 조회
    const initialTasks: Task[] = []
    const initialStats: DashboardStats = {
      total_tasks: 0,
      completed_today: 0,
      overdue_tasks: 0,
      pending_tasks: 0,
      completion_rate: 0
    }

    return {
      props: {
        initialTasks,
        initialStats
      }
    }
  } catch (error) {
    console.error('대시보드 데이터 로딩 실패:', error)
    
    return {
      props: {
        initialTasks: [],
        initialStats: {
          total_tasks: 0,
          completed_today: 0,
          overdue_tasks: 0,
          pending_tasks: 0,
          completion_rate: 0
        }
      }
    }
  }
}
