import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    // 테스트용 업무들 생성
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const testTasks = [
      {
        title: '📊 일일 매출 보고서 작성',
        description: '전날 매출 데이터를 정리하고 보고서를 작성합니다.',
        assignee: 'bae.jae.kwon@drbworld.com',
        frequency: 'daily',
        frequency_details: {},
        due_date: todayStr,
        completed: false
      },
      {
        title: '📧 고객 문의 답변',
        description: '접수된 고객 문의사항에 대한 답변을 작성합니다.',
        assignee: 'bae.jae.kwon@drbworld.com',
        frequency: 'daily',
        frequency_details: {},
        due_date: todayStr,
        completed: false
      },
      {
        title: '🔍 시스템 상태 점검 (지연)',
        description: '서버 상태 및 시스템 로그를 확인합니다.',
        assignee: 'bae.jae.kwon@drbworld.com',
        frequency: 'daily',
        frequency_details: {},
        due_date: yesterdayStr,
        completed: false
      },
      {
        title: '📱 앱 업데이트 배포 (지연)',
        description: '새로운 버전의 앱을 스토어에 배포합니다.',
        assignee: 'bae.jae.kwon@drbworld.com',
        frequency: null,
        frequency_details: null,
        due_date: yesterdayStr,
        completed: false
      }
    ]

    // 기존 테스트 업무들 삭제
    await supabaseAdmin
      .from('tasks')
      .delete()
      .like('title', '%테스트%')

    await supabaseAdmin
      .from('tasks')
      .delete()
      .or('title.like.%매출 보고서%,title.like.%고객 문의%,title.like.%시스템 상태%,title.like.%앱 업데이트%')

    // 새 테스트 업무들 추가
    const { data, error } = await (supabaseAdmin as any)
      .from('tasks')
      .insert(testTasks)
      .select()

    if (error) {
      console.error('테스트 업무 생성 실패:', error)
      return res.status(500).json(
        createApiResponse(false, null, '테스트 업무 생성에 실패했습니다.', error.message)
      )
    }

    return res.status(200).json(
      createApiResponse(true, {
        created_tasks: data,
        message: '테스트 업무가 생성되었습니다.',
        note: '이제 /api/email/send-daily?force_weekend=true를 호출하여 개선된 이메일을 테스트해보세요.'
      })
    )
  } catch (error) {
    console.error('테스트 업무 생성 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}
