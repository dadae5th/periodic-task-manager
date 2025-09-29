import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('=== 수동 Supabase REST API 테스트 ===')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        success: false,
        error: '환경 변수가 설정되지 않음',
        details: {
          url_set: !!supabaseUrl,
          key_set: !!serviceKey
        }
      })
    }

    console.log('환경 변수 확인됨:', { url: supabaseUrl })

    // Node.js 내장 fetch 대신 axios나 node-fetch를 사용하지 않고
    // 수동으로 HTTP 요청을 보내보겠습니다
    const testUrl = `${supabaseUrl}/rest/v1/tasks?select=count&limit=1`
    
    console.log('요청 URL:', testUrl)
    console.log('요청 헤더 준비 중...')

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    })

    console.log('응답 상태:', response.status)
    console.log('응답 헤더:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.log('에러 응답:', errorText)
      
      return res.status(response.status).json({
        success: false,
        error: `HTTP ${response.status}`,
        details: errorText,
        url: testUrl
      })
    }

    const data = await response.text()
    console.log('성공 응답:', data)

    return res.status(200).json({
      success: true,
      message: 'Supabase REST API 연결 성공',
      response_status: response.status,
      data: data,
      url: testUrl
    })

  } catch (error) {
    console.error('테스트 중 오류:', error)
    
    // fetch 에러의 경우 더 자세한 정보 제공
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      return res.status(500).json({
        success: false,
        error: 'Network fetch failed',
        details: {
          message: error.message,
          cause: (error as any).cause?.toString(),
          stack: error.stack
        },
        suggestion: 'Network connectivity or SSL certificate issue'
      })
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    })
  }
}
