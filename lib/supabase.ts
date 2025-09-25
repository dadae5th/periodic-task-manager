import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL과 Anon Key가 환경 변수에 설정되어 있지 않습니다.')
}

// 클라이언트 사이드 Supabase 클라이언트
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// 서버 사이드 Supabase 클라이언트 (서비스 역할 키 사용)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
