import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { createApiResponse } from '../../../lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // UTF-8 인코딩 설정
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  
  console.log('Today completions API called:', new Date().toISOString(), req.method)
  
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).json(
        createApiResponse(false, null, '허용되지 않는 메서드')
      )
    }

    // 오늘 날짜 계산 (한국 시간 기준)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayStr = today.toISOString()
    const tomorrowStr = tomorrow.toISOString()

    console.log('Querying completions between:', todayStr, 'and', tomorrowStr)

    // 오늘 완료된 업무 개수 조회
    const { data, error, count } = await supabaseAdmin
      .from('task_completions')
      .select('id, task_id, completed_by, completed_at, tasks(title)', { count: 'exact' })
      .gte('completed_at', todayStr)
      .lt('completed_at', tomorrowStr)
      .order('completed_at', { ascending: false })

    if (error) {
      console.error('Completions query error:', error)
      return res.status(500).json(
        createApiResponse(false, null, `Database query failed: ${error.message}`)
      )
    }

    console.log('Today completions found:', count, 'records')

    return res.status(200).json(
      createApiResponse(true, {
        count: count || 0,
        completions: data || [],
        date: today.toISOString().split('T')[0]
      }, `오늘 완료된 업무: ${count || 0}개`)
    )

  } catch (error) {
    console.error('Handler error:', error)
    return res.status(500).json(
      createApiResponse(false, null, error instanceof Error ? error.message : '알 수 없는 오류')
    )
  }
}
