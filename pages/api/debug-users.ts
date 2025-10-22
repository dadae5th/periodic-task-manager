import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
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
    console.log('사용자 정보 조회 시작...')
    
    // 모든 사용자 조회 (비밀번호 포함)
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('사용자 조회 실패:', error)
      return res.status(500).json(createApiResponse(false, null, '사용자 조회 실패', error.message))
    }

    console.log(`총 ${users?.length || 0}명의 사용자 조회됨`)

    // 특정 사용자만 찾기
    const targetUser = (users as any)?.find((user: any) => user.email === 'bae.jae.kwon@drbworld.com')
    
    if (targetUser) {
      console.log('대상 사용자 찾음:', {
        email: targetUser.email,
        name: targetUser.name,
        hasPassword: !!targetUser.password,
        passwordLength: targetUser.password ? targetUser.password.length : 0,
        role: targetUser.role,
        created_at: targetUser.created_at
      })
    } else {
      console.log('대상 사용자를 찾을 수 없음')
    }

    return res.status(200).json(
      createApiResponse(true, {
        total_users: users?.length || 0,
        target_user: targetUser ? {
          email: targetUser.email,
          name: targetUser.name,
          hasPassword: !!targetUser.password,
          passwordLength: targetUser.password ? targetUser.password.length : 0,
          passwordValue: targetUser.password, // 디버그용으로 비밀번호도 표시
          role: targetUser.role,
          created_at: targetUser.created_at
        } : null,
        all_users: (users as any)?.map((user: any) => ({
          email: user.email,
          name: user.name,
          hasPassword: !!user.password,
          passwordValue: user.password, // 디버그용
          role: user.role
        })) || []
      })
    )
  } catch (error) {
    console.error('사용자 정보 조회 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.', error instanceof Error ? error.message : String(error))
    )
  }
}
