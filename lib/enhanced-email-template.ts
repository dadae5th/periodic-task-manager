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
        .task.selected { background-color: #d1ecf1; border-left-color: #17a2b8; }
        .task:hover { background-color: #e9ecef; }
        .task-title { font-weight: bold; color: #333; margin-bottom: 5px; }
        .task-meta { color: #666; font-size: 14px; margin-bottom: 10px; }
        .btn { display: inline-block; padding: 10px 20px; margin: 5px 10px 5px 0; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .btn-complete { background: #28a745; color: white; }
        .btn-batch-complete { background: #17a2b8; color: white; font-size: 16px; padding: 15px 30px; }
        .btn-dashboard { background: #007bff; color: white; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
        .task-checkbox { margin-right: 10px; transform: scale(1.2); }
        .selection-controls { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; text-align: center; border: 1px solid #dee2e6; }
        .selection-controls button { margin: 0 5px; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
        .btn-select-all { background: #28a745; color: white; }
        .btn-select-none { background: #6c757d; color: white; }
        .selection-count { font-weight: bold; color: #495057; margin: 10px 0; }
        .submit-section { background: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #ffeaa7; text-align: center; }
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
                <form method="post" action="${appUrl}/api/tasks/batch-complete" style="margin: 20px 0;" id="overdueForm" onsubmit="return confirmSubmission('overdue')">
                    <input type="hidden" name="completed_by" value="${overdueTasks[0]?.assignee || ''}" />
                    
                    <div class="selection-controls">
                        <button type="button" class="btn-select-all" onclick="selectAllOverdue(true)">📋 모두 선택</button>
                        <button type="button" class="btn-select-none" onclick="selectAllOverdue(false)">🚫 모두 해제</button>
                        <div class="selection-count" id="overdueCount">선택된 업무: 0개 / ${overdueTasks.length}개</div>
                    </div>
                    
                    ${overdueTasks.map((task, index) => `
                    <div class="task overdue" id="overdue-${index}">
                        <div style="display: flex; align-items: flex-start; gap: 10px;">
                            <input type="checkbox" 
                                   name="task_ids" 
                                   value="${task.id}" 
                                   class="task-checkbox overdue-checkbox" 
                                   style="margin-top: 5px;" 
                                   onchange="updateOverdueCount(); toggleTaskHighlight('overdue-${index}', this.checked)" />
                            <div style="flex: 1;">
                                <div class="task-title">${task.title}</div>
                                <div class="task-meta">
                                    담당자: ${task.assignee} | 
                                    마감일: ${new Date(task.due_date).toLocaleDateString('ko-KR')} |
                                    지연: ${Math.ceil((Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24))}일
                                </div>
                                ${task.description ? `<p style="margin: 5px 0; color: #666;">${task.description}</p>` : ''}
                            </div>
                        </div>
                    </div>
                    `).join('')}
                    
                    <div class="submit-section">
                        <div style="margin-bottom: 10px; font-size: 14px; color: #856404;">
                            ⚠️ 선택한 업무만 완료 처리됩니다. 완료하지 않은 업무는 계속 지연됩니다.
                        </div>
                        <button type="submit" 
                                class="btn btn-batch-complete" 
                                style="border: none; cursor: pointer;" 
                                id="overdueSubmitBtn"
                                disabled>
                            🔥 선택한 지연 업무 완료 (<span id="overdueSubmitCount">0</span>개)
                        </button>
                    </div>
                </form>
            </div>
            ` : ''}
            
            ${tasks.length > 0 ? `
            <div class="task-section">
                <h2>📅 오늘 해야할 일 (완료할 업무를 선택하세요)</h2>
                <form method="post" action="${appUrl}/api/tasks/batch-complete" style="margin: 20px 0;" id="todayForm" onsubmit="return confirmSubmission('today')">
                    <input type="hidden" name="completed_by" value="${tasks[0]?.assignee || ''}" />
                    
                    <div class="selection-controls">
                        <button type="button" class="btn-select-all" onclick="selectAllToday(true)">📋 모두 선택</button>
                        <button type="button" class="btn-select-none" onclick="selectAllToday(false)">🚫 모두 해제</button>
                        <div class="selection-count" id="todayCount">선택된 업무: 0개 / ${tasks.length}개</div>
                    </div>
                    
                    ${tasks.map((task, index) => `
                    <div class="task" id="today-${index}">
                        <div style="display: flex; align-items: flex-start; gap: 10px;">
                            <input type="checkbox" 
                                   name="task_ids" 
                                   value="${task.id}" 
                                   class="task-checkbox today-checkbox" 
                                   style="margin-top: 5px;" 
                                   onchange="updateTodayCount(); toggleTaskHighlight('today-${index}', this.checked)" />
                            <div style="flex: 1;">
                                <div class="task-title">${task.title}</div>
                                <div class="task-meta">
                                    담당자: ${task.assignee} | 
                                    마감일: ${new Date(task.due_date).toLocaleDateString('ko-KR')}
                                </div>
                                ${task.description ? `<p style="margin: 5px 0; color: #666;">${task.description}</p>` : ''}
                            </div>
                        </div>
                    </div>
                    `).join('')}
                    
                    <div class="submit-section">
                        <div style="margin-bottom: 10px; font-size: 14px; color: #856404;">
                            ✅ 선택한 업무들이 완료 처리되고 다음 업무가 자동으로 생성됩니다.
                        </div>
                        <button type="submit" 
                                class="btn btn-batch-complete" 
                                style="border: none; cursor: pointer;" 
                                id="todaySubmitBtn"
                                disabled>
                            ✅ 선택한 업무 완료 (<span id="todaySubmitCount">0</span>개)
                        </button>
                    </div>
                </form>
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

    <script>
        // 지연된 업무 선택/해제 기능
        function selectAllOverdue(selectAll) {
            const checkboxes = document.querySelectorAll('.overdue-checkbox');
            checkboxes.forEach((checkbox, index) => {
                checkbox.checked = selectAll;
                toggleTaskHighlight('overdue-' + index, selectAll);
            });
            updateOverdueCount();
        }

        // 오늘 업무 선택/해제 기능
        function selectAllToday(selectAll) {
            const checkboxes = document.querySelectorAll('.today-checkbox');
            checkboxes.forEach((checkbox, index) => {
                checkbox.checked = selectAll;
                toggleTaskHighlight('today-' + index, selectAll);
            });
            updateTodayCount();
        }

        // 업무 하이라이트 토글
        function toggleTaskHighlight(taskId, isSelected) {
            const taskElement = document.getElementById(taskId);
            if (taskElement) {
                if (isSelected) {
                    taskElement.classList.add('selected');
                } else {
                    taskElement.classList.remove('selected');
                }
            }
        }

        // 지연된 업무 선택 개수 업데이트
        function updateOverdueCount() {
            const checkboxes = document.querySelectorAll('.overdue-checkbox');
            const checkedCount = document.querySelectorAll('.overdue-checkbox:checked').length;
            const totalCount = checkboxes.length;
            
            const countElement = document.getElementById('overdueCount');
            const submitCountElement = document.getElementById('overdueSubmitCount');
            const submitBtn = document.getElementById('overdueSubmitBtn');
            
            if (countElement) countElement.textContent = '선택된 업무: ' + checkedCount + '개 / ' + totalCount + '개';
            if (submitCountElement) submitCountElement.textContent = checkedCount;
            
            if (submitBtn) {
                submitBtn.disabled = checkedCount === 0;
                submitBtn.style.opacity = checkedCount === 0 ? '0.5' : '1';
            }
        }

        // 오늘 업무 선택 개수 업데이트
        function updateTodayCount() {
            const checkboxes = document.querySelectorAll('.today-checkbox');
            const checkedCount = document.querySelectorAll('.today-checkbox:checked').length;
            const totalCount = checkboxes.length;
            
            const countElement = document.getElementById('todayCount');
            const submitCountElement = document.getElementById('todaySubmitCount');
            const submitBtn = document.getElementById('todaySubmitBtn');
            
            if (countElement) countElement.textContent = '선택된 업무: ' + checkedCount + '개 / ' + totalCount + '개';
            if (submitCountElement) submitCountElement.textContent = checkedCount;
            
            if (submitBtn) {
                submitBtn.disabled = checkedCount === 0;
                submitBtn.style.opacity = checkedCount === 0 ? '0.5' : '1';
            }
        }

        // 폼 제출 전 확인
        function confirmSubmission(formType) {
            const checkboxes = document.querySelectorAll(formType === 'overdue' ? '.overdue-checkbox:checked' : '.today-checkbox:checked');
            if (checkboxes.length === 0) {
                alert('완료할 업무를 하나 이상 선택해주세요.');
                return false;
            }
            
            const taskTitles = [];
            checkboxes.forEach(function(cb) {
                const taskElement = cb.closest('.task');
                const titleElement = taskElement.querySelector('.task-title');
                if (titleElement) {
                    taskTitles.push(titleElement.textContent);
                }
            });
            
            const message = '다음 ' + checkboxes.length + '개 업무를 완료 처리하시겠습니까?\\n\\n' + taskTitles.join('\\n');
            return confirm(message);
        }

        // 페이지 로드 시 초기화
        document.addEventListener('DOMContentLoaded', function() {
            updateOverdueCount();
            updateTodayCount();
        });
    </script>
</body>
</html>
  `
}
