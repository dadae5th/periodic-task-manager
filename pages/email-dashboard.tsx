import Head from 'next/head'
import { GetServerSideProps } from 'next'
import { Task, User } from '@/types'
import { supabaseAdmin } from '@/lib/supabase'

interface DashboardStats {
  total_tasks: number
  completed_today: number
  overdue_tasks: number
  pending_tasks: number
  completion_rate: number
  today_tasks: number
  today_completion_rate: number
}

interface EmailDashboardProps {
  user?: User
  message?: string
  tasks: Task[]
  stats: DashboardStats
  error?: string
}

export default function EmailDashboard({ 
  user, 
  message, 
  tasks, 
  stats,
  error 
}: EmailDashboardProps) {
  // 완전히 정적인 페이지 - 클라이언트 자바스크립트 최소화

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
                  {user ? `안녕하세요, ${user.name}님!` : '업무 관리 시스템'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a 
                  href="/dashboard"
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}
                >
                  📋 전체 대시보드
                </a>
                <a 
                  href="/login"
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}
                >
                  🔑 로그인
                </a>
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

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const { token, user: userParam, message } = query

  console.log('=== 이메일 대시보드 서버사이드 처리 ===')
  console.log('Query 파라미터:', { hasToken: !!token, hasUser: !!userParam, message })

  let user: User | null = null
  let tasks: Task[] = []
  let stats: DashboardStats = {
    total_tasks: 0,
    completed_today: 0,
    overdue_tasks: 0,
    pending_tasks: 0,
    completion_rate: 0,
    today_tasks: 0,
    today_completion_rate: 0
  }
  let error: string | null = null

  // 사용자 정보 처리
  if (userParam && typeof userParam === 'string') {
    try {
      user = JSON.parse(decodeURIComponent(userParam))
      console.log('✅ 사용자 정보 파싱 성공:', user?.email)
    } catch (parseError) {
      console.error('❌ 사용자 정보 파싱 실패:', parseError)
      error = '사용자 정보 처리 중 오류가 발생했습니다.'
    }
  }

  // 데이터 로드 (사용자가 있는 경우)
  if (user) {
    try {
      // 업무 목록 조회
      const { data: tasksData, error: tasksError } = await (supabaseAdmin as any)
        .from('tasks')
        .select('*')
        .or(`assignee.eq.${user.email},assignee.eq.all`)
        .order('due_date', { ascending: true })

      if (tasksError) {
        console.error('업무 목록 조회 실패:', tasksError)
      } else if (tasksData) {
        tasks = tasksData
        console.log(`📋 업무 목록 로드: ${tasks.length}개`)
      }

      // 통계 계산
      const today = new Date().toISOString().split('T')[0]
      const totalTasks = tasks.length
      const completedToday = tasks.filter(task => 
        task.completed && 
        task.updated_at && 
        task.updated_at.split('T')[0] === today
      ).length
      const overdueTasks = tasks.filter(task => 
        !task.completed && 
        task.due_date < today
      ).length
      const pendingTasks = tasks.filter(task => !task.completed).length
      const completionRate = totalTasks > 0 ? (totalTasks - pendingTasks) / totalTasks * 100 : 0

      stats = {
        total_tasks: totalTasks,
        completed_today: completedToday,
        overdue_tasks: overdueTasks,
        pending_tasks: pendingTasks,
        completion_rate: completionRate,
        today_tasks: tasks.filter(task => 
          !task.completed && 
          task.due_date === today
        ).length,
        today_completion_rate: 0
      }

      console.log('📊 통계 계산 완료:', stats)

    } catch (dataError) {
      console.error('❌ 데이터 로드 오류:', dataError)
      error = '데이터를 불러오는 중 오류가 발생했습니다.'
    }
  }

  return {
    props: {
      user: user || null,
      message: message ? decodeURIComponent(message as string) : null,
      tasks,
      stats,
      error
    }
  }
}
