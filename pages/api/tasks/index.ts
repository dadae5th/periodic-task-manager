import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { createApiResponse } from '../../../lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Tasks API called:', new Date().toISOString(), req.method)
  
  try {
    // 환경변수 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        success: false,
        error: '환경변수가 설정되지 않았습니다.'
      })
    }

    // GET 요청만 처리
    if (req.method === 'GET') {
      console.log('Attempting to query tasks table...')
      
      try {
        // 단계별로 테스트
        console.log('Step 1: Basic select with specific columns')
        const { data, error } = await supabaseAdmin
          .from('tasks')
          .select('id, title, assignee')
          .limit(5)

        console.log('Query result:', { hasData: !!data, dataLength: data?.length, hasError: !!error })

        if (error) {
          console.error('Query error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          })
          return res.status(500).json({
            success: false,
            error: 'Database query failed',
            details: {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            }
          })
        }

        return res.status(200).json({
          success: true,
          data: {
            tasks: data || [],
            count: data?.length || 0
          }
        })
      } catch (queryError) {
        console.error('Query exception:', queryError)
        return res.status(500).json({
          success: false,
          error: 'Query execution failed',
          details: queryError instanceof Error ? queryError.message : 'Unknown query error'
        })
      }
    }

    // POST 요청 처리 (단순화)
    if (req.method === 'POST') {
      return res.status(201).json({
        success: true,
        message: 'POST method not implemented yet'
      })
    }

    // 기타 메서드
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({
      success: false,
      error: '허용되지 않는 메서드'
    })

  } catch (error) {
    console.error('Handler error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    })
  }
}

