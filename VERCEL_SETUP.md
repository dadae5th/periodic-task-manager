# Vercel 프로덕션 환경 변수 설정 가이드

## 🚀 Vercel 대시보드에서 환경 변수 설정

Vercel 대시보드 (https://vercel.com/dashboard)에 접속하여 다음 환경 변수들을 설정하세요:

### 1. 프로젝트 설정 접속
- Vercel 대시보드에서 `periodic-task-manager` 프로젝트 선택
- Settings 탭 → Environment Variables 메뉴 선택

### 2. 필수 환경 변수 추가

#### Supabase 설정
```
NEXT_PUBLIC_SUPABASE_URL=https://jrmpfxfaxjzusmqdbfqh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpybXBmeGZheGp6dXNtcWRiZnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjkwNjc2MzgsImV4cCI6MjA0NDY0MzYzOH0.1TGrp-I6HGwQ-HrsX-3oZ4OQO1iJNp_GJhTpLQNc7e4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpybXBmeGZheGp6dXNtcWRiZnFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTA2NzYzOCwiZXhwIjoyMDQ0NjQzNjM4fQ.ZhFMPf0ULWNDsLpjcmSYgvMXpGglIGM6JEjwH4-jt7Y
```

#### 이메일 설정 (Gmail SMTP)
```
EMAIL_SERVICE=gmail
EMAIL_USER=dadae5th@gmail.com
EMAIL_PASSWORD=kptwwtdbavjgajly
EMAIL_FROM_NAME=업무 관리 시스템
```

#### 애플리케이션 설정
```
NEXT_PUBLIC_APP_URL=https://periodic-task-manager.vercel.app
NEXT_PUBLIC_APP_NAME=주기별 업무 관리 시스템
NEXTAUTH_SECRET=your-nextauth-secret-key-production-2024
NEXTAUTH_URL=https://periodic-task-manager.vercel.app
CRON_SECRET=cron-secret-key-2024-production
TZ=Asia/Seoul
```

### 3. 환경 선택
각 환경 변수를 추가할 때 다음 환경들을 선택하세요:
- ✅ Production
- ✅ Preview  
- ✅ Development

### 4. 재배포
환경 변수 설정 완료 후:
1. Deployments 탭으로 이동
2. 최신 배포의 "..." 메뉴 클릭
3. "Redeploy" 선택하여 환경 변수가 적용된 새 배포 시작

## 🔗 접속 URL
배포 완료 후 다음 URL에서 서비스를 이용할 수 있습니다:
- **메인**: https://periodic-task-manager.vercel.app
- **로그인**: https://periodic-task-manager.vercel.app/login
- **비밀번호 찾기**: https://periodic-task-manager.vercel.app/forgot-password

## 🎯 주요 기능
✅ 사용자별 개별 대시보드
✅ 비밀번호 찾기/재설정
✅ 이메일 자동 발송
✅ 업무 관리 및 완료 처리
✅ 일정 관리 (일간/주간/월간)

## 📧 이메일 기능 테스트
1. 회원가입 → 환영 이메일 발송 확인
2. 비밀번호 찾기 → 재설정 링크 이메일 확인  
3. 매일 09:00 → 업무 알림 이메일 자동 발송 (Vercel Cron)

## 🔐 보안 설정
- 사용자별 개별 세션 관리
- JWT 토큰 기반 인증
- 비밀번호 재설정 토큰 (1시간 만료)
- Supabase RLS (Row Level Security) 적용
