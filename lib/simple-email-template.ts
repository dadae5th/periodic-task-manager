import { Task } from '@/types'
import { formatKSTDateWithWeekday, formatKSTDate, formatKSTDateTime } from './kst-utils'

/**
 * 비밀번호 재설정 이메일 템플릿
 */
export function generatePasswordResetEmailTemplate(resetUrl: string, userEmail: string): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>비밀번호 재설정</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 10px; 
            overflow: hidden; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        }
        .header { 
            background: #dc3545; 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
        }
        .content { 
            padding: 30px 20px; 
        }
        .btn { 
            display: inline-block; 
            padding: 15px 30px; 
            background: #dc3545; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold; 
            text-align: center;
            margin: 20px 0;
        }
        .btn:hover { 
            background: #c82333; 
        }
        .warning-box { 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            padding: 20px; 
            border-radius: 5px; 
            margin: 20px 0; 
        }
        .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #666; 
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔑 비밀번호 재설정</h1>
            <p>업무 관리 시스템</p>
        </div>
        
        <div class="content">
            <h2>안녕하세요!</h2>
            <p><strong>${userEmail}</strong> 계정의 비밀번호 재설정을 요청하셨습니다.</p>
            
            <p>아래 버튼을 클릭하여 새로운 비밀번호를 설정하세요:</p>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="btn">비밀번호 재설정하기</a>
            </div>
            
            <div class="warning-box">
                <h3>⚠️ 보안 알림</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>이 링크는 <strong>1시간 동안만</strong> 유효합니다.</li>
                    <li>비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시하세요.</li>
                    <li>링크를 다른 사람과 공유하지 마세요.</li>
                    <li>재설정 후에는 새로운 비밀번호로 로그인하세요.</li>
                </ul>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                버튼이 작동하지 않는다면 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br>
                <span style="word-break: break-all; background: #f8f9fa; padding: 5px; border-radius: 3px; font-family: monospace;">${resetUrl}</span>
            </p>
        </div>
        
        <div class="footer">
            <p>이 이메일은 자동으로 발송되었습니다.</p>
            <p>업무 관리 시스템</p>
            <p style="font-size: 12px; margin-top: 10px;">
                문의사항이 있으시면 시스템 관리자에게 연락하세요.
            </p>
        </div>
    </div>
</body>
</html>
  `
}

/**
 * 비밀번호 재설정 완료 알림 이메일 템플릿
 */
export function generatePasswordResetSuccessEmailTemplate(userEmail: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>비밀번호 재설정 완료</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 10px; 
            overflow: hidden; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        }
        .header { 
            background: #28a745; 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
        }
        .content { 
            padding: 30px 20px; 
        }
        .btn { 
            display: inline-block; 
            padding: 15px 30px; 
            background: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold; 
            text-align: center;
            margin: 20px 0;
        }
        .success-box { 
            background: #d4edda; 
            border: 1px solid #c3e6cb; 
            padding: 20px; 
            border-radius: 5px; 
            margin: 20px 0; 
        }
        .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #666; 
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ 비밀번호 변경 완료</h1>
            <p>업무 관리 시스템</p>
        </div>
        
        <div class="content">
            <h2>비밀번호가 성공적으로 변경되었습니다!</h2>
            
            <div class="success-box">
                <p style="margin: 0;"><strong>${userEmail}</strong> 계정의 비밀번호가 안전하게 변경되었습니다.</p>
            </div>
            
            <p>이제 새로운 비밀번호로 로그인할 수 있습니다:</p>
            
            <div style="text-align: center;">
                <a href="${appUrl}/login" class="btn">로그인하기</a>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">🔒 보안 팁</h3>
                <ul style="margin-bottom: 0; padding-left: 20px;">
                    <li>비밀번호를 다른 사람과 공유하지 마세요</li>
                    <li>정기적으로 비밀번호를 변경하세요</li>
                    <li>의심스러운 활동이 있다면 즉시 시스템 관리자에게 연락하세요</li>
                </ul>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                비밀번호를 변경하지 않으셨다면 즉시 시스템 관리자에게 연락하세요.
            </p>
        </div>
        
        <div class="footer">
            <p>이 이메일은 자동으로 발송되었습니다.</p>
            <p>업무 관리 시스템 | <a href="${appUrl}/dashboard">대시보드 바로가기</a></p>
            <p style="font-size: 12px; margin-top: 10px;">
                ${formatKSTDateTime(new Date())}
            </p>
        </div>
    </div>
</body>
</html>
  `
}

/**
 * 간단한 이메일 템플릿 - 일괄완료 기능 완전 제거
 */
export function generateSimpleEmailTemplate(tasks: Task[], overdueTasks: Task[]): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>오늘의 업무</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 10px; 
            overflow: hidden; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        }
        .header { 
            background: #007bff; 
            color: white; 
            padding: 20px; 
            text-align: center; 
        }
        .content { 
            padding: 20px; 
        }
        .task { 
            background: #f8f9fa; 
            border-left: 4px solid #007bff; 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 0 5px 5px 0; 
        }
        .task.overdue { 
            border-left-color: #dc3545; 
            background: #fff5f5; 
        }
        .task-title { 
            font-weight: bold; 
            margin-bottom: 5px; 
        }
        .task-meta { 
            color: #666; 
            font-size: 14px; 
            margin-bottom: 10px; 
        }
        .btn { 
            display: inline-block; 
            padding: 8px 16px; 
            background: #28a745; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin-top: 10px; 
        }
        .btn-dashboard { 
            background: #007bff; 
            padding: 12px 24px; 
            font-size: 16px; 
        }
        .warning { 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0; 
        }
        .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #666; 
        }
        .section { 
            margin-bottom: 30px; 
        }
        .section h2 { 
            color: #333; 
            border-bottom: 2px solid #e1e1e1; 
            padding-bottom: 10px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 오늘의 업무 알림</h1>
            <p>${formatKSTDateWithWeekday()}</p>
        </div>
        
        <div class="content">
            ${overdueTasks.length > 0 ? `
            <div class="warning">
                <strong>⚠️ 지연된 업무가 ${overdueTasks.length}개 있습니다!</strong>
            </div>
            
            <div class="section">
                <h2>🚨 지연된 업무</h2>
                ${overdueTasks.map(task => `
                <div class="task overdue">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        담당자: ${task.assignee} | 
                        마감일: ${formatKSTDate(task.due_date)} |
                        지연: ${Math.ceil((Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24))}일
                    </div>
                    ${task.description ? `<p style="margin: 5px 0; color: #666;">${task.description}</p>` : ''}
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px;">
                        <p style="margin: 0; color: #666; font-size: 12px;">⚠️ 지연된 업무입니다. 대시보드에서 완료 처리하세요.</p>
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${tasks.length > 0 ? `
            <div class="section">
                <h2>📅 오늘 해야할 일</h2>
                ${tasks.map(task => `
                <div class="task">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        담당자: ${task.assignee} | 
                        마감일: ${formatKSTDate(task.due_date)}
                    </div>
                    ${task.description ? `<p style="margin: 5px 0; color: #666;">${task.description}</p>` : ''}
                    <div style="background: #e3f2fd; padding: 10px; border-radius: 4px; margin-top: 10px;">
                        <p style="margin: 0; color: #1976d2; font-size: 12px;">💡 대시보드에서 완료 처리하세요.</p>
                    </div>
                </div>
                `).join('')}
            </div>
            ` : '<div class="section"><p>오늘 해야할 일이 없습니다! 🎉</p></div>'}
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="${appUrl}/dashboard" class="btn btn-dashboard">📊 대시보드에서 관리하기</a>
            </div>
        </div>
        
        <div class="footer">
            <p>이 이메일은 자동으로 발송되었습니다.</p>
            <p>업무 관리 시스템 | <a href="${appUrl}/dashboard">대시보드 바로가기</a></p>
        </div>
    </div>
</body>
</html>
  `
}
