/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['nodemailer'],
  },
  env: {
    TZ: 'Asia/Seoul',
  },
  // Vercel 무료 배포를 위한 설정
  images: {
    domains: ['localhost'],
  },
  // 빌드 최적화
  compress: true,
  poweredByHeader: false,
  // 보안 헤더 (CSP 임시 비활성화, PWA 알림 차단)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'notifications=(), push=(), geolocation=(), microphone=(), camera=()',
          },
          // CSP 완전 제거 - 이메일 자동 로그인 문제 해결을 위해
          // {
          //   key: 'Content-Security-Policy',
          //   value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: *; script-src 'self' 'unsafe-inline' 'unsafe-eval' *; style-src 'self' 'unsafe-inline' *; img-src 'self' data: https: *; font-src 'self' data: https: *; connect-src 'self' https: wss: *; object-src 'none'; base-uri 'self'; form-action 'self' *; frame-ancestors 'none';"
          // },
        ],
      },
    ]
  },
}

module.exports = nextConfig
