import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('=== Supabase 연결 테스트 시작 ===')
    
    // 환경 변수 확인
    const envCheck = {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      url_value: process.env.NEXT_PUBLIC_SUPABASE_URL
    }
    
    console.log('환경 변수 확인:', envCheck)

    // 기본 연결 테스트
    console.log('Supabase 연결 테스트 중...')
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .limit(1)

    if (error) {
      console.log('Supabase 연결 실패:', error)
      return res.status(500).json({
        success: false,
        error: 'Supabase 연결 실패',
        details: error,
        env_check: envCheck
      })
    }

    console.log('Supabase 연결 성공!', data)
    return res.status(200).json({
      success: true,
      message: 'Supabase 연결 성공',
      data: data,
      env_check: envCheck
    })

  } catch (error) {
    console.error('테스트 중 오류:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      env_check: {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    })
  }
}
