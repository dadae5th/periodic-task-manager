import Head from 'next/head'

export default function EmailCompletionTest() {
  const appUrl = 'https://periodic-task-manager.vercel.app'
  const testEmail = 'test@example.com'
  const testTaskIds = ['test-task-1', 'test-task-2']
  
  return (
    <>
      <Head>
        <title>이메일 완료 버튼 테스트</title>
      </Head>
      
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
        <h1>📧 이메일 완료 버튼 자동 로그인 테스트</h1>
        
        <div style={{ background: '#d1ecf1', border: '1px solid #bee5eb', padding: '15px', borderRadius: '5px', margin: '20px 0' }}>
          <strong>테스트 목적:</strong> 메일에서 완료 버튼 클릭시 자동 로그인이 작동하는지 확인<br/>
          <strong>현재 시간:</strong> {new Date().toLocaleString('ko-KR')}<br/>
          <strong>테스트 이메일:</strong> {testEmail}
        </div>
        
        <div style={{ background: '#f8f9fa', padding: '20px', margin: '20px 0', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3>🔗 1. GET 방식 일괄완료 테스트</h3>
          <p>이메일에서 직접 링크를 클릭하는 방식을 시뮬레이션합니다.</p>
          <div style={{ 
              padding: '12px 24px', 
              margin: '10px', 
              background: '#f8f9fa', 
              color: '#666',
              border: '1px solid #dee2e6', 
              borderRadius: '5px',
              fontSize: '16px'
            }}>
            ❌ 완료 버튼이 제거되었습니다. 대시보드에서 완료 처리하세요.
          </div>
          <a 
            href={`${appUrl}/dashboard`}
            style={{ 
              display: 'inline-block', 
              padding: '12px 24px', 
              margin: '10px', 
              background: '#007bff', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '5px',
              fontSize: '16px'
            }}
          >
            📊 대시보드로 이동
          </a>
          <div style={{ background: '#000', color: '#0f0', padding: '15px', borderRadius: '5px', fontFamily: 'monospace', margin: '10px 0' }}>
            {`${appUrl}/api/tasks/batch-complete?tasks=${testTaskIds.join(',')}&completed_by=${testEmail}`}
          </div>
        </div>
        
        <div style={{ background: '#fff3cd', padding: '20px', margin: '20px 0', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
          <h3>� 2. 완료 기능 완전 제거</h3>
          <p style={{ margin: '10px 0' }}>
            ❌ <strong>모든 완료 버튼과 폼이 제거되었습니다.</strong><br/>
            이메일에서 완료 처리가 불가능합니다. 대시보드를 이용하세요.
          </p>
          <a href={`${appUrl}/dashboard`} style={{ 
              display: 'inline-block',
              padding: '12px 24px', 
              margin: '10px 5px', 
              background: '#007bff', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '5px',
              fontSize: '16px'
            }}>
            📊 대시보드로 이동
          </a>
        </div>
        
        <div style={{ background: '#f8f9fa', padding: '20px', margin: '20px 0', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3>🔍 3. 디버그 모드 테스트</h3>
          <p>상세한 로그와 함께 완료 과정을 추적합니다.</p>
          <div style={{ 
              padding: '12px 24px', 
              margin: '10px', 
              background: '#f8f9fa', 
              color: '#666',
              border: '1px solid #dee2e6', 
              borderRadius: '5px',
              fontSize: '16px'
            }}>
            ❌ 완료 버튼이 제거되었습니다. 대시보드에서 완료 처리하세요.
          </div>
          <a 
            href={`${appUrl}/dashboard`}
            style={{ 
              display: 'inline-block', 
              padding: '12px 24px', 
              margin: '10px', 
              background: '#007bff', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '5px',
              fontSize: '16px'
            }}
          >
            � 대시보드로 이동
          </a>
          
          <form method="post" action={`${appUrl}/api/test/batch-complete-debug`} style={{ margin: '10px 0', display: 'inline-block' }}>
            <input type="hidden" name="completed_by" value={testEmail} />
            <input type="hidden" name="task_ids" value="debug-task-1" />
            <input type="hidden" name="task_ids" value="debug-task-2" />
            <button 
              type="submit" 
              style={{ 
                padding: '12px 24px', 
                margin: '10px', 
                background: '#dc3545', 
                color: 'white', 
                border: 'none',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              🐛 디버그 POST 테스트
            </button>
          </form>
        </div>
        
        <div style={{ background: '#f8f9fa', padding: '20px', margin: '20px 0', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3>🛠️ 4. 기타 테스트 도구</h3>
          <a href={`${appUrl}/api/test/cleanup-tokens`} target="_blank" style={{ display: 'inline-block', padding: '10px 20px', margin: '5px', background: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>토큰 정리</a>
          <a href={`${appUrl}/api/test/email-tokens-table`} target="_blank" style={{ display: 'inline-block', padding: '10px 20px', margin: '5px', background: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>토큰 상태 확인</a>
          <a href={`${appUrl}/api/email/send-daily`} target="_blank" style={{ display: 'inline-block', padding: '10px 20px', margin: '5px', background: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>실제 메일 발송</a>
          <a href={`${appUrl}/dashboard`} target="_blank" style={{ display: 'inline-block', padding: '10px 20px', margin: '5px', background: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>대시보드 직접 접속</a>
        </div>
        
        <div style={{ background: '#f8f9fa', padding: '20px', margin: '20px 0', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3>🔍 5. 예상 동작</h3>
          <ol>
            <li>batch-complete API 호출</li>
            <li>업무 완료 처리 (Mock 데이터)</li>
            <li>이메일 토큰 생성</li>
            <li>자동 로그인 페이지로 리디렉션</li>
            <li>쿠키 설정 후 대시보드 표시</li>
          </ol>
          
          <p><strong>로그 확인:</strong></p>
          <ul>
            <li><a href="https://vercel.com/dadae5th/periodic-task-manager/functions" target="_blank">Vercel 함수 로그</a></li>
            <li>브라우저 개발자 도구 Network 탭</li>
            <li>Console 로그 확인</li>
          </ul>
        </div>
      </div>
    </>
  )
}
