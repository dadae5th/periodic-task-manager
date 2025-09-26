import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Simple test API called:', new Date().toISOString())
  
  try {
    // 환경변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        success: false,
        error: '환경변수가 설정되지 않았습니다.',
        missing: {
          supabaseUrl: !supabaseUrl,
          serviceRoleKey: !serviceRoleKey
        }
      })
    }

    // 단순한 SELECT 쿼리만 실행
    console.log('Executing simple query...')
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('id, title, assignee, completed')
      .limit(5)
    
    console.log('Query result:', { dataCount: data?.length, error })

    if (error) {
      console.error('Query error:', error)
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        details: {
          message: error.message,
          code: error.code,
          details: error.details
        }
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Simple query successful',
      data: {
        tasks: data || [],
        count: data?.length || 0
      }
    })

  } catch (error) {
    console.error('Handler error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : 'Unknown error'
    })
  }
}
