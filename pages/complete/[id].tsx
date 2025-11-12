import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { supabaseAdmin } from '@/lib/supabase'
import { generateToken } from '@/lib/auth'
import { TaskScheduler } from '@/lib/scheduler'

interface CompletePageProps {
  success: boolean
  message: string
  taskTitle?: string
  taskId?: string
  userEmail?: string
  redirectUrl?: string
}

export default function CompletePage({ 
  success, 
  message, 
  taskTitle, 
  taskId, 
  userEmail,
  redirectUrl 
}: CompletePageProps) {
  return (
    <>
      <Head>
        <title>업무 완료 처리 - 주기별 업무 관리 시스템</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {redirectUrl && <meta httpEquiv="refresh" content={`3;url=${redirectUrl}`} />}
      </Head>
      
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: success 
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>
            {success ? '🎉' : '❌'}
          </div>
          
          <h1 style={{
            color: success ? '#28a745' : '#dc3545',
            fontSize: '28px',
            marginBottom: '20px'
          }}>
            {success ? '업무 완료!' : '처리 실패'}
          </h1>
          
          <p style={{
            color: '#666',
            fontSize: '18px',
            marginBottom: '20px',
            lineHeight: '1.5'
          }}>
            {message}
          </p>
          
          {taskTitle && (
            <div style={{
              background: '#f8f9fa',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{taskTitle}</h3>
              {taskId && <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>업무 ID: {taskId}</p>}
            </div>
          )}
          
          {userEmail && (
            <div style={{
              background: '#e8f5e8',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <p style={{ color: '#28a745', margin: '0', fontSize: '14px' }}>
                완료자: {userEmail}
              </p>
            </div>
          )}
          
          {success && redirectUrl && (
            <div style={{
              background: '#e3f2fd',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '30px'
            }}>
              <p style={{ color: '#1976d2', margin: '0', fontSize: '16px' }}>
                🔄 3초 후 대시보드로 자동 이동합니다...
              </p>
            </div>
          )}
          
          <div style={{ marginTop: '30px' }}>
            {success && redirectUrl ? (
              <a 
                href={redirectUrl}
                style={{
                  background: '#007bff',
                  color: 'white',
                  padding: '12px 30px',
                  borderRadius: '25px',
                  fontSize: '16px',
                  textDecoration: 'none',
                  display: 'inline-block',
                  transition: 'all 0.3s ease'
                }}
              >
                📊 대시보드로 바로 이동
              </a>
            ) : (
              <a 
                href="/login"
                style={{
                  background: '#6c757d',
                  color: 'white',
                  padding: '12px 30px',
                  borderRadius: '25px',
                  fontSize: '16px',
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                🔑 로그인하기
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const { id, completed_by, recipient, auto_login, force_login, source } = query

  console.log('=== 서버사이드 업무 완료 처리 시작 ===')
  console.log('Query 파라미터:', { id, completed_by, recipient, auto_login, force_login, source })

  if (!id || typeof id !== 'string') {
    return {
      props: {
        success: false,
        message: '업무 ID가 필요합니다.'
      }
    }
  }

  try {
    // 1단계: 업무 조회
    const { data: task, error: fetchError } = await (supabaseAdmin as any)
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !task) {
      console.error('업무 조회 실패:', fetchError)
      return {
        props: {
          success: false,
          message: '업무를 찾을 수 없습니다.',
          taskId: id
        }
      }
    }

    // 2단계: 완료자 결정
    const completedBy = (completed_by as string) || (recipient as string) || task.assignee

    if (!completedBy) {
      return {
        props: {
          success: false,
          message: '완료자 정보가 필요합니다.',
          taskTitle: task.title,
          taskId: id
        }
      }
    }

    // 3단계: 업무 완료 처리
    if (task.completed && task.frequency === 'once') {
      return {
        redirect: {
          destination: `/email-dashboard?message=${encodeURIComponent('이미 완료된 업무입니다.')}`,
          permanent: false,
        },
      }
    }

    const completedAt = new Date().toISOString()

    // 완료 기록 추가
    const { error: completionError } = await (supabaseAdmin as any)
      .from('task_completions')
      .insert([{
        task_id: id,
        completed_by: completedBy,
        completed_at: completedAt
      }])

    if (completionError) {
      console.error('완료 기록 생성 실패:', completionError)
    }

    // 다음 마감일 계산 및 업무 상태 업데이트
    let nextDueDate: string
    let isCompleted: boolean

    if (task.frequency === 'daily' || task.frequency === 'weekly' || task.frequency === 'monthly') {
      const nextDate = TaskScheduler.getNextScheduledDate(task, new Date())
      nextDueDate = nextDate.toISOString().split('T')[0]
      isCompleted = false
    } else {
      nextDueDate = task.due_date
      isCompleted = true
    }

    const { error: updateError } = await (supabaseAdmin as any)
      .from('tasks')
      .update({
        completed: isCompleted,
        due_date: nextDueDate,
        updated_at: completedAt
      })
      .eq('id', id)

    if (updateError) {
      console.error('업무 업데이트 실패:', updateError)
      return {
        props: {
          success: false,
          message: '업무 완료 처리 중 오류가 발생했습니다.',
          taskTitle: task.title,
          taskId: id
        }
      }
    }

    console.log('✅ 업무 완료 처리 성공:', { taskId: id, completedBy, taskTitle: task.title })

    // 4단계: 사용자 정보 조회/생성 및 토큰 생성
    let { data: user, error: userError } = await (supabaseAdmin as any)
      .from('users')
      .select('id, email, name, role')
      .eq('email', completedBy)
      .single()

    if (userError && userError.code === 'PGRST116') {
      const { data: newUser, error: createError } = await (supabaseAdmin as any)
        .from('users')
        .insert([{
          email: completedBy,
          name: completedBy.split('@')[0],
          password: 'temp123',
          role: 'user'
        }])
        .select()
        .single()

      if (createError) {
        console.error('사용자 생성 실패:', createError)
        return {
          redirect: {
            destination: `/login?redirect=${encodeURIComponent('/dashboard')}&message=${encodeURIComponent('업무가 완료되었습니다. 계정 생성 실패로 로그인이 필요합니다.')}&email=${encodeURIComponent(completedBy)}`,
            permanent: false,
          },
        }
      }
      user = newUser
    }

    if (!user) {
      // 사용자가 없는 경우 로그인 페이지로 리다이렉트
      return {
        redirect: {
          destination: `/login?redirect=${encodeURIComponent('/dashboard')}&message=${encodeURIComponent('업무가 완료되었습니다. 로그인 후 대시보드에서 확인하세요.')}&email=${encodeURIComponent(completedBy)}`,
          permanent: false,
        },
      }
    }

    // 토큰 생성 - 이메일 대시보드로 직접 리다이렉트
    const sessionToken = generateToken(user)
    
    // CSP 우회를 위한 서버사이드 리다이렉트
    return {
      redirect: {
        destination: `/email-dashboard?token=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(JSON.stringify(user))}&message=${encodeURIComponent('업무가 완료되었습니다!')}`,
        permanent: false,
      },
    }

  } catch (error) {
    console.error('서버사이드 완료 처리 오류:', error)
    return {
      props: {
        success: false,
        message: '처리 중 오류가 발생했습니다.',
        taskId: id as string
      }
    }
  }
}
