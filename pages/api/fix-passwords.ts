import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    console.log('사용자 비밀번호 업데이트 시작...')
    
    // 1. bae.jae.kwon@drbworld.com에게 test123 비밀번호 설정
    const { data: adminUpdate, error: adminError } = await (supabaseAdmin as any)
      .from('users')
      .update({ 
        password: 'test123',
        role: 'admin' // 관리자 권한도 확실히 설정
      })
      .eq('email', 'bae.jae.kwon@drbworld.com')
      .select()

    if (adminError) {
      console.error('관리자 계정 업데이트 실패:', adminError)
      return res.status(500).json(createApiResponse(false, null, '관리자 계정 업데이트 실패', adminError.message))
    }

    console.log('관리자 계정 업데이트 성공:', adminUpdate)

    // 2. 모든 사용자 중 비밀번호가 없는 사용자들에게 기본 비밀번호 설정
    const { data: allUsers, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, password')
      .is('password', null)

    if (fetchError) {
      console.error('사용자 조회 실패:', fetchError)
    } else if (allUsers && allUsers.length > 0) {
      console.log(`비밀번호가 없는 사용자 ${allUsers.length}명 발견`)
      
      for (const user of allUsers as any[]) {
        if (user.email !== 'bae.jae.kwon@drbworld.com') { // 관리자는 이미 처리함
          const { error: updateError } = await (supabaseAdmin as any)
            .from('users')
            .update({ password: 'temp123' })
            .eq('id', user.id)
          
          if (updateError) {
            console.error(`사용자 ${user.email} 업데이트 실패:`, updateError)
          } else {
            console.log(`사용자 ${user.email} 비밀번호 설정 완료`)
          }
        }
      }
    }

    // 3. 업데이트 결과 확인
    const { data: updatedUsers, error: checkError } = await supabaseAdmin
      .from('users')
      .select('email, password, role')
      .order('created_at', { ascending: true })

    if (checkError) {
      console.error('업데이트 확인 실패:', checkError)
    }

    return res.status(200).json(
      createApiResponse(true, {
        admin_updated: adminUpdate?.length || 0,
        total_users_checked: updatedUsers?.length || 0,
        updated_users: (updatedUsers as any)?.map((user: any) => ({
          email: user.email,
          hasPassword: !!user.password,
          passwordValue: user.password, // 디버그용
          role: user.role
        })) || []
      }, '비밀번호 업데이트 완료')
    )
  } catch (error) {
    console.error('비밀번호 업데이트 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.', error instanceof Error ? error.message : String(error))
    )
  }
}
