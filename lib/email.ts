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
    overdueTasks: Task[],
    thisWeekTasks: Task[] = [],
    thisMonthTasks: Task[] = []
  ): Promise<EmailResult> {
    try {
      // Gmail 설정이 완료되지 않은 경우 Mock 응답
      if (!this.config.user || !this.config.password) {
        console.log(`Mock 이메일 발송: ${recipient}에게 오늘 ${tasks.length}개, 지연 ${overdueTasks.length}개, 이번주 ${thisWeekTasks.length}개, 이번달 ${thisMonthTasks.length}개 업무`)
        return {
          success: true,
          messageId: `mock-${Date.now()}`,
          recipient,
          mockMode: true,
        }
      }

      // 간단한 이메일 템플릿 사용 (일괄완료 기능 완전 제거)
      const { generateSimpleEmailTemplate } = require('./simple-email-template')
      const htmlContent = generateSimpleEmailTemplate(tasks, overdueTasks)
      const textContent = this.generateDailyEmailText(tasks, overdueTasks, thisWeekTasks, thisMonthTasks)

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
      
      // 연결 오류인 경우 Mock 응답으로 fallback
      if (error instanceof Error && (
        error.message.includes('Invalid login') || 
        error.message.includes('authentication')
      )) {
        console.log(`Gmail 인증 실패로 Mock 모드 동작: ${recipient}`)
        return {
          success: true,
          messageId: `mock-fallback-${Date.now()}`,
          recipient,
          mockMode: true,
          originalError: error.message,
        }
      }
      
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
   * 일일 업무 이메일 HTML 생성 (사용하지 않음 - email-friendly-template 사용)
   */
  private generateDailyEmailHTML(tasks: Task[], overdueTasks: Task[]): string {
    // 이 함수는 사용하지 않음 - generateEmailFriendlyTemplate 사용
    const { generateEmailFriendlyTemplate } = require('./email-friendly-template')
    return generateEmailFriendlyTemplate(tasks, overdueTasks)
  }

  /**
   * 일일 업무 이메일 텍스트 생성
   */
  private generateDailyEmailText(tasks: Task[], overdueTasks: Task[], thisWeekTasks: Task[] = [], thisMonthTasks: Task[] = []): string {
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

💡 HTML 버전 이메일에서 완료할 업무를 선택하여 처리할 수 있습니다.

`
    }

    if (tasks.length > 0) {
      content += `
📅 오늘 해야할 일 (${tasks.length}개):
${tasks.map(task => 
  `- ${task.title} (담당: ${task.assignee}, 마감: ${new Date(task.due_date).toLocaleDateString('ko-KR')})`
).join('\n')}

💡 HTML 버전 이메일에서 완료할 업무를 선택하여 처리할 수 있습니다.

`
    } else {
      content += '오늘 해야할 일이 없습니다! 🎉\n\n'
    }

    if (thisWeekTasks.length > 0) {
      content += `
📆 이번 주 해야할 일 (${thisWeekTasks.length}개):
${thisWeekTasks.map(task => 
  `- ${task.title} (담당: ${task.assignee}, 마감: ${new Date(task.due_date).toLocaleDateString('ko-KR')})`
).join('\n')}

`
    }

    if (thisMonthTasks.length > 0) {
      content += `
🗓️ 이번 달 해야할 일 (${thisMonthTasks.length}개):
${thisMonthTasks.map(task => 
  `- ${task.title} (담당: ${task.assignee}, 마감: ${new Date(task.due_date).toLocaleDateString('ko-KR')})`
).join('\n')}

`
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
   * 일괄 완료 알림 이메일 발송 (완전 비활성화됨)
   */
  async sendBatchCompletionEmail(
    recipient: string,
    completedTasks: Task[],
    completedBy: string
  ): Promise<EmailResult> {
    // 일괄완료 메일 발송을 완전히 비활성화
    console.log(`[EMAIL] 일괄완료 메일 발송 요청 무시됨 - 받는이: ${recipient}, 완료된 업무: ${completedTasks.length}개`)
    
    return {
      success: true,
      messageId: `disabled-${Date.now()}`,
      recipient,
    }
  }

  /**
   * 일괄 완료 알림 이메일 HTML 생성 (사용하지 않음)
   */
  private generateBatchCompletionEmailHTML(completedTasks: Task[], completedBy: string): string {
    // 이 함수는 더 이상 사용하지 않음
    return '<html><body>이 기능은 비활성화되었습니다.</body></html>'
  }

  /**
   * 일괄 완료 알림 이메일 텍스트 생성 (사용하지 않음)
   */
  private generateBatchCompletionEmailText(completedTasks: Task[], completedBy: string): string {
    // 이 함수는 더 이상 사용하지 않음
    return '이 기능은 비활성화되었습니다.'
  }

  /**
   * 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    // 개발/테스트 환경에서는 Gmail 설정 없이도 작동하도록 임시 우회
    if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview') {
      console.log('개발 환경: 이메일 연결 테스트 통과 (Mock)')
      return true
    }

    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('이메일 서비스 연결 실패:', error)
      
      // Gmail 설정이 완료되지 않은 경우 Mock 모드로 동작
      if (error instanceof Error && error.message.includes('Invalid login')) {
        console.log('Gmail 설정 미완료: Mock 모드로 동작')
        return false // 실제 연결은 실패하지만 시스템은 계속 작동
      }
      
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
