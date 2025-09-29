import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('Supabase 연결 테스트 시작...')
    
    // 환경 변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set')
    console.log('Service Role Key:', serviceRoleKey ? 'Set (length: ' + serviceRoleKey.length + ')' : 'Not set')
    
    // 간단한 쿼리 테스트
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Supabase 쿼리 오류:', error)
      return res.status(500).json(
        createApiResponse(false, null, 'Supabase 연결 실패', error.message)
      )
    }
    
    console.log('Supabase 연결 성공!')
    
    return res.status(200).json(
      createApiResponse(true, {
        supabase_connected: true,
        environment_check: {
          url: !!supabaseUrl,
          service_key: !!serviceRoleKey
        },
        test_query_result: data
      }, 'Supabase 연결 성공')
    )
  } catch (error) {
    console.error('연결 테스트 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '연결 테스트 실패', 
        error instanceof Error ? error.message : '알 수 없는 오류')
    )
  }
}
