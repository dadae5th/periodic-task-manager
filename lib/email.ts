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
      const htmlContent = this.generateDailyEmailHTML(tasks, overdueTasks)
      const textContent = this.generateDailyEmailText(tasks, overdueTasks)

      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.user}>`,
        to: recipient,
        subject: `📋 오늘의 업무 알림 - ${new Date().toLocaleDateString('ko-KR')}`,
        html: htmlContent,
        text: textContent,
      }

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
   * 업무 완료 확인 이메일 발송
   */
  async sendTaskCompletionEmail(
    recipient: string,
    task: Task,
    completedBy: string
  ): Promise<EmailResult> {
    try {
      const htmlContent = this.generateCompletionEmailHTML(task, completedBy)
      const textContent = this.generateCompletionEmailText(task, completedBy)

      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.user}>`,
        to: recipient,
        subject: `✅ 업무 완료 알림: ${task.title}`,
        html: htmlContent,
        text: textContent,
      }

      const info = await this.transporter.sendMail(mailOptions)

      return {
        success: true,
        messageId: info.messageId,
        recipient,
      }
    } catch (error) {
      console.error('완료 알림 이메일 발송 실패:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        recipient,
      }
    }
  }

  /**
   * 일일 업무 이메일 HTML 생성
   */
  private generateDailyEmailHTML(tasks: Task[], overdueTasks: Task[]): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>오늘의 업무</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; }
        .task-section { margin-bottom: 30px; }
        .task-section h2 { color: #333; border-bottom: 2px solid #e1e1e1; padding-bottom: 10px; }
        .task { background: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 10px 0; border-radius: 0 5px 5px 0; }
        .task.overdue { border-left-color: #dc3545; background: #fff5f5; }
        .task-title { font-weight: bold; color: #333; margin-bottom: 5px; }
        .task-meta { color: #666; font-size: 14px; margin-bottom: 10px; }
        .task-actions { margin-top: 15px; }
        .btn { display: inline-block; padding: 10px 20px; margin: 5px 10px 5px 0; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .btn-complete { background: #28a745; color: white; }
        .btn-dashboard { background: #007bff; color: white; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 오늘의 업무 알림</h1>
            <p>${new Date().toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}</p>
        </div>
        
        <div class="content">
            ${overdueTasks.length > 0 ? `
            <div class="warning">
                <strong>⚠️ 지연된 업무가 ${overdueTasks.length}개 있습니다!</strong>
            </div>
            
            <div class="task-section">
                <h2>🚨 지연된 업무</h2>
                ${overdueTasks.map(task => `
                <div class="task overdue">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        담당자: ${task.assignee} | 
                        마감일: ${new Date(task.due_date).toLocaleDateString('ko-KR')} |
                        지연: ${Math.ceil((Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24))}일
                    </div>
                    ${task.description ? `<p>${task.description}</p>` : ''}
                    <div class="task-actions">
                        <a href="${appUrl}/api/tasks/${task.id}/complete" class="btn btn-complete">✅ 완료 처리</a>
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${tasks.length > 0 ? `
            <div class="task-section">
                <h2>📅 오늘 해야할 일</h2>
                ${tasks.map(task => `
                <div class="task">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        담당자: ${task.assignee} | 
                        마감일: ${new Date(task.due_date).toLocaleDateString('ko-KR')}
                    </div>
                    ${task.description ? `<p>${task.description}</p>` : ''}
                    <div class="task-actions">
                        <a href="${appUrl}/api/tasks/${task.id}/complete" class="btn btn-complete">✅ 완료 처리</a>
                    </div>
                </div>
                `).join('')}
            </div>
            ` : '<p>오늘 해야할 일이 없습니다! 🎉</p>'}
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="${appUrl}/dashboard" class="btn btn-dashboard">📊 대시보드에서 관리하기</a>
            </div>
        </div>
        
        <div class="footer">
            <p>이 이메일은 자동으로 발송되었습니다.</p>
            <p>업무 관리 시스템 | <a href="${appUrl}">대시보드 바로가기</a></p>
        </div>
    </div>
</body>
</html>
    `
  }

  /**
   * 일일 업무 이메일 텍스트 생성
   */
  private generateDailyEmailText(tasks: Task[], overdueTasks: Task[]): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let content = `
📋 오늘의 업무 알림
${new Date().toLocaleDateString('ko-KR')}

`

    if (overdueTasks.length > 0) {
      content += `
🚨 지연된 업무 (${overdueTasks.length}개):
${overdueTasks.map(task => 
  `- ${task.title} (담당: ${task.assignee}, 마감: ${new Date(task.due_date).toLocaleDateString('ko-KR')})`
).join('\n')}

`
    }

    if (tasks.length > 0) {
      content += `
📅 오늘 해야할 일:
${tasks.map(task => 
  `- ${task.title} (담당: ${task.assignee}, 마감: ${new Date(task.due_date).toLocaleDateString('ko-KR')})`
).join('\n')}

`
    } else {
      content += '오늘 해야할 일이 없습니다! 🎉\n\n'
    }

    content += `
대시보드에서 업무를 관리하세요: ${appUrl}/dashboard

이 이메일은 자동으로 발송되었습니다.
    `

    return content.trim()
  }

  /**
   * 완료 알림 이메일 HTML 생성
   */
  private generateCompletionEmailHTML(task: Task, completedBy: string): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>업무 완료</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .task-info { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ 업무 완료!</h1>
        </div>
        
        <div class="content">
            <div class="task-info">
                <h3>${task.title}</h3>
                <p><strong>담당자:</strong> ${task.assignee}</p>
                <p><strong>완료자:</strong> ${completedBy}</p>
                <p><strong>완료 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
                ${task.description ? `<p><strong>설명:</strong> ${task.description}</p>` : ''}
            </div>
            
            <div style="text-align: center;">
                <a href="${appUrl}/dashboard" class="btn">📊 대시보드에서 확인하기</a>
            </div>
        </div>
        
        <div class="footer">
            <p>업무 관리 시스템 | <a href="${appUrl}">대시보드 바로가기</a></p>
        </div>
    </div>
</body>
</html>
    `
  }

  /**
   * 완료 알림 이메일 텍스트 생성
   */
  private generateCompletionEmailText(task: Task, completedBy: string): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    return `
✅ 업무 완료!

업무: ${task.title}
담당자: ${task.assignee}
완료자: ${completedBy}
완료 시간: ${new Date().toLocaleString('ko-KR')}
${task.description ? `설명: ${task.description}` : ''}

대시보드에서 확인하기: ${appUrl}/dashboard

업무 관리 시스템
    `.trim()
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
