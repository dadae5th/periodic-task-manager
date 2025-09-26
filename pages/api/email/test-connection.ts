import type { NextApiRequest, NextApiResponse } from 'next'
import nodemailer from 'nodemailer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Email connection test API called:', new Date().toISOString())
  
  try {
    // 환경변수 확인
    const emailService = process.env.EMAIL_SERVICE || 'gmail'
    const emailUser = process.env.EMAIL_USER
    const emailPassword = process.env.EMAIL_PASSWORD
    const emailFromName = process.env.EMAIL_FROM_NAME || '업무 관리 시스템'
    
    console.log('Email configuration check:', {
      service: emailService,
      user: emailUser ? `${emailUser.substring(0, 5)}...` : 'Missing',
      password: emailPassword ? `${emailPassword.substring(0, 5)}...` : 'Missing',
      fromName: emailFromName
    })

    if (!emailUser || !emailPassword) {
      return res.status(500).json({
        success: false,
        error: '이메일 환경변수가 설정되지 않았습니다.',
        missing: {
          EMAIL_USER: !emailUser,
          EMAIL_PASSWORD: !emailPassword
        }
      })
    }

    // Gmail SMTP 설정
    console.log('Creating Gmail SMTP transporter...')
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
      // Gmail 특화 설정
      secure: true,
      port: 465,
    })

    console.log('Testing connection...')
    const connectionTest = await transporter.verify()
    
    if (connectionTest) {
      console.log('Connection test successful')
      
      // 실제 테스트 이메일 발송 (선택사항)
      if (req.method === 'POST' && req.body.send_test_email) {
        const testRecipient = req.body.test_recipient || emailUser
        
        console.log(`Sending test email to: ${testRecipient}`)
        
        const testMailOptions = {
          from: `"${emailFromName}" <${emailUser}>`,
          to: testRecipient,
          subject: '📧 이메일 연결 테스트 - 업무 관리 시스템',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4a90e2;">🎉 이메일 연결 성공!</h2>
              <p>안녕하세요! 업무 관리 시스템의 이메일 기능이 정상적으로 작동하고 있습니다.</p>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>테스트 정보:</h3>
                <ul>
                  <li><strong>발송 시간:</strong> ${new Date().toLocaleString('ko-KR')}</li>
                  <li><strong>발송자:</strong> ${emailFromName}</li>
                  <li><strong>수신자:</strong> ${testRecipient}</li>
                  <li><strong>서비스:</strong> Gmail SMTP</li>
                </ul>
              </div>
              
              <p>이제 일일 업무 알림 이메일을 정상적으로 받을 수 있습니다!</p>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://periodic-task-manager.vercel.app/test" 
                   style="background: #4a90e2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                  테스트 페이지로 이동
                </a>
              </div>
            </div>
          `,
          text: `
🎉 이메일 연결 성공!

안녕하세요! 업무 관리 시스템의 이메일 기능이 정상적으로 작동하고 있습니다.

테스트 정보:
- 발송 시간: ${new Date().toLocaleString('ko-KR')}
- 발송자: ${emailFromName}
- 수신자: ${testRecipient}
- 서비스: Gmail SMTP

이제 일일 업무 알림 이메일을 정상적으로 받을 수 있습니다!

테스트 페이지: https://periodic-task-manager.vercel.app/test
          `
        }

        const info = await transporter.sendMail(testMailOptions)
        
        return res.status(200).json({
          success: true,
          connection_test: true,
          test_email_sent: true,
          message: '이메일 연결 테스트 및 테스트 이메일 발송 성공',
          details: {
            messageId: info.messageId,
            recipient: testRecipient,
            response: info.response
          }
        })
      }
      
      return res.status(200).json({
        success: true,
        connection_test: true,
        message: '이메일 서비스 연결 성공',
        config: {
          service: emailService,
          user: emailUser,
          fromName: emailFromName
        }
      })
    } else {
      return res.status(500).json({
        success: false,
        connection_test: false,
        error: '이메일 서비스 연결 실패'
      })
    }

  } catch (error) {
    console.error('Email connection test error:', error)
    
    // Gmail 특화 오류 처리
    let errorMessage = '이메일 연결 테스트 실패'
    let suggestions: string[] = []
    
    if (error instanceof Error) {
      const errorStr = error.message.toLowerCase()
      
      if (errorStr.includes('invalid login')) {
        errorMessage = 'Gmail 로그인 실패'
        suggestions = [
          '1. Gmail 계정에서 2단계 인증이 활성화되어 있는지 확인',
          '2. 앱 비밀번호를 사용하고 있는지 확인 (일반 비밀번호 사용 불가)',
          '3. Gmail 보안 설정에서 "보안 수준이 낮은 앱의 액세스" 허용'
        ]
      } else if (errorStr.includes('authentication')) {
        errorMessage = 'Gmail 인증 실패'
        suggestions = [
          '1. EMAIL_USER와 EMAIL_PASSWORD 환경변수 확인',
          '2. Gmail 앱 비밀번호 재생성',
          '3. 환경변수 올바른 설정 확인'
        ]
      }
    }
    
    return res.status(500).json({
      success: false,
      connection_test: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      suggestions: suggestions
    })
  }
}
