// 테스트용 업무 생성 스크립트
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jrmpfxfaxjzusmqdbfqh.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpybXBmeGZheGp6dXNtcWRiZnFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTA2NzYzOCwiZXhwIjoyMDQ0NjQzNjM4fQ.ZhFMPf0ULWNDsLpjcmSYgvMXpGglIGM6JEjwH4-jt7Y'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestTask() {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('tasks')
    .insert([
      {
        title: '테스트 업무 - 이메일 완료 버튼 확인',
        description: '이메일에서 완료 버튼 클릭 테스트용',
        assignee: 'test@example.com',
        frequency: 'once',
        frequency_details: {},
        due_date: today,
        completed: false
      }
    ])
    .select()

  if (error) {
    console.error('업무 생성 실패:', error)
  } else {
    console.log('테스트 업무 생성 성공:', data)
  }
}

createTestTask()
