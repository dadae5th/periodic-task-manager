import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Simple test API called!')
  res.status(200).json({ message: 'API 테스트 성공!', timestamp: new Date().toISOString() })
}
