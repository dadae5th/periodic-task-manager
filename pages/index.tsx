import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { getCurrentUser, isEmailSession, clearEmailSession } from '@/lib/auth'

export default function Home() {
  const router = useRouter()

  // 메인 페이지에서는 항상 로그인 화면을 보여줌 (다중 사용자 환경)
  useEffect(() => {
    // 메일 세션이 있으면 정리 (메인 페이지 접속시 자동 로그인 방지)
    if (isEmailSession()) {
      console.log('메인 페이지 접속 - 메일 세션 정리')
      clearEmailSession()
    }
  }, [])

  return (
    <div>
      <Head>
        <title>주기별 업무 관리 시스템</title>
        <meta name="description" content="주기별 업무 관리와 이메일 자동 알림 시스템" />
      </Head>

      <main style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          {/* 헤더 */}
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>
              📋 주기별 업무 관리 시스템
            </h1>
            <p style={{ fontSize: '20px', color: '#6b7280', maxWidth: '800px', margin: '0 auto' }}>
              업무를 주기별로 관리하고 이메일로 자동 알림을 받으세요. 
              완료 처리부터 대시보드 관리까지 모든 기능이 연동됩니다.
            </p>
          </div>

          {/* 주요 기능 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '60px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '30px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>자동 이메일 발송</h3>
              <p style={{ color: '#6b7280' }}>
                매일 정해진 시간에 해야할 일을 이메일로 자동 발송합니다. 
                PC가 꺼져있어도 클라우드에서 자동으로 발송됩니다.
              </p>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '30px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏰</div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>다양한 주기 설정</h3>
              <p style={{ color: '#6b7280' }}>
                일간, 주간, 월간 등 다양한 주기로 업무를 설정할 수 있습니다. 
                "매월 첫째주 월요일" 같은 복잡한 주기도 지원합니다.
              </p>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '30px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>실시간 대시보드</h3>
              <p style={{ color: '#6b7280' }}>
                업무 진행 상황을 실시간으로 모니터링하고 관리할 수 있습니다. 
                지연된 업무는 자동으로 경고 표시됩니다.
              </p>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '20px' }}>
              <a
                href="/login"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: '12px 32px',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  margin: '0 10px',
                  transition: 'background-color 0.2s'
                }}
              >
                � 로그인 / 회원가입
              </a>
              
              <a
                href="/test"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  padding: '12px 32px',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  margin: '0 10px',
                  transition: 'background-color 0.2s'
                }}
              >
                🧪 기능 테스트하기
              </a>
            </div>
            
            <p className="text-sm text-gray-500">
              설치 및 설정이 필요합니다. README를 참고하세요.
            </p>
          </div>

          {/* 사용 예시 */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold text-center mb-12">사용 예시</h2>
            
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4">📧 매일 받는 이메일</h3>
                  <div className="bg-gray-50 border rounded-lg p-4 text-sm">
                    <div className="font-semibold mb-2">📋 오늘의 업무 알림</div>
                    <div className="text-gray-600 mb-3">2024년 3월 15일 금요일</div>
                    
                    <div className="mb-3">
                      <div className="text-red-600 font-medium">🚨 지연된 업무 (1개):</div>
                      <div className="ml-4 mt-1">
                        - 월간 보고서 작성 (담당: 김철수)
                        <button className="ml-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                          ✅ 완료
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium">📅 오늘 해야할 일:</div>
                      <div className="ml-4 mt-1">
                        - 일일 회의 준비 (담당: 이영희)
                        <button className="ml-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                          ✅ 완료
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4">📊 대시보드 화면</h3>
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-blue-100 p-2 rounded text-center">
                        <div className="text-xs text-blue-600">전체 업무</div>
                        <div className="font-bold">12</div>
                      </div>
                      <div className="bg-green-100 p-2 rounded text-center">
                        <div className="text-xs text-green-600">오늘 완료</div>
                        <div className="font-bold">3</div>
                      </div>
                      <div className="bg-red-100 p-2 rounded text-center">
                        <div className="text-xs text-red-600">지연된 업무</div>
                        <div className="font-bold">1</div>
                      </div>
                      <div className="bg-yellow-100 p-2 rounded text-center">
                        <div className="text-xs text-yellow-600">완료율</div>
                        <div className="font-bold">85%</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs bg-white p-2 rounded">
                        <span>월간 보고서 작성</span>
                        <span className="text-red-500">⚠️ 지연</span>
                      </div>
                      <div className="flex justify-between items-center text-xs bg-white p-2 rounded">
                        <span>일일 회의 준비</span>
                        <span className="text-green-500">✅</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 기술 스택 */}
          <div style={{ marginTop: '80px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '32px' }}>무료 기술 스택</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '16px' }}>
                <div style={{ fontWeight: '600' }}>Next.js</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>프론트엔드</div>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '16px' }}>
                <div style={{ fontWeight: '600' }}>Supabase</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>데이터베이스</div>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '16px' }}>
                <div style={{ fontWeight: '600' }}>Vercel</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>호스팅</div>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '16px' }}>
                <div style={{ fontWeight: '600' }}>Gmail SMTP</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>이메일</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
