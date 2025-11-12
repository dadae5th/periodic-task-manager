import type { AppProps } from 'next/app'
import Head from 'next/head'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>주기별 업무 관리 시스템</title>
        {/* PWA 및 알림 기능 완전 비활성화 */}
        <meta name="mobile-web-app-capable" content="no" />
        <meta name="apple-mobile-web-app-capable" content="no" />
        <meta name="msapplication-starturl" content="/" />
        {/* CSP 메타 태그 제거 - 이메일 자동 로그인 문제 해결을 위해 */}
      </Head>
      <Component {...pageProps} />
    </>
  )
}
