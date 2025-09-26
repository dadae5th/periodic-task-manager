import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Debug API called:', new Date().toISOString())
  
  try {
    // 기본 환경 정보
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      nodeVersion: process.version,
      platform: process.platform,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_REGION: process.env.VERCEL_REGION,
      },
      supabaseCheck: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
      },
      emailCheck: {
        service: process.env.EMAIL_SERVICE || 'Missing',
        user: process.env.EMAIL_USER ? 'Set' : 'Missing',
        password: process.env.EMAIL_PASSWORD ? 'Set' : 'Missing',
      }
    }

    console.log('Debug info:', JSON.stringify(debugInfo, null, 2))

    // Supabase 클라이언트 테스트
    try {
      const { supabaseAdmin } = require('../../lib/supabase')
      
      if (supabaseAdmin) {
        console.log('Supabase client loaded successfully')
        
        // 간단한 쿼리 테스트
        const { data, error } = await supabaseAdmin
          .from('tasks')
          .select('count')
          .limit(1)
        
        debugInfo.supabaseTest = {
          clientLoaded: true,
          queryResult: error ? `Error: ${error.message}` : 'Success',
          dataReceived: !!data
        }
      } else {
        debugInfo.supabaseTest = {
          clientLoaded: false,
          error: 'Supabase client is null/undefined'
        }
      }
    } catch (supabaseError) {
      console.error('Supabase test error:', supabaseError)
      debugInfo.supabaseTest = {
        clientLoaded: false,
        error: supabaseError instanceof Error ? supabaseError.message : 'Unknown error'
      }
    }

    return res.status(200).json({
      success: true,
      data: debugInfo
    })

  } catch (error) {
    console.error('Debug API error:', error)
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
