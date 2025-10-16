import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth, AuthenticatedRequest } from '@/lib/auth'
import { createApiResponse } from '@/lib/utils'

// SSL 인증서 검증 우회 설정 (개발 환경용)
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    const { title, description, assignee, frequency, due_date } = req.body

    // 입력 검증
    if (!title || !assignee || !frequency || !due_date) {
      return res.status(400).json(
        createApiResponse(false, null, '필수 필드가 누락되었습니다.')
      )
    }

    // 사용자는 자신의 이메일로만 업무를 생성할 수 있음 (관리자 제외)
    if (req.user?.role !== 'admin' && assignee !== req.user?.email) {
      return res.status(403).json(
        createApiResponse(false, null, '다른 사용자에게 업무를 할당할 수 없습니다.')
      )
    }

    // 새 업무 생성
    const newTask = {
      title,
      description: description || null,
      assignee,
      frequency,
      frequency_details: {}, // 기본값
      due_date,
      completed: false
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tasks`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(newTask)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('업무 생성 실패:', errorText)
      throw new Error(`업무 생성 실패: ${response.status}`)
    }

    const createdTasks = await response.json()
    const createdTask = createdTasks[0]

    return res.status(201).json(
      createApiResponse(true, createdTask, '업무가 성공적으로 생성되었습니다.')
    )

  } catch (error) {
    console.error('업무 생성 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}

export default withAuth(handler)
