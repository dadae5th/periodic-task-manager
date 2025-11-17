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
        subject: `📋 [업데이트됨] 오늘의 업무 알림 - ${new Date().toLocaleDateString('ko-KR')}`,
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
        // 더 강력한 assignee 처리
        let assignee = task.assignee || recipient || 'unknown@example.com'
        console.log(`📧 지연업무 담당자 확인:`, { 
          taskId: task.id,
          taskAssignee: task.assignee,
          recipient: recipient,
          finalAssignee: assignee,
          taskTitle: task.title 
        })
        
        tasksList += `
          <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 5px; padding: 15px; margin: 10px 0;">
            <h4 style="margin: 0 0 10px 0; color: #dc3545;">🚨 ${task.title}</h4>
            <p style="color: #666; margin: 5px 0;">담당자: ${assignee}</p>
            <p style="color: #dc3545; margin: 5px 0; font-weight: bold;">마감: ${new Date(task.due_date).toLocaleDateString('ko-KR')} (지연됨)</p>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">${task.description || '설명 없음'}</p>
            <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
              <p style="margin: 0; color: #666; font-size: 12px;">⚠️ 지연된 업무입니다. 대시보드에서 완료 처리하세요.</p>
            </div>
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
        // 더 강력한 assignee 처리
        let assignee = task.assignee || recipient || 'unknown@example.com'
        console.log(`📧 오늘업무 담당자 확인:`, { 
          taskId: task.id,
          taskAssignee: task.assignee,
          recipient: recipient,
          finalAssignee: assignee,
          taskTitle: task.title 
        })
        
        tasksList += `
          <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 15px; margin: 10px 0;">
            <h4 style="margin: 0 0 10px 0; color: #007bff;">📅 ${task.title}</h4>
            <p style="color: #666; margin: 5px 0;">담당자: ${assignee}</p>
            <p style="color: #666; margin: 5px 0;">마감: ${new Date(task.due_date).toLocaleDateString('ko-KR')}</p>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">${task.description || '설명 없음'}</p>
            <div style="margin-top: 10px; padding: 10px; background: #e3f2fd; border-radius: 4px;">
              <p style="margin: 0; color: #1976d2; font-size: 12px;">💡 대시보드에서 완료 처리하세요.</p>
            </div>
          </div>
        `
      })
      
      tasksList += '</div>'
    } else if (overdueTasks.length === 0) {
      // 업무가 전혀 없는 경우 (신규 회원일 가능성)
      tasksList += `
        <div style="text-align: center; padding: 40px; background: #e8f5e8; border-radius: 10px;">
          <h3 style="color: #28a745;">🎉 환영합니다!</h3>
          <p style="color: #666; margin-bottom: 15px;">
            ${recipient}님만의 개인 업무 관리 대시보드가 준비되었습니다.
          </p>
          <p style="color: #888; font-size: 14px;">
            현재 할당된 업무가 없습니다. 관리자가 업무를 할당하거나<br>
            직접 대시보드에서 업무를 생성할 수 있습니다.
          </p>
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
            <p style="background: #ff6b6b; color: white; padding: 10px; border-radius: 5px; font-size: 14px; font-weight: bold;">
              🔥 완료 버튼 제거 완료! - ${new Date().toLocaleString('ko-KR')} 버전
            </p>
        </div>
        
        <div class="content">
            ${tasksList}
            
            <div style="text-align: center; margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
                <h3 style="color: white; margin: 0 0 15px 0;">📋 ${recipient}님의 개인 업무 대시보드</h3>
                <p style="color: #f0f0f0; margin: 0 0 20px 0; font-size: 14px;">
                  귀하만의 개별 업무를 확인하고 완료 처리하세요
                </p>
                <a href="${appUrl}/dashboard?user=${encodeURIComponent(recipient)}&auto_login=true" 
                   style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-size: 16px; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                  🚀 ${recipient.split('@')[0]}님 전용 대시보드
                </a>
                <br><br>
                <p style="color: #f0f0f0; margin: 0; font-size: 12px;">
                  개인 업무만 표시됩니다 | 사용자: ${recipient}<br>
                  <span style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 5px; font-family: monospace;">
                    ${appUrl}/dashboard?user=${recipient}
                  </span>
                </p>
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
