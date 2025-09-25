import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { createApiResponse, getToday } from '@/lib/utils'
import { getEmailService } from '@/lib/email'
import { getTodayTasksAndOverdue } from '@/lib/scheduler'

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

    // 1. 알림 설정이 활성화된 사용자들 조회
    const { data: notificationSettings, error: settingsError } = await supabaseAdmin
      .from('notification_settings')
      .select(`
        *,
        users (email, name)
      `)
      .eq('email_enabled', true)

    if (settingsError) {
      console.error('알림 설정 조회 실패:', settingsError)
      return res.status(500).json(
        createApiResponse(false, null, '알림 설정 조회에 실패했습니다.', settingsError.message)
      )
    }

    if (!notificationSettings || notificationSettings.length === 0) {
      console.log('[CRON] 이메일 알림이 활성화된 사용자가 없습니다.')
      return res.status(200).json(
        createApiResponse(true, { message: '발송할 사용자가 없습니다.' })
      )
    }

    // 2. 현재 시간 확인 (한국 시간 기준)
    const now = getToday()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`

    // 3. 현재 시간에 이메일을 받을 사용자 필터링
    const usersToNotify = notificationSettings.filter(setting => {
      // 주말 알림 설정 확인
      const dayOfWeek = now.getDay() // 0: 일요일, 6: 토요일
      if ((dayOfWeek === 0 || dayOfWeek === 6) && !setting.weekend_notifications) {
        return false
      }

      // 시간 확인 (정확한 시간 매칭 또는 근사치)
      const [settingHour, settingMinute] = setting.email_time.split(':').map(Number)
      return settingHour === currentHour && Math.abs(settingMinute - currentMinute) <= 5
    })

    if (usersToNotify.length === 0) {
      console.log(`[CRON] ${currentTime}에 이메일을 받을 사용자가 없습니다.`)
      return res.status(200).json(
        createApiResponse(true, { 
          message: `${currentTime}에 발송할 사용자가 없습니다.`,
          current_time: currentTime,
          total_users: notificationSettings.length
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

    // 5. 이메일 서비스 초기화 및 연결 테스트
    const emailService = getEmailService()
    const isConnected = await emailService.testConnection()
    
    if (!isConnected) {
      console.error('[CRON] 이메일 서비스 연결 실패')
      return res.status(500).json(
        createApiResponse(false, null, '이메일 서비스에 연결할 수 없습니다.')
      )
    }

    // 6. 각 사용자에게 이메일 발송
    const results = []
    
    for (const userSetting of usersToNotify) {
      const user = userSetting.users
      if (!user || !user.email) {
        console.error('사용자 정보가 없습니다:', userSetting.user_id)
        continue
      }

      try {
        // 사용자별 업무 필터링
        const userTodayTasks = todayTasks.filter(task => 
          task.assignee === user.email || 
          task.assignee === user.name || 
          task.assignee === 'all'
        )
        
        const userOverdueTasks = overdueTasks.filter(task => 
          task.assignee === user.email || 
          task.assignee === user.name || 
          task.assignee === 'all'
        )

        // 업무가 있는 경우에만 이메일 발송 (또는 지연된 업무가 있는 경우)
        if (userTodayTasks.length > 0 || userOverdueTasks.length > 0) {
          const result = await emailService.sendDailyTaskEmail(
            user.email,
            userTodayTasks,
            userOverdueTasks
          )

          results.push({
            user: user.name || user.email,
            email: user.email,
            ...result,
            today_tasks: userTodayTasks.length,
            overdue_tasks: userOverdueTasks.length
          })

          console.log(`[CRON] 이메일 발송: ${user.email} - ${result.success ? '성공' : '실패'}`)
        } else {
          console.log(`[CRON] 업무 없음: ${user.email} - 이메일 발송 생략`)
          results.push({
            user: user.name || user.email,
            email: user.email,
            success: true,
            skipped: true,
            reason: '발송할 업무 없음'
          })
        }

        // API 제한 방지를 위한 딜레이
        if (results.length < usersToNotify.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2초 딜레이
        }
      } catch (error) {
        console.error(`[CRON] ${user.email} 이메일 발송 실패:`, error)
        results.push({
          user: user.name || user.email,
          email: user.email,
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        })
      }
    }

    // 7. 결과 집계
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    const skippedCount = results.filter(r => r.skipped).length

    // 8. 로그 저장
    try {
      await supabaseAdmin
        .from('cron_logs')
        .insert([{
          type: 'daily_email',
          executed_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          total_users: usersToNotify.length,
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
    console.log(`[CRON] 일일 이메일 발송 완료: ${executionTime}ms, 성공: ${successCount}, 실패: ${failCount}, 생략: ${skippedCount}`)

    return res.status(200).json(
      createApiResponse(true, {
        execution_time_ms: executionTime,
        current_time: currentTime,
        summary: {
          total_users: usersToNotify.length,
          success_count: successCount,
          fail_count: failCount,
          skipped_count: skippedCount,
          today_tasks: todayTasks.length,
          overdue_tasks: overdueTasks.length
        },
        results: results
      }, `Cron 작업 완료: ${successCount}/${usersToNotify.length} 성공`)
    )
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[CRON] 일일 이메일 발송 중 오류:', error)
    
    // 오류 로그 저장
    try {
      await supabaseAdmin
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
