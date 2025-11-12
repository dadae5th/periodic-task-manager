import type { NextApiRequest, NextApiResponse } from 'next'
import { getEmailService } from '@/lib/email'
import { createApiResponse } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    const currentTime = new Date().toLocaleString('ko-KR')
    
    // 테스트용 업무 데이터
    const testTasks = [
      {
        id: `verification-task-${Date.now()}`,
        title: `🧪 완료 버튼 검증 테스트 - ${currentTime}`,
        description: '이 이메일에는 완료 버튼이 없어야 합니다. 대신 대시보드 링크만 있어야 합니다.',
        assignee: 'bae.jae.kwon@drbworld.com',
        due_date: new Date().toISOString().split('T')[0],
        completed: false,
        frequency: 'once' as const,
        frequency_details: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    const emailService = getEmailService()
    
    console.log('🧪 검증용 이메일 발송 시작:', currentTime)
    
    const result = await emailService.sendDailyTaskEmail(
      'bae.jae.kwon@drbworld.com',
      testTasks,
      [] // 지연 업무 없음
    )

    console.log('🧪 검증용 이메일 발송 완료:', result)

    return res.status(200).json(
      createApiResponse(true, {
        sent_at: currentTime,
        recipient: 'bae.jae.kwon@drbworld.com',
        tasks_count: testTasks.length,
        result: result,
        verification_note: '이 이메일에는 완료 버튼이 없고, 대신 "대시보드에서 완료 처리하세요" 메시지와 대시보드 링크만 있어야 합니다.'
      }, `검증용 이메일이 발송되었습니다 (${currentTime})`)
    )

  } catch (error) {
    console.error('검증용 이메일 발송 실패:', error)
    return res.status(500).json(
      createApiResponse(false, null, '검증용 이메일 발송에 실패했습니다.', error instanceof Error ? error.message : String(error))
    )
  }
}
