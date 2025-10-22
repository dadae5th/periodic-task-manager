import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // email_tokens 테이블 존재 여부 확인
    const { data, error } = await (supabaseAdmin as any)
      .from('email_tokens')
      .select('count(*)')
      .limit(1)

    if (error) {
      console.error('email_tokens 테이블 접근 오류:', error)
      return res.status(500).json(
        createApiResponse(false, { error: error.message }, 'email_tokens 테이블에 접근할 수 없습니다.')
      )
    }

    return res.status(200).json(
      createApiResponse(true, data, 'email_tokens 테이블이 존재하고 접근 가능합니다.')
    )

  } catch (error) {
    console.error('테이블 테스트 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}
