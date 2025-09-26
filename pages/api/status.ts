import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
    EMAIL_SERVICE: process.env.EMAIL_SERVICE ? 'Set' : 'Missing',
    EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Missing',
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'Set' : 'Missing',
    TZ: process.env.TZ || 'Not Set',
    NODE_ENV: process.env.NODE_ENV || 'Not Set'
  }

  res.status(200).json({
    success: true,
    message: 'Environment status check',
    data: envCheck,
    timestamp: new Date().toISOString()
  })
}
