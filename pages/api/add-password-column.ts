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
    console.log('데이터베이스 스키마 업데이트 시작...')
    
    // 1. password 컬럼이 이미 있는지 확인
    try {
      const { data: existingData, error: checkError } = await (supabaseAdmin as any)
        .from('users')
        .select('password')
        .limit(1)
      
      if (!checkError) {
        console.log('password 컬럼이 이미 존재합니다.')
        return res.status(200).json(
          createApiResponse(true, { message: 'password 컬럼이 이미 존재합니다.' })
        )
      }
    } catch (checkErr) {
      console.log('password 컬럼이 없습니다. 추가를 시도합니다.')
    }

    // 2. password 컬럼 추가 - SQL을 직접 실행
    const { data: alterResult, error: alterError } = await (supabaseAdmin as any)
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;' 
      })

    if (alterError) {
      console.error('ALTER TABLE 실패:', alterError)
      
      // RPC가 없다면 다른 방법 시도 - REST API로 직접
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;'
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }

        console.log('REST API로 스키마 업데이트 성공')
      } catch (restError) {
        console.error('REST API 스키마 업데이트도 실패:', restError)
        
        // 수동으로 INSERT 시도해서 컬럼 존재 여부 재확인
        return res.status(500).json(
          createApiResponse(false, null, 'password 컬럼 추가 실패. Supabase 관리자 패널에서 수동으로 추가해주세요.', `ALTER: ${alterError.message}, REST: ${restError}`)
        )
      }
    } else {
      console.log('RPC로 스키마 업데이트 성공:', alterResult)
    }

    // 3. 업데이트 후 확인
    try {
      const { data: verifyData, error: verifyError } = await (supabaseAdmin as any)
        .from('users')
        .select('email, password')
        .limit(1)
      
      if (verifyError) {
        console.error('컬럼 추가 확인 실패:', verifyError)
        return res.status(500).json(
          createApiResponse(false, null, '컬럼 추가 확인 실패', verifyError.message)
        )
      }

      console.log('password 컬럼 추가 확인됨')
      
      return res.status(200).json(
        createApiResponse(true, {
          column_added: true,
          verification_data: verifyData
        }, 'password 컬럼이 성공적으로 추가되었습니다.')
      )
    } catch (verifyErr) {
      return res.status(500).json(
        createApiResponse(false, null, '컬럼 추가 후 확인 중 오류', String(verifyErr))
      )
    }

  } catch (error) {
    console.error('스키마 업데이트 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.', error instanceof Error ? error.message : String(error))
    )
  }
}
