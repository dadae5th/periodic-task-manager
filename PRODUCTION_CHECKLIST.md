# 🚀 프로덕션 서버 활성화 체크리스트

## ✅ 1단계: Vercel 환경 변수 설정

### 📋 필수 설정 항목
Vercel 대시보드 (https://vercel.com/dashboard)에서 설정하세요:

#### 🔑 Supabase 연동
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅  
- `SUPABASE_SERVICE_ROLE_KEY` ✅

#### 📧 이메일 서비스 (Gmail SMTP)
- `EMAIL_SERVICE=gmail` ✅
- `EMAIL_USER=dadae5th@gmail.com` ✅
- `EMAIL_PASSWORD=kptwwtdbavjgajly` ✅
- `EMAIL_FROM_NAME=업무 관리 시스템` ✅

#### 🌐 애플리케이션 설정
- `NEXT_PUBLIC_APP_URL=https://periodic-task-manager.vercel.app` ✅
- `NEXT_PUBLIC_APP_NAME=주기별 업무 관리 시스템` ✅
- `NEXTAUTH_SECRET=your-nextauth-secret-key-production-2024` ⚠️ **보안 키 생성 필요**
- `NEXTAUTH_URL=https://periodic-task-manager.vercel.app` ✅
- `CRON_SECRET=cron-secret-key-2024-production` ⚠️ **보안 키 생성 필요**
- `TZ=Asia/Seoul` ✅

### 🔐 보안 키 생성
다음 명령으로 안전한 보안 키를 생성하세요:
```bash
# NEXTAUTH_SECRET 생성
openssl rand -base64 32

# CRON_SECRET 생성  
openssl rand -hex 16
```

## ✅ 2단계: Vercel 배포 확인

### 📊 배포 상태 확인
1. **GitHub 연동**: ✅ 자동 배포 활성화됨
2. **Build 성공**: 🔄 최신 커밋 배포 대기 중
3. **Domain 활성화**: ✅ periodic-task-manager.vercel.app

### 🕐 Cron Job 설정 확인
- **일정**: 매일 오전 9시 (한국시간)
- **경로**: `/api/cron/daily-email`
- **상태**: ⏳ 환경변수 설정 후 활성화됨

## ✅ 3단계: 기능 테스트

### 🧪 테스트 시나리오
1. **회원가입 테스트**
   - URL: https://periodic-task-manager.vercel.app/login
   - 새 계정 생성 → 환영 이메일 수신 확인

2. **로그인 테스트**  
   - 사용자별 개별 대시보드 확인
   - URL 파라미터: `?user=이메일주소`

3. **비밀번호 찾기 테스트**
   - URL: https://periodic-task-manager.vercel.app/forgot-password
   - 재설정 링크 이메일 수신 확인

4. **업무 관리 테스트**
   - 업무 생성/완료/삭제
   - 일괄 삭제 기능
   - 통계 대시보드

5. **이메일 알림 테스트**
   - 매일 09:00 자동 발송 (Cron Job)
   - 업무 완료 시 알림

## 🎯 4단계: 사용자 가이드

### 👥 사용자별 접속 방법
각 사용자는 개별 URL로 접속:
```
https://periodic-task-manager.vercel.app/dashboard?user=사용자이메일@도메인.com
```

### 📧 이메일 기능
- **회원가입**: 즉시 환영 이메일
- **비밀번호 재설정**: 1시간 유효한 보안 링크  
- **일일 업무 알림**: 매일 09:00 자동 발송
- **개인 대시보드 링크**: 이메일에 포함

### 🔒 보안 기능
- 사용자별 개별 세션 관리
- JWT 토큰 기반 인증
- Supabase RLS 적용
- 비밀번호 재설정 토큰 (1시간 만료)

## 🚨 문제 해결

### 일반적인 문제
1. **이메일이 오지 않는 경우**
   - Gmail 스팸 폴더 확인
   - EMAIL_* 환경 변수 설정 확인

2. **로그인이 안 되는 경우**
   - NEXTAUTH_URL 설정 확인
   - 데이터베이스 연결 상태 확인

3. **Cron Job이 작동하지 않는 경우**
   - CRON_SECRET 설정 확인
   - Vercel Functions 로그 확인

### 📞 지원
문제가 발생하면 다음을 확인하세요:
- Vercel 배포 로그
- Browser 개발자 도구 Console
- Network 탭에서 API 응답 확인

---
**🎉 설정 완료 후 https://periodic-task-manager.vercel.app 에서 서비스를 이용하세요!**
