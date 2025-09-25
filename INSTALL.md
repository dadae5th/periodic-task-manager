# 🚀 주기별 업무 관리 시스템 설치 가이드

이 가이드를 따라하면 완전 무료로 주기별 업무 관리 시스템을 설치하고 운영할 수 있습니다.

## 📋 사전 준비

### 1. Node.js 설치
- https://nodejs.org 에서 LTS 버전 다운로드
- 설치 완료 후 터미널에서 확인:
```powershell
node --version
npm --version
```

### 2. 필요한 계정 생성 (모두 무료)
- **Supabase**: https://supabase.com (데이터베이스)
- **Vercel**: https://vercel.com (호스팅)
- **Gmail**: 이메일 발송용 (기존 계정 사용 가능)

## 🗄️ 1단계: Supabase 데이터베이스 설정

### 1.1 Supabase 프로젝트 생성
1. https://supabase.com 접속 후 로그인
2. "New Project" 클릭
3. 프로젝트 이름: `periodic-task-manager`
4. 데이터베이스 비밀번호 설정 (안전한 곳에 보관)
5. 리전: `Northeast Asia (Seoul)` 선택
6. "Create new project" 클릭

### 1.2 데이터베이스 스키마 생성
1. 프로젝트 대시보드에서 "SQL Editor" 클릭
2. 왼쪽 "New query" 클릭
3. `database/schema.sql` 파일의 내용을 모두 복사해서 붙여넣기
4. "Run" 버튼 클릭하여 실행

### 1.3 API 키 확인
1. "Settings" → "API" 메뉴로 이동
2. 다음 정보 복사해서 메모장에 저장:
   - Project URL
   - anon public key
   - service_role key (보안 주의!)

## 📧 2단계: Gmail SMTP 설정

### 2.1 Gmail 2단계 인증 활성화
1. Gmail 계정 설정으로 이동
2. "보안" 탭에서 "2단계 인증" 활성화

### 2.2 앱 비밀번호 생성
1. Google 계정 관리 → 보안
2. "Google에 로그인" → "앱 비밀번호"
3. 앱 선택: "메일", 기기 선택: "기타"
4. 이름: "업무관리시스템" 입력
5. 생성된 16자리 비밀번호 복사 (공백 제거)

## 💻 3단계: 로컬 개발 환경 설정

### 3.1 프로젝트 설치
```powershell
# 프로젝트 폴더로 이동
cd "C:\Users\bae.jae.kwon\Documents\New_Reminder_Agent"

# 의존성 설치
npm install
```

### 3.2 환경 변수 설정
1. `.env.example` 파일을 복사하여 `.env.local` 생성
2. `.env.local` 파일을 열고 실제 값으로 변경:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gmail SMTP 설정
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-digit-app-password
EMAIL_FROM_NAME=업무 관리 시스템

# 애플리케이션 설정
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=주기별 업무 관리 시스템

# 보안 설정 (랜덤 문자열 생성)
NEXTAUTH_SECRET=your-random-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Cron 보안 (선택사항)
CRON_SECRET=your-cron-secret
```

### 3.3 개발 서버 실행
```powershell
npm run dev
```

브라우저에서 http://localhost:3000 접속하여 확인

## 🌐 4단계: Vercel 배포 (무료 호스팅)

### 4.1 Vercel 계정 생성 및 연동
1. https://vercel.com 접속 후 GitHub으로 로그인
2. GitHub에 프로젝트 코드 업로드 (Git 사용)

### 4.2 Vercel 프로젝트 배포
1. Vercel 대시보드에서 "New Project" 클릭
2. GitHub 리포지토리 선택
3. "Import" 클릭
4. 배포 설정은 기본값 사용

### 4.3 Vercel 환경 변수 설정
1. 프로젝트 대시보드 → "Settings" → "Environment Variables"
2. `.env.local`의 모든 변수를 추가 (단, `NEXT_PUBLIC_APP_URL`은 실제 도메인으로 변경)
3. "Redeploy" 실행

### 4.4 도메인 확인
- 배포 완료 후 `https://your-project.vercel.app` 형태의 URL 확인
- 커스텀 도메인 연결 가능 (무료)

## ⚙️ 5단계: 자동 이메일 발송 설정

### 5.1 Cron Job 활성화
Vercel에서 자동으로 `vercel.json` 파일의 cron 설정이 적용됩니다.
- 매일 오전 9시에 자동 이메일 발송
- 시간 변경: `vercel.json`에서 `schedule` 수정

### 5.2 수신자 설정
1. 대시보드에서 사용자 추가
2. 각 사용자의 알림 설정에서 이메일 수신 시간 설정
3. 업무 생성 시 담당자 지정

## 🧪 6단계: 테스트

### 6.1 기본 기능 테스트
1. 대시보드에서 업무 추가
2. 이메일 발송 테스트: `/api/email/send-daily` API 호출
3. 업무 완료 처리 테스트

### 6.2 이메일 발송 테스트
```javascript
// 브라우저 콘솔에서 실행
fetch('/api/email/send-daily', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipients: ['your-email@gmail.com'],
    test_mode: true
  })
})
```

## 📊 7단계: 모니터링 및 관리

### 7.1 로그 확인
- Supabase 대시보드에서 `email_logs`, `cron_logs` 테이블 확인
- Vercel 대시보드에서 함수 실행 로그 확인

### 7.2 데이터 백업
- Supabase에서 정기적으로 데이터 내보내기 권장
- 중요한 업무 데이터는 별도 백업 고려

## 🔧 문제 해결

### 이메일이 발송되지 않는 경우
1. Gmail 앱 비밀번호 재확인
2. 환경 변수 설정 확인
3. Vercel 함수 로그 확인

### 데이터베이스 연결 오류
1. Supabase URL과 키 재확인
2. RLS(Row Level Security) 정책 확인
3. 네트워크 연결 상태 확인

### Cron Job이 실행되지 않는 경우
1. Vercel Pro 플랜 필요 (월 $20, 첫 달 무료)
2. 또는 외부 Cron 서비스 사용 (cron-job.org 등)

## 💰 비용 예상

### 완전 무료 구성
- **Supabase**: 무료 티어 (500MB, 50K MAU)
- **Vercel**: Hobby 플랜 (100GB 대역폭/월)
- **Gmail SMTP**: 완전 무료

### 확장 시 예상 비용
- **Vercel Pro**: $20/월 (Cron Job 포함)
- **Supabase Pro**: $25/월 (8GB, 100K MAU)
- **Resend**: $20/월 (50K 이메일)

일반적인 소규모 팀(~10명)은 **완전 무료**로 사용 가능합니다!

## 🎉 완료!

설치가 완료되었습니다! 이제 다음을 할 수 있습니다:

✅ 주기별 업무 생성 및 관리  
✅ 매일 자동 이메일 발송  
✅ 이메일에서 업무 완료 처리  
✅ 실시간 대시보드 모니터링  
✅ 지연 업무 자동 경고  

문제가 발생하면 GitHub Issues에 문의하세요!
