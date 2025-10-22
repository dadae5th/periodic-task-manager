import { Task } from '@/types'

/**
 * 개선된 이메일 템플릿 - 선택적 완료 기능 포함
 */
export function generateEnhancedDailyEmailHTML(tasks: Task[], overdueTasks: Task[]): string {
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
        .task { background: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 10px 0; border-radius: 0 5px 5px 0; transition: background-color 0.2s; }
        .task.overdue { border-left-color: #dc3545; background: #fff5f5; }
        .task-title { font-weight: bold; color: #333; margin-bottom: 5px; }
        .task-meta { color: #666; font-size: 14px; margin-bottom: 10px; }
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
                <h2>🚨 지연된 업무 (완료할 업무를 선택하세요)</h2>
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                    <h3>⚠️ 지연된 업무가 있습니다</h3>
                    <p>대시보드에서 개별적으로 완료 처리하세요.</p>
                    <a href="${appUrl}/dashboard?filter=overdue" 
                       class="btn" 
                       style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        🔥 지연 업무 확인하기
                    </a>
                </div>
                
                ${overdueTasks.map((task, index) => `
                <div class="task overdue" id="overdue-${index}">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <div style="flex: 1;">
                            <div class="task-title">${task.title}</div>
                            <div class="task-meta">
                                담당자: ${task.assignee} | 
                                마감일: ${new Date(task.due_date).toLocaleDateString('ko-KR')} |
                                지연: ${Math.ceil((Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24))}일
                            </div>
                            ${task.description ? `<p style="margin: 5px 0; color: #666;">${task.description}</p>` : ''}
                            <div style="margin-top: 10px;">
                                <a href="${appUrl}/api/tasks/${task.id}/complete?completed_by=${encodeURIComponent(task.assignee)}" 
                                   class="btn btn-complete" 
                                   style="background: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px;">
                                    ✅ 완료
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${tasks.length > 0 ? `
            <div class="task-section">
                <h2>📅 오늘 해야할 일 (완료할 업무를 선택하세요)</h2>
                <div style="background: #e9f7ff; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                    <h3>✅ 오늘의 업무</h3>
                    <p>대시보드에서 개별적으로 완료 처리하세요.</p>
                    <a href="${appUrl}/dashboard?filter=today" 
                       class="btn" 
                       style="background: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        📅 오늘 업무 확인하기
                    </a>
                </div>
                
                ${tasks.map((task, index) => `
                <div class="task" id="today-${index}">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <div style="flex: 1;">
                            <div class="task-title">${task.title}</div>
                            <div class="task-meta">
                                담당자: ${task.assignee} | 
                                마감일: ${new Date(task.due_date).toLocaleDateString('ko-KR')}
                            </div>
                            ${task.description ? `<p style="margin: 5px 0; color: #666;">${task.description}</p>` : ''}
                            <div style="margin-top: 10px;">
                                <a href="${appUrl}/api/tasks/${task.id}/complete?completed_by=${encodeURIComponent(task.assignee)}" 
                                   class="btn btn-complete" 
                                   style="background: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px;">
                                    ✅ 완료
                                </a>
                            </div>
                        </div>
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
