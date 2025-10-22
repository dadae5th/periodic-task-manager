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
    console.log('수동 스키마 업데이트 시작...')

    // 1. 현재 테이블 구조 확인
    const { data: currentUsers, error: fetchError } = await (supabaseAdmin as any)
      .from('users')
      .select('*')
      .limit(1)

    if (fetchError) {
      console.error('현재 사용자 데이터 조회 실패:', fetchError)
      return res.status(500).json(
        createApiResponse(false, null, '현재 데이터 조회 실패', fetchError.message)
      )
    }

    console.log('현재 사용자 테이블 첫 번째 행:', currentUsers?.[0])

    // 2. 모든 사용자를 백업용으로 조회
    const { data: allUsers, error: allUsersError } = await (supabaseAdmin as any)
      .from('users')
      .select('*')

    if (allUsersError) {
      console.error('전체 사용자 조회 실패:', allUsersError)
      return res.status(500).json(
        createApiResponse(false, null, '전체 사용자 조회 실패', allUsersError.message)
      )
    }

    console.log(`총 ${allUsers?.length || 0}명의 사용자 발견`)

    // 3. 임시 사용자 테이블을 만들어서 마이그레이션 시도
    try {
      // 새로운 임시 사용자를 삽입하여 password 컬럼이 있는지 테스트
      const testUser = {
        id: '99999999-temp-test-user-99999999',
        email: 'test@example.com',
        name: 'Test User',
        password: 'test123',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: insertResult, error: insertError } = await (supabaseAdmin as any)
        .from('users')
        .insert([testUser])
        .select()

      if (insertError) {
        console.error('테스트 삽입 실패:', insertError)
        
        // password 컬럼이 없는 경우의 메시지
        if (insertError.message?.includes('password')) {
          return res.status(400).json({
            success: false,
            message: 'password 컬럼이 존재하지 않습니다.',
            solution: 'Supabase 대시보드 > Table Editor > users 테이블에서 password 컬럼을 수동으로 추가해주세요.',
            sql_command: 'ALTER TABLE users ADD COLUMN password TEXT;',
            current_columns: Object.keys(currentUsers?.[0] || {}),
            error: insertError.message
          })
        }

        return res.status(500).json(
          createApiResponse(false, null, '테스트 삽입 실패', insertError.message)
        )
      }

      // 테스트 삽입 성공 - 테스트 사용자 삭제
      await (supabaseAdmin as any)
        .from('users')
        .delete()
        .eq('id', testUser.id)

      console.log('password 컬럼이 이미 존재합니다!')

      return res.status(200).json({
        success: true,
        message: 'password 컬럼이 이미 존재합니다.',
        current_users: allUsers,
        columns_detected: Object.keys(currentUsers?.[0] || {})
      })

    } catch (error) {
      console.error('테스트 중 오류:', error)
      return res.status(500).json(
        createApiResponse(false, null, '테스트 중 오류 발생', error instanceof Error ? error.message : String(error))
      )
    }

  } catch (error) {
    console.error('스키마 확인 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.', error instanceof Error ? error.message : String(error))
    )
  }
}
