import { Task } from '@/types'

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
            
            <div class="section">
                <h2>🚨 지연된 업무</h2>
                ${overdueTasks.map(task => `
                <div class="task overdue">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        담당자: ${task.assignee} | 
                        마감일: ${new Date(task.due_date).toLocaleDateString('ko-KR')} |
                        지연: ${Math.ceil((Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24))}일
                    </div>
                    ${task.description ? `<p style="margin: 5px 0; color: #666;">${task.description}</p>` : ''}
                    <a href="${appUrl}/api/tasks/${task.id}/complete?completed_by=${encodeURIComponent(task.assignee)}" class="btn">
                        ✅ 완료
                    </a>
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
                        마감일: ${new Date(task.due_date).toLocaleDateString('ko-KR')}
                    </div>
                    ${task.description ? `<p style="margin: 5px 0; color: #666;">${task.description}</p>` : ''}
                    <a href="${appUrl}/api/tasks/${task.id}/complete?completed_by=${encodeURIComponent(task.assignee)}" class="btn">
                        ✅ 완료
                    </a>
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
