import { Task } from '@/types'

/**
 * 이메일 친화적인 템플릿 - JavaScript 없이 작동
 */
export function generateEmailFriendlyTemplate(tasks: Task[], overdueTasks: Task[], thisWeekTasks: Task[] = [], thisMonthTasks: Task[] = []): string {
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
        .btn { display: inline-block; padding: 8px 16px; margin: 3px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; }
        .btn-complete { background: #28a745; color: white; }
        .btn-batch { background: #17a2b8; color: white; }
        .btn-dashboard { background: #007bff; color: white; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
        .batch-section { background: #e9f7ff; border: 2px solid #17a2b8; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }
        .batch-section h3 { margin-top: 0; color: #0c5460; }
        .individual-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .individual-section h4 { margin-top: 0; color: #495057; }
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
                
                <!-- 대시보드 링크 섹션 -->
                <div class="batch-section">
                    <h3>⚡ 지연 업무 처리</h3>
                    <p>지연된 업무들을 처리하려면 대시보드에서 확인하고 완료하세요.</p>
                    <a href="${appUrl}/dashboard?filter=overdue" 
                       class="btn btn-batch">🔥 지연 업무 확인하기</a>
                </div>
                
                <!-- 개별 완료 섹션 -->
                <div class="individual-section">
                    <h4>📝 개별 업무 처리</h4>
                    ${overdueTasks.map(task => `
                    <div class="task overdue">
                        <div class="task-title">${task.title}</div>
                        <div class="task-meta">
                            담당자: ${task.assignee} | 
                            마감일: ${new Date(task.due_date).toLocaleDateString('ko-KR')} |
                            지연: ${Math.ceil((Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24))}일
                        </div>
                        ${task.description ? `<p style="margin: 5px 0; color: #666;">${task.description}</p>` : ''}
                        <div style="margin-top: 10px; background: #f8f9fa; padding: 10px; border-radius: 4px;">
                            <p style="margin: 0; color: #666; font-size: 12px;">⚠️ 지연된 업무입니다. 대시보드에서 완료 처리하세요.</p>
                        </div>
                    </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            ${tasks.length > 0 ? `
            <div class="task-section">
                <h2>📅 오늘 해야할 일</h2>
                
                <!-- 대시보드 링크 섹션 -->
                <div class="batch-section">
                    <h3>⚡ 오늘 업무 처리</h3>
                    <p>오늘 해야할 업무들을 처리하려면 대시보드에서 확인하고 완료하세요.</p>
                    <a href="${appUrl}/dashboard?filter=today" 
                       class="btn btn-batch">✅ 오늘 업무 확인하기</a>
                </div>
                
                <!-- 개별 완료 섹션 -->
                <div class="individual-section">
                    <h4>📝 개별 업무 처리</h4>
                    ${tasks.map(task => `
                    <div class="task">
                        <div class="task-title">${task.title}</div>
                        <div class="task-meta">
                            담당자: ${task.assignee} | 
                            마감일: ${new Date(task.due_date).toLocaleDateString('ko-KR')}
                        </div>
                        ${task.description ? `<p style="margin: 5px 0; color: #666;">${task.description}</p>` : ''}
                        <div style="margin-top: 10px; background: #e3f2fd; padding: 10px; border-radius: 4px;">
                            <p style="margin: 0; color: #1976d2; font-size: 12px;">💡 대시보드에서 완료 처리하세요.</p>
                        </div>
                    </div>
                    `).join('')}
                </div>
            </div>
            ` : '<p>오늘 해야할 일이 없습니다! 🎉</p>'}
            
            ${thisWeekTasks.length > 0 ? `
            <div class="task-section">
                <h2>📆 이번 주 해야할 일</h2>
                <div class="individual-section">
                    ${thisWeekTasks.map(task => `
                    <div class="task">
                        <div class="task-title">${task.title}</div>
                        <div class="task-meta">
                            담당자: ${task.assignee} | 
                            마감일: ${new Date(task.due_date).toLocaleDateString('ko-KR')} |
                            주기: ${task.frequency === 'daily' ? '매일' : task.frequency === 'weekly' ? '매주' : '매월'}
                        </div>
                        ${task.description ? `<p style="margin: 5px 0; color: #666;">${task.description}</p>` : ''}
                    </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            ${thisMonthTasks.length > 0 ? `
            <div class="task-section">
                <h2>🗓️ 이번 달 해야할 일</h2>
                <div class="individual-section">
                    ${thisMonthTasks.map(task => `
                    <div class="task">
                        <div class="task-title">${task.title}</div>
                        <div class="task-meta">
                            담당자: ${task.assignee} | 
                            마감일: ${new Date(task.due_date).toLocaleDateString('ko-KR')} |
                            주기: ${task.frequency === 'daily' ? '매일' : task.frequency === 'weekly' ? '매주' : '매월'}
                        </div>
                        ${task.description ? `<p style="margin: 5px 0; color: #666;">${task.description}</p>` : ''}
                    </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <!-- 선택적 완료 옵션 -->
            <div class="batch-section">
                <h3>🎯 선택적 완료 (웹에서)</h3>
                <p>더 세밀한 선택을 원하시면 대시보드에서 개별적으로 처리하세요.</p>
                <div style="text-align: center; margin: 15px 0;">
                    <a href="${appUrl}/dashboard" class="btn btn-dashboard">📊 진행 중 업무 보기</a>
                    <a href="${appUrl}/dashboard?tab=all" class="btn btn-dashboard" style="margin-left: 10px;">📋 전체 업무 보기</a>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>이 이메일은 자동으로 발송되었습니다.</p>
            <p>업무 관리 시스템 | <a href="${appUrl}/dashboard?tab=all">전체 업무 보기</a></p>
        </div>
    </div>
</body>
</html>
  `
}
