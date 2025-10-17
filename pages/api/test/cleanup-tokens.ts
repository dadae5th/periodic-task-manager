import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    // 만료된 토큰들 삭제
    const { data: deletedExpired, error: deleteExpiredError } = await (supabaseAdmin as any)
      .from('email_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (deleteExpiredError) {
      console.error('만료된 토큰 삭제 실패:', deleteExpiredError)
    }

    // 사용된 토큰들 삭제 (1시간 이상 된 것들)
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const { data: deletedUsed, error: deleteUsedError } = await (supabaseAdmin as any)
      .from('email_tokens')
      .delete()
      .eq('used', true)
      .lt('used_at', oneHourAgo.toISOString())

    if (deleteUsedError) {
      console.error('사용된 토큰 삭제 실패:', deleteUsedError)
    }

    // 현재 토큰 상태 조회
    const { data: currentTokens, error: selectError } = await (supabaseAdmin as any)
      .from('email_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (selectError) {
      console.error('토큰 조회 실패:', selectError)
      return res.status(500).json(
        createApiResponse(false, null, '토큰 조회에 실패했습니다.')
      )
    }

    return res.status(200).json(
      createApiResponse(true, {
        message: '토큰 정리 완료',
        current_tokens: currentTokens || [],
        cleanup_time: new Date().toISOString()
      }, '만료된 토큰과 오래된 사용 토큰을 정리했습니다.')
    )

  } catch (error) {
    console.error('토큰 정리 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}
