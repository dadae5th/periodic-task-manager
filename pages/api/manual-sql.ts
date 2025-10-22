import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: '허용되지 않는 메서드' })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Supabase 환경 변수가 설정되지 않았습니다.' })
    }

    console.log('Supabase SQL 실행 시도...')

    // PostgREST API를 통한 SQL 실행 시도
    const sqlQueries = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;',
      'UPDATE users SET password = \'test123\' WHERE email = \'bae.jae.kwon@drbworld.com\';',
      'UPDATE users SET password = \'temp123\' WHERE email != \'bae.jae.kwon@drbworld.com\' AND password IS NULL;'
    ]

    const results = []

    // SQL Editor API 시도
    for (let i = 0; i < sqlQueries.length; i++) {
      const sql = sqlQueries[i]
      console.log(`SQL 실행 ${i + 1}: ${sql}`)

      try {
        // PostgREST SQL 함수 호출 시도
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ sql })
        })

        if (response.ok) {
          const result = await response.text()
          console.log(`SQL ${i + 1} 성공:`, result)
          results.push({ sql, success: true, result })
        } else {
          const error = await response.text()
          console.error(`SQL ${i + 1} 실패:`, error)
          results.push({ sql, success: false, error })
        }
      } catch (err) {
        console.error(`SQL ${i + 1} 오류:`, err)
        results.push({ sql, success: false, error: String(err) })
      }
    }

    // 대안: pg_admin이나 직접 PostgreSQL 연결 정보 제공
    const postgresConnectionInfo = {
      host: supabaseUrl.replace('https://', '').replace('.supabase.co', '') + '.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      user: 'postgres.xwpzteuzrnqdquddqdzp',
      ssl: true
    }

    return res.status(200).json({
      success: false,
      message: 'SQL 자동 실행이 불가능합니다. 수동 실행이 필요합니다.',
      sql_results: results,
      manual_instructions: {
        step1: 'Supabase 대시보드로 이동: https://supabase.com/dashboard',
        step2: '프로젝트 선택 > SQL Editor',
        step3: '다음 SQL을 차례로 실행:',
        queries: sqlQueries,
        alternative: 'Table Editor에서 users 테이블 > Add Column > password (TEXT 타입)'
      },
      postgres_connection: postgresConnectionInfo
    })

  } catch (error) {
    console.error('SQL 실행 중 오류:', error)
    return res.status(500).json({
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}
