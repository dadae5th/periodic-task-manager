import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * ⚠️ 완료 API 완전 제거됨 ⚠️ 
 * 이메일 완료 버튼이 완전히 제거되었으므로 이 API는 더 이상 사용되지 않습니다.
 * 업무 완료는 오직 대시보드에서만 가능합니다.
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://periodic-task-manager.vercel.app'
  
  // 🚫 완료 API 완전 제거 - 모든 요청을 대시보드로 리다이렉트
  console.log('🚫 완료 API가 제거되었습니다. 대시보드로 리다이렉트합니다.')
  console.log('요청 정보:', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  })
  
  if (req.method === 'GET') {
    // 이메일에서 오는 GET 요청을 대시보드로 리다이렉트
    return res.redirect(302, `${appUrl}/dashboard?message=${encodeURIComponent('완료 버튼이 제거되었습니다. 대시보드에서 완료 처리하세요.')}`)
  } else {
    // 다른 모든 요청은 404 반환
    return res.status(404).json({
      success: false,
      message: '완료 API가 제거되었습니다. 대시보드에서 완료 처리하세요.',
      redirect: `${appUrl}/dashboard`
    })
  }
}
