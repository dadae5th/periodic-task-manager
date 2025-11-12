import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    
    // 테스트 업무 생성
    const { data: task, error } = await (supabaseAdmin as any)
      .from('tasks')
      .insert([
        {
          title: '테스트 업무 - 이메일 완료 버튼 확인',
          description: '이메일에서 완료 버튼 클릭 테스트용',
          assignee: 'test@example.com',
          frequency: 'once',
          frequency_details: {},
          due_date: today,
          completed: false
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('업무 생성 실패:', error)
      return res.status(500).json({ error: '업무 생성 실패', details: error })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return res.status(200).json({
      success: true,
      task,
      dashboardUrl: `${appUrl}/dashboard?message=${encodeURIComponent('테스트 업무가 생성되었습니다. 대시보드에서 완료 처리하세요.')}&highlight=${task.id}`,
      message: '테스트 업무가 생성되었습니다. 대시보드에서 완료 처리하세요.'
    })
  } catch (error) {
    console.error('테스트 API 오류:', error)
    return res.status(500).json({ error: '서버 오류', details: error })
  }
}
