import type { NextApiRequest, NextApiResponse } from 'next'
import { withAdminAuth, AuthenticatedRequest } from '@/lib/auth'
import { createApiResponse } from '@/lib/utils'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json(createApiResponse(false, null, '사용자 ID가 필요합니다.'))
  }

  switch (req.method) {
    case 'PATCH':
      return handleUpdateUser(req, res, id)
    case 'DELETE':
      return handleDeleteUser(req, res, id)
    default:
      res.setHeader('Allow', ['PATCH', 'DELETE'])
      return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }
}

// 사용자 정보 업데이트 (역할 변경)
async function handleUpdateUser(req: AuthenticatedRequest, res: NextApiResponse, userId: string) {
  try {
    const { role } = req.body

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json(
        createApiResponse(false, null, '유효하지 않은 역할입니다.')
      )
    }

    // 자기 자신의 역할은 변경할 수 없음
    if (userId === req.user?.id) {
      return res.status(403).json(
        createApiResponse(false, null, '자신의 역할은 변경할 수 없습니다.')
      )
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ role })
    })

    if (!response.ok) {
      throw new Error(`사용자 업데이트 실패: ${response.status}`)
    }

    const updatedUsers = await response.json()
    
    if (updatedUsers.length === 0) {
      return res.status(404).json(
        createApiResponse(false, null, '사용자를 찾을 수 없습니다.')
      )
    }

    return res.status(200).json(
      createApiResponse(true, updatedUsers[0], '사용자 역할이 변경되었습니다.')
    )

  } catch (error) {
    console.error('사용자 업데이트 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}

// 사용자 삭제
async function handleDeleteUser(req: AuthenticatedRequest, res: NextApiResponse, userId: string) {
  try {
    // 자기 자신은 삭제할 수 없음
    if (userId === req.user?.id) {
      return res.status(403).json(
        createApiResponse(false, null, '자신의 계정은 삭제할 수 없습니다.')
      )
    }

    // 사용자 삭제 (CASCADE로 관련 데이터도 자동 삭제됨)
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'DELETE',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`사용자 삭제 실패: ${response.status}`)
    }

    return res.status(200).json(
      createApiResponse(true, null, '사용자가 삭제되었습니다.')
    )

  } catch (error) {
    console.error('사용자 삭제 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}

export default withAdminAuth(handler)
