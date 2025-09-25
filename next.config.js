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
  // 보안 헤더
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
        ],
      },
    ]
  },
}

module.exports = nextConfig
