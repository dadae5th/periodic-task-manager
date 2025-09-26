import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Users test API called:', new Date().toISOString())
  
  try {
    console.log('Testing users table...')
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .limit(5)
    
    if (error) {
      console.error('Users query error:', error)
      return res.status(500).json({
        success: false,
        error: 'Users query failed',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        users: data || [],
        count: data?.length || 0
      }
    })

  } catch (error) {
    console.error('Handler error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
