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

    // POST 요청 처리 - 새 업무 생성
    if (req.method === 'POST') {
      console.log('Creating new task:', req.body)
      
      try {
        const { title, description, assignee, frequency, frequency_details, due_date } = req.body

        // 필수 필드 검증
        if (!title || !assignee || !frequency || !due_date) {
          return res.status(400).json({
            success: false,
            error: '필수 필드가 누락되었습니다.',
            required: ['title', 'assignee', 'frequency', 'due_date']
          })
        }

        const newTask = {
          title,
          description: description || null,
          assignee,
          frequency,
          frequency_details: frequency_details || {},
          due_date,
          completed: false,
        }

        console.log('Inserting task:', newTask)
        const { data, error } = await (supabaseAdmin as any)
          .from('tasks')
          .insert(newTask)
          .select('id, title, assignee, frequency, due_date')
          .single()

        if (error) {
          console.error('Task creation error:', error)
          return res.status(500).json({
            success: false,
            error: 'Task creation failed',
            details: {
              message: error.message,
              code: error.code,
              details: error.details
            }
          })
        }

        console.log('Task created successfully:', data)
        return res.status(201).json({
          success: true,
          data: data,
          message: '업무가 성공적으로 생성되었습니다.'
        })

      } catch (createError) {
        console.error('Task creation exception:', createError)
        return res.status(500).json({
          success: false,
          error: 'Task creation failed',
          details: createError instanceof Error ? createError.message : 'Unknown error'
        })
      }
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

