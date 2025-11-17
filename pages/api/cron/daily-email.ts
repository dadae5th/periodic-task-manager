import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse, getToday } from '@/lib/utils'
import { getEmailService } from '@/lib/email'
import { getTodayTasksAndOverdue } from '@/lib/scheduler'
import { Task } from '@/types'
import { getKSTDate, getKSTToday, isOverdueKST, isDueTodayKST } from '@/lib/kst-utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Vercel Cron에서 호출하는 경우를 위한 보안 검증
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json(
      createApiResponse(false, null, '인증되지 않은 요청입니다.')
    )
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
  }

  return handleDailyCron(req, res)
}

/**
 * 일일 자동 이메일 발송 Cron Job
 */
async function handleDailyCron(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now()

  try {
    console.log(`[CRON] 일일 이메일 발송 시작: ${new Date().toLocaleString('ko-KR')}`)

    // 1. 현재 시간 확인 (한국 시간 기준)
    const now = getKSTDate() // 한국 시간 사용
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`

    // 2. 주말 체크 - 토요일(6), 일요일(0)에는 발송하지 않음 (한국 시간 기준)
    const dayOfWeek = now.getDay() // 0: 일요일, 6: 토요일
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    console.log(`[CRON] 이메일 발송 시작 - 시간: ${currentTime}, 요일: ${['일', '월', '화', '수', '목', '금', '토'][dayOfWeek]}, 주말: ${isWeekend ? 'Yes' : 'No'}`)

    // 3. 주말인 경우 발송하지 않음
    if (isWeekend) {
      console.log('[CRON] 주말이므로 이메일 발송을 생략합니다.')
      return res.status(200).json(
        createApiResponse(true, { 
          message: '주말이므로 이메일 발송을 생략했습니다.',
          current_time: currentTime,
          day_of_week: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][dayOfWeek],
          is_weekend: true,
          skipped: true
        })
      )
    }

    // 4. 모든 업무 조회
    const { data: allTasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true })

    if (tasksError) {
      console.error('업무 조회 실패:', tasksError)
      return res.status(500).json(
        createApiResponse(false, null, '업무 조회에 실패했습니다.', tasksError.message)
      )
    }

    const tasks = allTasks || []
    const { todayTasks, overdueTasks } = getTodayTasksAndOverdue(tasks)

    // 3. 발송할 업무가 없는 경우 조기 종료
    if (todayTasks.length === 0 && overdueTasks.length === 0) {
      console.log('[CRON] 발송할 업무가 없습니다.')
      return res.status(200).json(
        createApiResponse(true, { 
          message: '오늘 해야할 일과 지연된 업무가 없습니다.',
          current_time: currentTime,
          today_tasks: 0,
          overdue_tasks: 0
        })
      )
    }

    // 4. 담당자별로 업무 그룹핑
    const tasksByAssignee = new Map<string, { todayTasks: Task[], overdueTasks: Task[] }>()
    
    // 오늘 해야할 일을 담당자별로 분류
    todayTasks.forEach(task => {
      const assignee = task.assignee
      if (!tasksByAssignee.has(assignee)) {
        tasksByAssignee.set(assignee, { todayTasks: [], overdueTasks: [] })
      }
      tasksByAssignee.get(assignee)!.todayTasks.push(task)
    })
    
    // 지연된 업무를 담당자별로 분류
    overdueTasks.forEach(task => {
      const assignee = task.assignee
      if (!tasksByAssignee.has(assignee)) {
        tasksByAssignee.set(assignee, { todayTasks: [], overdueTasks: [] })
      }
      tasksByAssignee.get(assignee)!.overdueTasks.push(task)
    })

    // 6. 이메일 서비스 초기화 및 연결 테스트
    const emailService = getEmailService()
    const isConnected = await emailService.testConnection()
    
    if (!isConnected) {
      console.error('[CRON] 이메일 서비스 연결 실패')
      return res.status(500).json(
        createApiResponse(false, null, '이메일 서비스에 연결할 수 없습니다.')
      )
    }

    // 7. 담당자별로 이메일 발송 (직접 발송 방식)
    const results = []
    const assigneeEmails = Array.from(tasksByAssignee.keys())
    
    for (const assigneeEmail of assigneeEmails) {
      const assigneeTasks = tasksByAssignee.get(assigneeEmail)!
      
      // 이메일 주소가 유효한지 확인
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(assigneeEmail)) {
        console.log(`[CRON] 유효하지 않은 이메일 주소: ${assigneeEmail} - 건너뜀`)
        results.push({
          user: assigneeEmail,
          email: assigneeEmail,
          success: false,
          error: '유효하지 않은 이메일 주소'
        })
        continue
      }

      try {
        // 업무가 있는 경우에만 이메일 발송
        if (assigneeTasks.todayTasks.length > 0 || assigneeTasks.overdueTasks.length > 0) {
          const result = await emailService.sendDailyTaskEmail(
            assigneeEmail,
            assigneeTasks.todayTasks,
            assigneeTasks.overdueTasks
          )

          results.push({
            user: assigneeEmail,
            email: assigneeEmail,
            ...result,
            today_tasks: assigneeTasks.todayTasks.length,
            overdue_tasks: assigneeTasks.overdueTasks.length
          })

          console.log(`[CRON] 담당자 이메일 발송: ${assigneeEmail} - ${result.success ? '성공' : '실패'} (오늘: ${assigneeTasks.todayTasks.length}, 지연: ${assigneeTasks.overdueTasks.length})`)
        } else {
          console.log(`[CRON] 업무 없음: ${assigneeEmail} - 이메일 발송 생략`)
          results.push({
            user: assigneeEmail,
            email: assigneeEmail,
            success: true,
            skipped: true,
            reason: '발송할 업무 없음'
          })
        }

        // API 제한 방지를 위한 딜레이
        if (results.length < tasksByAssignee.size) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2초 딜레이
        }
      } catch (error) {
        console.error(`[CRON] ${assigneeEmail} 이메일 발송 실패:`, error)
        results.push({
          user: assigneeEmail,
          email: assigneeEmail,
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        })
      }
    }

    // 8. 결과 집계
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    const skippedCount = results.filter(r => r.skipped).length
    const totalAssignees = assigneeEmails.length

    // 9. 로그 저장
    try {
      await (supabaseAdmin as any)
        .from('cron_logs')
        .insert([{
          type: 'daily_email',
          executed_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          success: true,
          total_users: totalAssignees,
          success_count: successCount,
          fail_count: failCount,
          skipped_count: skippedCount,
          today_tasks_count: todayTasks.length,
          overdue_tasks_count: overdueTasks.length,
          results: results
        }])
    } catch (logError) {
      console.error('[CRON] 로그 저장 실패:', logError)
    }

    const executionTime = Date.now() - startTime
    console.log(`[CRON] 담당자별 이메일 발송 완료: ${executionTime}ms, 담당자: ${totalAssignees}명, 성공: ${successCount}, 실패: ${failCount}, 생략: ${skippedCount}`)

    return res.status(200).json(
      createApiResponse(true, {
        execution_time_ms: executionTime,
        current_time: currentTime,
        summary: {
          total_assignees: totalAssignees,
          success_count: successCount,
          fail_count: failCount,
          skipped_count: skippedCount,
          today_tasks: todayTasks.length,
          overdue_tasks: overdueTasks.length
        },
        results: results
      }, `Cron 작업 완료: ${successCount}/${totalAssignees} 담당자에게 발송 성공`)
    )
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[CRON] 일일 이메일 발송 중 오류:', error)
    
    // 오류 로그 저장
    try {
      await (supabaseAdmin as any)
        .from('cron_logs')
        .insert([{
          type: 'daily_email',
          executed_at: new Date().toISOString(),
          execution_time_ms: executionTime,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
          success: false
        }])
    } catch (logError) {
      console.error('[CRON] 오류 로그 저장 실패:', logError)
    }

    return res.status(500).json(
      createApiResponse(false, null, 'Cron 작업 중 서버 오류가 발생했습니다.')
    )
  }
}
