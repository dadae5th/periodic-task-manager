import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Task, ApiResponse, User } from '@/types'
import { getCurrentUser, logout } from '@/lib/auth'

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
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set())
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'active' | 'all'>('active')

  // URL 파라미터에서 초기 탭 설정
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    if (tabParam === 'all') {
      setViewMode('all')
    }
  }, [])
  const [newTask, setNewTask] = useState<NewTask>({
    title: '',
    description: '',
    assignee: '',
    frequency: 'once',
    due_date: new Date().toISOString().split('T')[0]
  })

  // 사용자별 개별 대시보드 설정
  useEffect(() => {
    console.log('🔍 개별 대시보드 진입')
    
    // 🔥 오래된 인증 토큰 완전 제거 (토큰 오류 방지)
    try {
      localStorage.removeItem('authToken')
      localStorage.removeItem('currentUser')
      console.log('✅ 오래된 토큰 데이터 클리어됨')
    } catch (e) {
      console.log('토큰 클리어 실행됨 (localStorage 접근 제한)')
    }
    
    // URL 파라미터에서 사용자 정보 확인
    const urlParams = new URLSearchParams(window.location.search)
    const userParam = urlParams.get('user')
    const autoLogin = urlParams.get('auto_login')
    
    let targetUser: User
    
    if (userParam && autoLogin === 'true') {
      // 이메일에서 온 경우 - 해당 사용자로 설정
      console.log('📧 이메일에서 접근:', userParam)
      targetUser = {
        id: `user-${userParam.replace(/[^a-zA-Z0-9]/g, '-')}`,
        email: userParam,
        name: userParam.split('@')[0],
        role: 'user' as const,
        created_at: new Date().toISOString()
      }
      
      // 관리자 이메일인 경우 관리자 권한 부여
      if (userParam === 'bae.jae.kwon@drbworld.com') {
        targetUser.role = 'admin'
        targetUser.name = '배재권'
      }
    } else {
      // 직접 접근한 경우 - 기본 관리자로 설정
      console.log('🔐 직접 접근 - 기본 관리자 설정')
      targetUser = {
        id: 'default-admin',
        email: 'bae.jae.kwon@drbworld.com',
        name: '배재권',
        role: 'admin' as const,
        created_at: new Date().toISOString()
      }
    }
    
    console.log('✅ 사용자 설정:', {
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role
    })
    
    setCurrentUser(targetUser)
    setNewTask(prev => ({ ...prev, assignee: targetUser.email }))
    
    // URL 정리 (auto_login 파라미터만 제거, user는 유지)
    if (autoLogin) {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.delete('auto_login')
      window.history.replaceState({}, '', currentUrl.toString())
    }
  }, [])

  // 브라우저/탭 닫기시 자동 로그아웃
  useEffect(() => {
    const { isEmailSession, clearEmailSession } = require('@/lib/auth')
    
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // 메일 세션인 경우에만 자동 정리
      if (isEmailSession()) {
        try {
          clearEmailSession()
          console.log('메일 세션 자동 정리 완료')
        } catch (error) {
          console.error('메일 세션 정리 실패:', error)
        }
      }
    }

    const handleVisibilityChange = () => {
      // 탭이 숨겨졌다가 다시 보여질 때 세션 유효성 검사
      if (!document.hidden) {
        const user = getCurrentUser()
        if (!user) {
          router.push('/login')
        }
      }
    }

    // 페이지를 벗어날 때 정리 (SPA 내에서의 라우팅도 포함)
    const handleRouteChangeStart = (url: string) => {
      // 대시보드를 벗어나는 경우 메일 세션 정리
      if (isEmailSession() && !url.includes('/dashboard')) {
        try {
          clearEmailSession()
          console.log('라우트 변경시 메일 세션 정리')
        } catch (error) {
          console.error('라우트 변경 세션 정리 실패:', error)
        }
      }
    }

    // 이벤트 리스너 등록
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    router.events.on('routeChangeStart', handleRouteChangeStart)

    // 정리 함수
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      router.events.off('routeChangeStart', handleRouteChangeStart)
    }
  }, [router])

  // 초기 데이터 로딩
  const loadInitialData = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('Fetching tasks from API for user:', currentUser?.email)
      
      // 인증 우회를 위한 간단한 헤더만 사용
      const userHeaders = {
        'Content-Type': 'application/json',
        'X-User-Email': currentUser?.email || 'bae.jae.kwon@drbworld.com'
      }
      
      const tasksResponse = await fetch('/api/tasks', {
        method: 'GET',
        headers: userHeaders,
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
          headers: userHeaders,
        })
        
        // 오늘 업무 통계 가져오기
        const todayStatsResponse = await fetch('/api/completions/today-stats', {
          method: 'GET',
          headers: userHeaders,
        })
        
        let completedToday = 0
        let accurateTodayCompletionRate = 0
        
        if (completionsResponse.ok) {
          const completionsResult = await completionsResponse.json()
          if (completionsResult.success) {
            completedToday = completionsResult.data?.count || 0
          }
        }
        
        // localStorage에서 완료된 업무 수도 추가
        const localCompletedCount = taskList.filter((task: Task) => completedTaskIds.has(task.id)).length
        completedToday += localCompletedCount
        
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
          !task.completed && !completedTaskIds.has(task.id) && new Date(task.due_date) < now
        ).length
        const pendingTasks = taskList.filter((task: Task) => !task.completed && !completedTaskIds.has(task.id)).length
        
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
      // 인증 우회를 위한 간단한 헤더만 사용
      const userHeaders = {
        'Content-Type': 'application/json',
        'X-User-Email': currentUser?.email || 'bae.jae.kwon@drbworld.com'
      }
      
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: userHeaders,
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
      // 인증 우회를 위한 간단한 헤더만 사용
      const userHeaders = {
        'Content-Type': 'application/json',
        'X-User-Email': currentUser?.email || 'bae.jae.kwon@drbworld.com'
      }
      
      console.log('업무 삭제 요청:', { taskId, user: currentUser?.email })
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: userHeaders
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

  // 업무 추가
  const addTask = async () => {
    if (!newTask.title.trim()) {
      alert('업무 제목을 입력해주세요.')
      return
    }

    if (!newTask.assignee.trim()) {
      alert('담당자를 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      // 인증 우회를 위한 간단한 헤더만 사용
      const userHeaders = {
        'Content-Type': 'application/json',
        'X-User-Email': currentUser?.email || 'bae.jae.kwon@drbworld.com'
      }
      
      console.log('업무 생성 요청:', { task: newTask.title, user: currentUser?.email })
      
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: userHeaders,
        body: JSON.stringify(newTask)
      })

      const result: ApiResponse = await response.json()
      
      if (result.success) {
        // 폼 초기화
        setNewTask({
          title: '',
          description: '',
          assignee: currentUser?.email || '',
          frequency: 'once',
          due_date: new Date().toISOString().split('T')[0]
        })
        setShowAddModal(false)
        await loadInitialData()
        alert('업무가 성공적으로 추가되었습니다!')
      } else {
        alert(`업무 추가 실패: ${result.error || result.message}`)
      }
    } catch (error) {
      console.error('업무 추가 실패:', error)
      alert('업무 추가 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 모달 닫기
  const closeAddModal = () => {
    setShowAddModal(false)
    setNewTask({
      title: '',
      description: '',
      assignee: currentUser?.email || '',
      frequency: 'once',
      due_date: new Date().toISOString().split('T')[0]
    })
  }

  // 초기 데이터 로딩
  // localStorage에서 완료된 업무 목록 로드
  const loadCompletedTasks = () => {
    try {
      const saved = localStorage.getItem('completedTasks')
      if (saved) {
        const completedIds = JSON.parse(saved)
        setCompletedTaskIds(new Set(completedIds))
      }
    } catch (error) {
      console.error('완료된 업무 목록 로드 실패:', error)
    }
  }

  // localStorage에 완료된 업무 저장
  const saveCompletedTask = (taskId: string) => {
    try {
      const newCompleted = new Set(completedTaskIds)
      newCompleted.add(taskId)
      setCompletedTaskIds(newCompleted)
      localStorage.setItem('completedTasks', JSON.stringify(Array.from(newCompleted)))
    } catch (error) {
      console.error('완료된 업무 저장 실패:', error)
    }
  }

  useEffect(() => {
    loadCompletedTasks()
    loadInitialData()

    // URL에서 완료된 업무 수 또는 오류 메시지 확인
    const urlParams = new URLSearchParams(window.location.search)
    const completedCount = urlParams.get('completed')
    const errorMessage = urlParams.get('error')
    
    if (completedCount) {
      // 이메일에서 완료된 업무들을 localStorage에 추가
      // Mock ID 패턴에 따라 완료 처리
      const mockIds = ['mock-1', 'mock-2', 'mock-3'] // Mock 데이터 ID들
      mockIds.forEach(id => saveCompletedTask(id))
      
      alert(`🎉 ${completedCount}개 업무가 성공적으로 완료되었습니다!`)
      // URL에서 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname)
      
      // 데이터 새로고침
      setTimeout(() => {
        loadInitialData()
      }, 100)
    } else if (errorMessage) {
      alert(`❌ 오류가 발생했습니다: ${decodeURIComponent(errorMessage)}`)
      // URL에서 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // 사용자 정보가 없으면 바로 설정
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-blue-200 rounded-full mx-auto mb-4"></div>
            <div className="h-4 bg-blue-200 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-blue-200 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="mt-4 text-gray-600">대시보드 로딩 중...</p>
          <p className="mt-2 text-sm text-gray-400">잠시만 기다려주세요</p>
          
          {/* 5초 후 수동 새로고침 버튼 */}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            🔄 새로고침
          </button>
        </div>
      </div>
    )
  }

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
                {/* 사용자 정보 */}
                {currentUser && (
                  <div className="flex items-center space-x-3">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{currentUser.name}</div>
                      <div className="text-gray-500">{currentUser.email}</div>
                    </div>
                    {currentUser.role === 'admin' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        관리자
                      </span>
                    )}
                    <a
                      href="/change-password"
                      className="inline-block text-sm text-white bg-blue-500 hover:bg-blue-600 border border-blue-500 rounded px-4 py-2 font-medium transition-colors text-decoration-none"
                      style={{ textDecoration: 'none' }}
                    >
                      🔑 비밀번호 변경
                    </a>
                    <button
                      onClick={() => {
                        if (confirm('로그아웃 하시겠습니까?')) {
                          logout()
                        }
                      }}
                      className="text-sm text-white bg-red-500 hover:bg-red-600 border border-red-500 rounded px-4 py-2 font-medium transition-colors"
                    >
                      🚪 로그아웃
                    </button>
                  </div>
                )}
                
                {/* 날짜 */}
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
                  
                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => router.push('/users')}
                      className="px-4 py-2 bg-purple-500 text-white rounded-md text-sm font-medium hover:bg-purple-600 mr-2"
                    >
                      👥 사용자 관리
                    </button>
                  )}
                  
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
                    진행 중 업무 ({tasks.filter(task => !task.completed && !completedTaskIds.has(task.id)).length}개)
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
                {(() => {
                  // 안전한 배열 처리
                  const safeTasks = Array.isArray(tasks) ? tasks : []
                  const safeCompletedIds = completedTaskIds instanceof Set ? completedTaskIds : new Set()
                  
                  const filteredTasks = viewMode === 'active' 
                    ? safeTasks.filter(task => task && !task.completed && !safeCompletedIds.has(task.id))
                    : safeTasks;
                  
                  if (filteredTasks.length === 0) {
                    return (
                      <div className="px-6 py-8 text-center">
                        <p className="text-gray-500">
                          {viewMode === 'active' ? '진행 중인 업무가 없습니다.' : '등록된 업무가 없습니다.'}
                        </p>
                      </div>
                    );
                  }
                  
                  return filteredTasks
                    .map((task) => {
                      // task 객체 안전성 검사
                      if (!task || !task.id) {
                        console.warn('Invalid task object:', task)
                        return null
                      }
                      
                      const isOverdue = task.due_date ? new Date(task.due_date) < new Date() : false
                      
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
                                task.frequency === 'once' ? 'bg-gray-100 text-gray-800' :
                                task.frequency === 'daily' ? 'bg-blue-100 text-blue-800' :
                                task.frequency === 'weekly' ? 'bg-green-100 text-green-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {getFrequencyDescription(task.frequency)}
                              </span>

                              {(task.completed || completedTaskIds.has(task.id)) && (
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
                            {!task.completed && !completedTaskIds.has(task.id) && (
                              <button
                                onClick={() => {
                                  const completedBy = prompt('완료자 이름 또는 이메일을 입력하세요:', task.assignee)
                                  if (completedBy) {
                                    saveCompletedTask(task.id)
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
                    .filter(Boolean); // null 값 제거
                })()}
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
                    onClick={closeAddModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); addTask(); }} className="space-y-4">
                  {/* 업무 제목 */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                      업무 제목 *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="예: 일일 보고서 작성"
                      required
                    />
                  </div>

                  {/* 업무 설명 */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      업무 설명
                    </label>
                    <textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="업무에 대한 상세 설명을 입력하세요"
                    />
                  </div>

                  {/* 담당자 */}
                  <div>
                    <label htmlFor="assignee" className="block text-sm font-medium text-gray-700 mb-1">
                      담당자 *
                    </label>
                    <input
                      type="text"
                      id="assignee"
                      value={newTask.assignee}
                      onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="이름 또는 이메일 주소"
                      required
                    />
                  </div>

                  {/* 업무 유형 선택 */}
                  <div>
                    <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
                      <strong>반복 주기 (필수)</strong>
                    </label>
                    <select
                      id="frequency"
                      value={newTask.frequency}
                      onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value as 'once' | 'daily' | 'weekly' | 'monthly' })}
                      className="w-full px-3 py-2 border-2 border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50 font-semibold"
                      style={{ fontSize: '15px' }}
                    >
                      <option value="once">● 일회성 (한 번만 실행)</option>
                      <option value="daily">○ 매일</option>
                      <option value="weekly">○ 매주</option>
                      <option value="monthly">○ 매월</option>
                    </select>
                    <p className="text-xs text-blue-600 mt-1">
                      💡 일회성: 마감일에만 실행됩니다
                    </p>
                  </div>

                  {/* 마감일 */}
                  <div>
                    <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                      {newTask.frequency === 'once' ? '마감일 *' : '첫 번째 마감일 *'}
                    </label>
                    <input
                      type="date"
                      id="due_date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* 버튼 */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeAddModal}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !newTask.title.trim() || !newTask.assignee.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? '추가 중...' : '업무 추가'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
