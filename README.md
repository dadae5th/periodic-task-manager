# 주기별 업무 관리 시스템 (Periodic Task Manager)

업무를 주기별로 관리하고 이메일로 자동 알림을 보내며, 완료 처리를 통해 대시보드와 연동되는 시스템입니다.

🚀 **배포된 데모**: [https://periodic-task-manager.vercel.app](https://periodic-task-manager.vercel.app)  
🧪 **API 테스트**: [https://periodic-task-manager.vercel.app/test](https://periodic-task-manager.vercel.app/test)

## 🎯 주요 기능

### ✅ 구현 완료
- **업무 관리 API**: 업무 조회/생성 기능 완전 구현
- **데이터베이스 연동**: Supabase PostgreSQL 완전 연동
- **환경변수 관리**: 보안 설정 완료
- **배포 환경**: Vercel 자동 배포 구축
- **디버깅 시스템**: 종합적인 모니터링 및 디버깅 도구

### � 진행 중
- **이메일 자동 발송**: Gmail SMTP 연결 설정 중
- **웹 대시보드**: 프론트엔드 UI 구현 예정
- **업무 완료 처리**: 완료 상태 업데이트 기능

### 📧 이메일 기능 (설계 완료)
- 매일 자동으로 해야할 일 이메일 발송
- 일정이 지난 업무에 대한 경고 표시
- 개별 업무 완료 처리 버튼
- 대시보드로 이동 링크

### 📊 웹 대시보드 (설계 완료)
- 업무 추가/삭제/수정
- 담당자 관리
- 주기 설정 (일간/주간/월간)
- 실시간 진행 상황 모니터링

### 🗓️ 주기 관리 (스키마 완료)
- **일간**: 매일 반복
- **주간**: 매주 특정 요일 (월요일, 화요일 등)
- **월간**: 매월 특정 주 특정 요일 (첫째주 월요일 등)

### ⚡ 시스템 현황 (운영 중)
- **웹 서비스**: https://periodic-task-manager.vercel.app (다중 사용자 지원)
- **이메일 시스템**: 자동 발송 및 완료 처리 연동 완료
- **데이터베이스**: 사용자별 데이터 분리, 완료 기록 추적
- **보안**: 자동 로그인 토큰(5분), 세션 관리, RLS 정책 적용

## 🛠️ 기술 스택 (모든 무료 서비스)

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (무료 티어 - 500MB)
- **Email**: Gmail SMTP (무료) 또는 Resend (무료 티어 - 월 3,000통)
- **Hosting**: Vercel (무료 Hobby 플랜)
- **Scheduling**: Vercel Cron Jobs (무료)

## 📋 설치 요구사항

1. **Node.js 18+** - https://nodejs.org/에서 다운로드
2. **Git** (선택사항)

## 🚀 시작하기

### 1. Node.js 설치 확인
```bash
node --version
npm --version
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 값들을 설정하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 이메일 설정 (Gmail SMTP 사용 시)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password

# 또는 Resend 사용 시
RESEND_API_KEY=your-resend-api-key

# 애플리케이션 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. 개발 서버 실행
```bash
npm run dev
```

## 📁 프로젝트 구조

```
├── components/          # React 컴포넌트
│   ├── dashboard/       # 대시보드 관련 컴포넌트
│   ├── email/          # 이메일 관련 컴포넌트
│   └── ui/             # 공통 UI 컴포넌트
├── pages/              # Next.js 페이지
│   ├── api/            # API 라우트
│   │   ├── tasks/      # 업무 관리 API
│   │   ├── email/      # 이메일 발송 API
│   │   └── cron/       # 스케줄링 API
│   ├── dashboard/      # 대시보드 페이지
│   └── email/          # 이메일 처리 페이지
├── lib/               # 유틸리티 함수
│   ├── supabase.ts    # Supabase 클라이언트
│   ├── email.ts       # 이메일 서비스
│   └── scheduler.ts   # 스케줄링 로직
├── types/             # TypeScript 타입 정의
└── styles/            # CSS 스타일
```

## 🔧 환경 설정 가이드

### Supabase 설정
1. https://supabase.com에서 무료 계정 생성
2. 새 프로젝트 생성
3. API 키와 URL 복사하여 환경 변수에 설정

### 이메일 서비스 설정
#### Gmail SMTP (무료)
1. Gmail 계정에서 2단계 인증 활성화
2. 앱 비밀번호 생성
3. 환경 변수에 설정

#### Resend (무료 티어)
1. https://resend.com에서 계정 생성
2. API 키 생성
3. 환경 변수에 설정

### Vercel 배포 (무료)
1. https://vercel.com에서 GitHub 연동
2. 프로젝트 import
3. 환경 변수 설정
4. 자동 배포

## 📊 데이터베이스 스키마

### tasks 테이블
- id: UUID (Primary Key)
- title: 업무 제목
- description: 업무 설명
- assignee: 담당자
- frequency: 주기 (daily, weekly, monthly)
- frequency_details: 주기 세부사항 (요일, 주차 등)
- due_date: 마감일
- completed: 완료 여부
- created_at: 생성일
- updated_at: 수정일

### task_completions 테이블
- id: UUID (Primary Key)
- task_id: 업무 ID (Foreign Key)
- completed_at: 완료 시간
- completed_by: 완료자

## 🔄 업무 주기 설정 예시

### 일간
```json
{
  "frequency": "daily",
  "frequency_details": {}
}
```

### 주간
```json
{
  "frequency": "weekly",
  "frequency_details": {
    "day_of_week": 1  // 0: 일요일, 1: 월요일, ..., 6: 토요일
  }
}
```

### 월간
```json
{
  "frequency": "monthly",
  "frequency_details": {
    "week_of_month": 1,  // 1: 첫째주, 2: 둘째주, ..., -1: 마지막주
    "day_of_week": 1     // 0: 일요일, 1: 월요일, ..., 6: 토요일
  }
}
```

## 📧 이메일 템플릿

자동 발송되는 이메일에는 다음이 포함됩니다:
- 오늘 해야할 일 목록
- 지연된 업무 (경고 표시)
- 개별 완료 처리 버튼
- 대시보드 링크

## 🎨 UI/UX 특징

- 반응형 디자인 (모바일/태블릿/데스크톱)
- 다크모드 지원
- 직관적인 드래그 앤 드롭
- 실시간 알림
- 접근성 준수

## 🔐 보안 고려사항

- 환경 변수를 통한 민감 정보 관리
- Supabase Row Level Security (RLS) 적용
- CSRF 보호
- 이메일 인증

## 🚨 알려진 제한사항

**무료 티어 제한:**
- Supabase: 500MB 저장공간, 50,000 월간 액티브 사용자
- Vercel: 100GB 대역폭/월
- Resend: 3,000통 이메일/월 (Gmail SMTP는 제한 없음)

## 📞 지원

문제가 발생하면 GitHub Issues를 통해 문의해주세요.

## 📜 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

##로그인 사이트
https://periodic-task-manager.vercel.app/
