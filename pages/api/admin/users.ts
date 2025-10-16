import type { NextApiRequest, NextApiResponse } from 'next'
import { withAdminAuth, AuthenticatedRequest } from '@/lib/auth'
import { createApiResponse } from '@/lib/utils'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    // 모든 사용자 조회
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?order=created_at.desc`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`사용자 조회 실패: ${response.status}`)
    }

    const users = await response.json()

    return res.status(200).json(
      createApiResponse(true, users, '사용자 목록 조회 성공')
    )

  } catch (error) {
    console.error('사용자 목록 조회 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}

export default withAdminAuth(handler)
