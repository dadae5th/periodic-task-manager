import nodemailer from 'nodemailer'
import { Task, EmailResult } from '@/types'

interface EmailConfig {
  service: string
  user: string
  password: string
  fromName: string
}

class EmailService {
  private transporter: nodemailer.Transporter
  private config: EmailConfig

  constructor() {
    this.config = {
      service: process.env.EMAIL_SERVICE || 'gmail',
      user: process.env.EMAIL_USER!,
      password: process.env.EMAIL_PASSWORD!,
      fromName: process.env.EMAIL_FROM_NAME || '업무 관리 시스템',
    }

    if (!this.config.user || !this.config.password) {
      throw new Error('이메일 설정이 환경 변수에 없습니다.')
    }

    this.transporter = nodemailer.createTransport({
      service: this.config.service,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
      tls: {
        rejectUnauthorized: false
      }
    })
  }

  /**
   * 일일 업무 이메일 발송
   */
  async sendDailyTaskEmail(
    recipient: string,
    tasks: Task[],
    overdueTasks: Task[]
  ): Promise<EmailResult> {
    try {
      const htmlContent = this.generateSimpleEmailHTML(tasks, overdueTasks, recipient)
      const textContent = this.generateSimpleEmailText(tasks, overdueTasks)

      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.user}>`,
        to: recipient,
        subject: `📋 오늘의 업무 알림 - ${new Date().toLocaleDateString('ko-KR')}`,
        html: htmlContent,
        text: textContent,
      }

      console.log(`[EMAIL] 일일 업무 이메일 발송 - 받는이: ${recipient}`)
      const info = await this.transporter.sendMail(mailOptions)

      return {
        success: true,
        messageId: info.messageId,
        recipient,
      }
    } catch (error) {
      console.error('이메일 발송 실패:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        recipient,
      }
    }
  }

  /**
   * 간단한 이메일 HTML 생성
   */
  private generateSimpleEmailHTML(tasks: Task[], overdueTasks: Task[], recipient: string): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    let tasksList = ''
    
    // 지연된 업무 표시
    if (overdueTasks.length > 0) {
      tasksList += `
        <h3 style="color: #dc3545;">🚨 지연된 업무 (${overdueTasks.length}개)</h3>
        <div style="margin-bottom: 20px;">
      `
      
      overdueTasks.forEach(task => {
        // 단순화된 직접 완료 URL
        const assignee = task.assignee || 'unknown@example.com'
        const completeUrl = `${appUrl}/api/tasks/${task.id}/complete?auto_login=true&completed_by=${encodeURIComponent(assignee)}&source=email_overdue&force_login=true`
        console.log(`🔗 지연업무 완료 URL 생성:`, { 
          taskId: task.id, 
          assignee: assignee, 
          url: completeUrl,
          taskTitle: task.title 
        })
        
        tasksList += `
          <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 5px; padding: 15px; margin: 10px 0;">
            <h4 style="margin: 0 0 10px 0;">${task.title}</h4>
            <p style="color: #666; margin: 5px 0;">담당자: ${assignee}</p>
            <p style="color: #dc3545; margin: 5px 0; font-weight: bold;">마감: ${new Date(task.due_date).toLocaleDateString('ko-KR')}</p>
            <a href="${completeUrl}" 
               style="background: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
              ✅ 완료
            </a>
            <p style="font-size: 10px; color: #999; margin-top: 5px;">Debug: ${task.id} | ${assignee}</p>
          </div>
        `
      })
      
      tasksList += '</div>'
    }
    
    // 오늘 할 일 표시
    if (tasks.length > 0) {
      tasksList += `
        <h3 style="color: #007bff;">📅 오늘 해야할 일 (${tasks.length}개)</h3>
        <div style="margin-bottom: 20px;">
      `
      
      tasks.forEach(task => {
        // 단순화된 직접 완료 URL
        const assignee = task.assignee || 'unknown@example.com'
        const completeUrl = `${appUrl}/api/tasks/${task.id}/complete?auto_login=true&completed_by=${encodeURIComponent(assignee)}&source=email_today&force_login=true`
        console.log(`🔗 오늘업무 완료 URL 생성:`, { 
          taskId: task.id, 
          assignee: assignee, 
          url: completeUrl,
          taskTitle: task.title 
        })
        
        tasksList += `
          <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 15px; margin: 10px 0;">
            <h4 style="margin: 0 0 10px 0;">${task.title}</h4>
            <p style="color: #666; margin: 5px 0;">담당자: ${assignee}</p>
            <p style="color: #666; margin: 5px 0;">마감: ${new Date(task.due_date).toLocaleDateString('ko-KR')}</p>
            <a href="${completeUrl}" 
               style="background: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
              ✅ 완료
            </a>
            <p style="font-size: 10px; color: #999; margin-top: 5px;">Debug: ${task.id} | ${assignee}</p>
          </div>
        `
      })
      
      tasksList += '</div>'
    } else if (overdueTasks.length === 0) {
      tasksList += `
        <div style="text-align: center; padding: 40px; background: #e8f5e8; border-radius: 10px;">
          <h3 style="color: #28a745;">🎉 오늘 할 일이 없습니다!</h3>
          <p style="color: #666;">모든 업무를 완료했거나 예정된 업무가 없습니다.</p>
        </div>
      `
    }

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>오늘의 업무 알림</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 오늘의 업무 알림</h1>
            <p>${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>
        
        <div class="content">
            ${tasksList}
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="${appUrl}/login?redirect=${encodeURIComponent('/dashboard')}&email=${encodeURIComponent(recipient)}" 
                   style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  📊 대시보드 바로가기
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>업무 관리 시스템 자동 알림</p>
        </div>
    </div>
</body>
</html>
    `
  }

  /**
   * 간단한 이메일 텍스트 생성
   */
  private generateSimpleEmailText(tasks: Task[], overdueTasks: Task[]): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let content = `📋 오늘의 업무 알림\n${new Date().toLocaleDateString('ko-KR')}\n\n`

    if (overdueTasks.length > 0) {
      content += `🚨 지연된 업무 (${overdueTasks.length}개):\n`
      overdueTasks.forEach(task => {
        content += `- ${task.title} (담당: ${task.assignee}, 마감: ${new Date(task.due_date).toLocaleDateString('ko-KR')})\n`
      })
      content += '\n'
    }

    if (tasks.length > 0) {
      content += `📅 오늘 해야할 일 (${tasks.length}개):\n`
      tasks.forEach(task => {
        content += `- ${task.title} (담당: ${task.assignee}, 마감: ${new Date(task.due_date).toLocaleDateString('ko-KR')})\n`
      })
    } else if (overdueTasks.length === 0) {
      content += '🎉 오늘 할 일이 없습니다!\n'
    }

    content += `\n대시보드: ${appUrl}/dashboard\n\n자동 발송 이메일입니다.`
    return content
  }

  /**
   * 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('이메일 서비스 연결 실패:', error)
      return false
    }
  }
}

// 싱글톤 인스턴스
let emailService: EmailService | null = null

export const getEmailService = (): EmailService => {
  if (!emailService) {
    emailService = new EmailService()
  }
  return emailService
}

export default EmailService
