import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiResponse } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://periodic-task-manager.vercel.app'
    
    // 테스트용 이메일과 업무 ID
    const testEmail = 'test@example.com'
    const testTaskIds = ['test-task-1', 'test-task-2']
    
    // batch-complete GET 요청 시뮬레이션
    const batchCompleteUrl = `${appUrl}/api/tasks/batch-complete?tasks=${testTaskIds.join(',')}&completed_by=${testEmail}`
    
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>메일 완료 버튼 테스트</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .test-section { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #dee2e6; }
        .btn { display: inline-block; padding: 12px 24px; margin: 10px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; border: none; cursor: pointer; font-size: 16px; }
        .btn-batch { background: #17a2b8; }
        .log { background: #000; color: #0f0; padding: 15px; border-radius: 5px; font-family: monospace; margin: 10px 0; }
        .info { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>📧 메일 완료 버튼 자동 로그인 테스트</h1>
    
    <div class="info">
        <strong>테스트 목적:</strong> 메일에서 완료 버튼 클릭시 자동 로그인이 작동하는지 확인<br>
        <strong>현재 시간:</strong> ${new Date().toLocaleString('ko-KR')}<br>
        <strong>테스트 이메일:</strong> ${testEmail}
    </div>
    
    <div class="test-section">
        <h3>🔗 1. GET 방식 일괄완료 테스트</h3>
        <p>이메일에서 직접 링크를 클릭하는 방식을 시뮬레이션합니다.</p>
        <a href="${batchCompleteUrl}" class="btn">GET 방식으로 완료 처리</a>
        <div class="log">
${batchCompleteUrl}
        </div>
    </div>
    
    <div class="test-section">
        <h3>📝 2. POST 방식 일괄완료 테스트</h3>
        <p>이메일 폼에서 완료 버튼을 클릭하는 방식을 시뮬레이션합니다.</p>
        <form method="post" action="${appUrl}/api/tasks/batch-complete" style="margin: 10px 0;">
            <input type="hidden" name="completed_by" value="${testEmail}" />
            <input type="hidden" name="task_ids" value="test-task-1" />
            <input type="hidden" name="task_ids" value="test-task-2" />
            <button type="submit" class="btn btn-batch">POST 방식으로 완료 처리</button>
        </form>
    </div>
    
    <div class="test-section">
        <h3>🔍 3. 디버깅 정보</h3>
        <p><strong>예상 동작:</strong></p>
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
    
    <div class="test-section">
        <h3>🛠️ 4. 기타 테스트 도구</h3>
        <a href="${appUrl}/api/test/cleanup-tokens" class="btn" target="_blank">토큰 정리</a>
        <a href="${appUrl}/api/test/email-tokens-table" class="btn" target="_blank">토큰 상태 확인</a>
        <a href="${appUrl}/api/email/send-daily" class="btn" target="_blank">실제 메일 발송</a>
        <a href="${appUrl}/dashboard" class="btn" target="_blank">대시보드 직접 접속</a>
    </div>
</body>
</html>
    `

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(200).send(html)

  } catch (error) {
    console.error('테스트 페이지 생성 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}
