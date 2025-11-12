import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { User } from '@/types'

export default function CompleteSuccess() {
  const router = useRouter()
  const [message, setMessage] = useState<string>('업무가 완료되었습니다!')
  const [taskId, setTaskId] = useState<string>('')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const { message: msgParam, task_id, user: userParam, token } = router.query

    // URL 파라미터에서 정보 추출
    if (msgParam) setMessage(decodeURIComponent(msgParam as string))
    if (task_id) setTaskId(task_id as string)
    
    // 사용자 정보 처리
    if (userParam && token) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam as string))
        
        // localStorage에 저장
        localStorage.setItem('authToken', token as string)
        localStorage.setItem('currentUser', JSON.stringify(userData))
        
        setUser(userData)
        
        // 3초 후 대시보드로 자동 이동
        const timer = setTimeout(() => {
          router.push('/dashboard')
        }, 3000)

        return () => clearTimeout(timer)
      } catch (error) {
        console.error('사용자 정보 처리 오류:', error)
      }
    }
  }, [router.query, router])

  return (
    <>
      <Head>
        <title>업무 완료 - 주기별 업무 관리 시스템</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
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
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
          
          <h1 style={{
            color: '#28a745',
            fontSize: '28px',
            marginBottom: '20px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            업무 완료!
          </h1>
          
          <p style={{
            color: '#666',
            fontSize: '18px',
            marginBottom: '20px',
            lineHeight: '1.5'
          }}>
            {message}
          </p>
          
          {taskId && (
            <p style={{
              color: '#999',
              fontSize: '14px',
              marginBottom: '30px'
            }}>
              업무 ID: {taskId}
            </p>
          )}
          
          {user && (
            <div style={{
              background: '#f8f9fa',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '30px'
            }}>
              <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>
                완료자: {user.email}
              </p>
            </div>
          )}
          
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
          
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '25px',
              fontSize: '16px',
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#0056b3'}
            onMouseOut={(e) => e.currentTarget.style.background = '#007bff'}
          >
            📊 대시보드로 바로 이동
          </button>
        </div>
      </div>
    </>
  )
}
