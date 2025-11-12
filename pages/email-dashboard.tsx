import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Task, ApiResponse, User } from '@/types'

interface DashboardStats {
  total_tasks: number
  completed_today: number
  overdue_tasks: number
  pending_tasks: number
  completion_rate: number
  today_tasks: number
  today_completion_rate: number
}

export default function EmailDashboard() {
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
  const [message, setMessage] = useState<string>('')

  // 이메일에서 온 사용자 자동 인증 처리 (인증 우회)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const userParam = urlParams.get('user')
    const messageParam = urlParams.get('message')
    
    console.log('📧 이메일 대시보드 접근:', { hasToken: !!token, hasUser: !!userParam })
    
    if (messageParam) {
      setMessage(decodeURIComponent(messageParam))
    }

    if (token && userParam) {
      try {
        console.log('🔓 이메일 사용자 자동 인증 시작')
        
        const userData = JSON.parse(decodeURIComponent(userParam))
        
        // 인증 정보 저장
        localStorage.setItem('authToken', token)
        localStorage.setItem('currentUser', JSON.stringify(userData))
        
        setCurrentUser(userData)
        
        console.log('✅ 이메일 사용자 인증 성공:', userData.email)
        
        // URL 정리
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('token')
        newUrl.searchParams.delete('user')
        
        window.history.replaceState({}, '', newUrl.toString())
        
      } catch (error) {
        console.error('❌ 이메일 사용자 인증 실패:', error)
        setError('인증 정보 처리 중 오류가 발생했습니다.')
      }
    } else {
      // 토큰이 없으면 기존 저장된 정보 확인
      try {
        const savedUser = localStorage.getItem('currentUser')
        const savedToken = localStorage.getItem('authToken')
        
        if (savedUser && savedToken) {
          const userData = JSON.parse(savedUser)
          setCurrentUser(userData)
          console.log('💾 저장된 사용자 정보 사용:', userData.email)
        }
      } catch (error) {
        console.error('저장된 인증 정보 확인 실패:', error)
      }
    }
  }, [router.query])

  // 업무 목록 및 통계 조회
  useEffect(() => {
    if (currentUser) {
      loadTasksAndStats()
    }
  }, [currentUser])

  const loadTasksAndStats = async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      
      // 업무 목록 조회
      const tasksResponse = await fetch('/api/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (tasksResponse.ok) {
        const tasksData: ApiResponse<Task[]> = await tasksResponse.json()
        if (tasksData.success && tasksData.data) {
          setTasks(tasksData.data)
        }
      }

      // 통계 조회
      const statsResponse = await fetch('/api/completions/today-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (statsResponse.ok) {
        const statsData: ApiResponse<DashboardStats> = await statsResponse.json()
        if (statsData.success && statsData.data) {
          setStats(statsData.data)
        }
      }

    } catch (error) {
      console.error('데이터 로드 실패:', error)
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

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

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <h2>데이터를 불러오는 중...</h2>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>대시보드 - 주기별 업무 관리 시스템</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* 헤더 */}
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '30px',
            marginBottom: '20px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px'
            }}>
              <div>
                <h1 style={{
                  margin: '0 0 10px 0',
                  color: '#333',
                  fontSize: '28px'
                }}>
                  📊 업무 대시보드
                </h1>
                <p style={{
                  margin: '0',
                  color: '#666',
                  fontSize: '16px'
                }}>
                  {currentUser ? `안녕하세요, ${currentUser.name}님!` : '업무 관리 시스템'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => router.push('/dashboard')}
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📋 전체 대시보드
                </button>
                <button
                  onClick={() => router.push('/login')}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🔑 로그인
                </button>
              </div>
            </div>
            
            {message && (
              <div style={{
                background: '#d4edda',
                color: '#155724',
                padding: '15px',
                borderRadius: '8px',
                marginTop: '20px',
                border: '1px solid #c3e6cb'
              }}>
                {message}
              </div>
            )}
            
            {error && (
              <div style={{
                background: '#f8d7da',
                color: '#721c24',
                padding: '15px',
                borderRadius: '8px',
                marginTop: '20px',
                border: '1px solid #f5c6cb'
              }}>
                {error}
              </div>
            )}
          </div>

          {/* 통계 카드 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '15px',
              padding: '25px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>전체 업무</h3>
              <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                {stats.total_tasks}개
              </p>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '15px',
              padding: '25px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>✅</div>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>오늘 완료</h3>
              <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                {stats.completed_today}개
              </p>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '15px',
              padding: '25px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🚨</div>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>지연 업무</h3>
              <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                {stats.overdue_tasks}개
              </p>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '15px',
              padding: '25px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📈</div>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>완료율</h3>
              <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#6f42c1' }}>
                {Math.round(stats.completion_rate)}%
              </p>
            </div>
          </div>

          {/* 업무 목록 */}
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '30px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{
              margin: '0 0 20px 0',
              color: '#333',
              fontSize: '22px'
            }}>
              📝 최근 업무
            </h2>
            
            {tasks.length > 0 ? (
              <div style={{
                display: 'grid',
                gap: '15px'
              }}>
                {tasks.slice(0, 10).map((task, index) => (
                  <div
                    key={task.id}
                    style={{
                      background: task.completed ? '#f8f9fa' : '#ffffff',
                      border: `1px solid ${task.completed ? '#dee2e6' : '#e0e0e0'}`,
                      borderRadius: '10px',
                      padding: '20px',
                      borderLeft: `4px solid ${
                        task.completed ? '#28a745' : 
                        new Date(task.due_date) < new Date() ? '#dc3545' : '#007bff'
                      }`
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <h4 style={{
                          margin: '0 0 8px 0',
                          color: '#333',
                          fontSize: '18px'
                        }}>
                          {task.completed ? '✅' : '📋'} {task.title}
                        </h4>
                        <p style={{
                          margin: '0 0 8px 0',
                          color: '#666',
                          fontSize: '14px'
                        }}>
                          {task.description}
                        </p>
                        <div style={{
                          display: 'flex',
                          gap: '15px',
                          flexWrap: 'wrap',
                          fontSize: '12px',
                          color: '#888'
                        }}>
                          <span>📧 {task.assignee}</span>
                          <span>📅 {formatDate(task.due_date)}</span>
                          <span>🔄 {task.frequency === 'once' ? '일회성' : task.frequency === 'daily' ? '매일' : task.frequency === 'weekly' ? '매주' : '매월'}</span>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <span style={{
                          background: new Date(task.due_date) < new Date() ? '#fff5f5' : '#f0f8ff',
                          color: new Date(task.due_date) < new Date() ? '#dc3545' : '#007bff',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {formatDDay(task.due_date)}
                        </span>
                        {task.completed && (
                          <span style={{
                            background: '#d4edda',
                            color: '#155724',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}>
                            완료
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#666'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📭</div>
                <p>업무가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
