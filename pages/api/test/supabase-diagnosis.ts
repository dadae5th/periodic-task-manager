import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const diagnosis = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: [] as any[]
  }

  try {
    // 1. 환경 변수 확인
    diagnosis.checks.push({
      test: '환경 변수 확인',
      status: 'checking',
      details: {
        supabase_url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        anon_key_set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    })

    // 2. 기본 연결 테스트
    console.log('Supabase 기본 연결 테스트 시작...')
    const connectionStart = Date.now()
    
    try {
      const { data, error } = await supabaseAdmin
        .from('tasks')
        .select('count', { count: 'exact' })
        .limit(0)

      const connectionTime = Date.now() - connectionStart

      if (error) {
        diagnosis.checks.push({
          test: '기본 연결 테스트',
          status: 'failed',
          error: error.message,
          details: error,
          response_time: connectionTime
        })
      } else {
        diagnosis.checks.push({
          test: '기본 연결 테스트',
          status: 'success',
          response_time: connectionTime,
          count: data
        })
      }
    } catch (connectionError) {
      diagnosis.checks.push({
        test: '기본 연결 테스트',
        status: 'error',
        error: connectionError instanceof Error ? connectionError.message : 'Unknown error',
        response_time: Date.now() - connectionStart
      })
    }

    // 3. 테이블 존재 확인
    console.log('테이블 존재 확인 테스트 시작...')
    try {
      const { data: tables, error: tablesError } = await supabaseAdmin
        .rpc('get_table_names')

      if (tablesError) {
        // RPC가 없다면 직접 테이블 조회 시도
        const { data, error } = await supabaseAdmin
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')

        if (error) {
          diagnosis.checks.push({
            test: '테이블 존재 확인',
            status: 'failed',
            error: error.message
          })
        } else {
          diagnosis.checks.push({
            test: '테이블 존재 확인',
            status: 'success',
            tables: data
          })
        }
      } else {
        diagnosis.checks.push({
          test: '테이블 존재 확인',
          status: 'success',
          tables: tables
        })
      }
    } catch (tableError) {
      diagnosis.checks.push({
        test: '테이블 존재 확인',
        status: 'error',
        error: tableError instanceof Error ? tableError.message : 'Unknown error'
      })
    }

    // 4. tasks 테이블 스키마 확인
    console.log('tasks 테이블 스키마 확인 시작...')
    try {
      const { data, error } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .limit(1)

      if (error) {
        diagnosis.checks.push({
          test: 'tasks 테이블 스키마 확인',
          status: 'failed',
          error: error.message,
          details: error
        })
      } else {
        diagnosis.checks.push({
          test: 'tasks 테이블 스키마 확인',
          status: 'success',
          sample_data: data,
          schema_detected: data.length > 0 ? Object.keys(data[0]) : 'empty_table'
        })
      }
    } catch (schemaError) {
      diagnosis.checks.push({
        test: 'tasks 테이블 스키마 확인',
        status: 'error',
        error: schemaError instanceof Error ? schemaError.message : 'Unknown error'
      })
    }

    // 5. 네트워크 연결 테스트
    console.log('네트워크 연결 테스트 시작...')
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      })

      diagnosis.checks.push({
        test: '네트워크 연결 테스트',
        status: response.ok ? 'success' : 'failed',
        http_status: response.status,
        response_headers: Object.fromEntries(response.headers.entries())
      })
    } catch (networkError) {
      diagnosis.checks.push({
        test: '네트워크 연결 테스트',
        status: 'error',
        error: networkError instanceof Error ? networkError.message : 'Unknown error'
      })
    }

    // 진단 결과 요약
    const successCount = diagnosis.checks.filter(c => c.status === 'success').length
    const totalChecks = diagnosis.checks.length

    return res.status(200).json({
      success: successCount === totalChecks,
      summary: `${successCount}/${totalChecks} 테스트 통과`,
      diagnosis
    })

  } catch (error) {
    console.error('Supabase 진단 중 전체 오류:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      diagnosis
    })
  }
}
