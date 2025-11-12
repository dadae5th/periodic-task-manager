import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse } from '@/lib/utils'
import { getEmailService } from '@/lib/email'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  try {
    // 데이터베이스에서 모든 등록된 사용자 조회
    console.log('등록된 사용자 목록 조회 중...')
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('email, name, role')
      .order('created_at', { ascending: true })

    if (usersError) {
      console.error('사용자 목록 조회 실패:', usersError)
      // 사용자 조회 실패시 기본 관리자만 수신자로 설정
      console.log('기본 관리자로 폴백')
    }

    // 수신자 목록 생성 (등록된 사용자 + 기본 관리자)
    let recipients = ['bae.jae.kwon@drbworld.com'] // 기본 관리자
    
    if (users && users.length > 0) {
      const userEmails = users.map((user: any) => user.email).filter((email: string) => email)
      // 중복 제거하여 수신자 목록 업데이트
      const allEmails = recipients.concat(userEmails)
      recipients = Array.from(new Set(allEmails))
      console.log(`총 ${recipients.length}명의 수신자: ${recipients.join(', ')}`)
    } else {
      console.log('등록된 사용자 없음, 기본 관리자만 수신')
    }

    // 모든 업무 조회
    const { data: allTasks, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true })

    if (error) {
      console.error('업무 조회 실패:', error)
      return res.status(500).json(createApiResponse(false, null, '업무 조회 실패'))
    }

    const today = new Date().toISOString().split('T')[0]
    
    // 오늘 할 일과 지연된 업무 분류
    const todayTasks = (allTasks || []).filter((task: any) => 
      task.due_date === today && !task.completed
    )
    
    const overdueTasks = (allTasks || []).filter((task: any) => 
      task.due_date < today && !task.completed
    )

    console.log(`오늘 업무: ${todayTasks.length}개, 지연 업무: ${overdueTasks.length}개`)

    // 각 사용자별로 개별 업무 필터링하여 이메일 발송
    const emailService = getEmailService()
    const results = []

    for (const recipient of recipients) {
      try {
        console.log(`${recipient}에게 개별 이메일 발송 중...`)
        
        // 관리자인지 확인
        const isAdmin = recipient === 'bae.jae.kwon@drbworld.com'
        
        // 사용자별 업무 필터링
        let userTodayTasks, userOverdueTasks
        
        if (isAdmin) {
          // 관리자는 모든 업무를 볼 수 있음
          userTodayTasks = todayTasks
          userOverdueTasks = overdueTasks
          console.log(`  관리자 - 모든 업무 (오늘: ${todayTasks.length}, 지연: ${overdueTasks.length})`)
        } else {
          // 일반 사용자는 자신에게 할당된 업무만
          userTodayTasks = todayTasks.filter((task: any) => 
            task.assignee === recipient || task.assignee === 'all'
          )
          userOverdueTasks = overdueTasks.filter((task: any) => 
            task.assignee === recipient || task.assignee === 'all'
          )
          console.log(`  일반사용자 - 개인 업무 (오늘: ${userTodayTasks.length}, 지연: ${userOverdueTasks.length})`)
        }
        
        // 개별 업무가 있거나 관리자인 경우만 이메일 발송
        if (userTodayTasks.length > 0 || userOverdueTasks.length > 0 || isAdmin) {
          const result = await emailService.sendDailyTaskEmail(
            recipient,
            userTodayTasks,
            userOverdueTasks
          )
          results.push(result)
          console.log(`  ✅ ${recipient} 이메일 발송 성공`)
        } else {
          console.log(`  ⏭️ ${recipient} 개인 업무 없음 - 이메일 건너뜀`)
          results.push({
            recipient,
            success: true,
            messageId: 'skipped-no-tasks',
            note: '개인 업무 없음'
          })
        }
        
      } catch (error) {
        console.error(`${recipient}에게 이메일 발송 실패:`, error)
        results.push({
          recipient,
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        })
      }
    }

    const successCount = results.filter(r => r.success).length

    return res.status(200).json(
      createApiResponse(true, {
        summary: {
          total_recipients: recipients.length,
          success_count: successCount,
          fail_count: recipients.length - successCount,
          today_tasks: todayTasks.length,
          overdue_tasks: overdueTasks.length
        },
        results
      })
    )
  } catch (error) {
    console.error('일일 이메일 발송 중 오류:', error)
    return res.status(500).json(
      createApiResponse(false, null, '서버 오류가 발생했습니다.')
    )
  }
}
