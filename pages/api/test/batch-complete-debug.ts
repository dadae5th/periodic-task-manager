import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiResponse } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://periodic-task-manager.vercel.app'
    
    // 요청 정보 로깅
    console.log('=== BATCH COMPLETE DEBUG START ===')
    console.log('Method:', req.method)
    console.log('Headers:', JSON.stringify(req.headers, null, 2))
    console.log('Query:', JSON.stringify(req.query, null, 2))
    console.log('Body:', JSON.stringify(req.body, null, 2))
    
    let task_ids: string[]
    let completed_by: string
    
    if (req.method === 'GET') {
      const { tasks, completed_by: completedByParam } = req.query
      task_ids = typeof tasks === 'string' ? tasks.split(',').filter(id => id.trim()) : []
      completed_by = Array.isArray(completedByParam) ? completedByParam[0] : (completedByParam || '')
    } else if (req.method === 'POST') {
      const body = req.body
      const formTaskIds = body.task_ids
      if (Array.isArray(formTaskIds)) {
        task_ids = formTaskIds
      } else if (typeof formTaskIds === 'string') {
        task_ids = [formTaskIds]
      } else {
        task_ids = []
      }
      completed_by = body.completed_by || ''
    } else {
      return res.status(405).json(createApiResponse(false, null, '허용되지 않는 메서드'))
    }
    
    console.log('Parsed data:')
    console.log('- task_ids:', task_ids)
    console.log('- completed_by:', completed_by)
    
    if (!completed_by) {
      console.log('ERROR: completed_by가 없습니다')
      return res.status(400).json(createApiResponse(false, null, '완료자 정보가 필요합니다.'))
    }
    
    if (task_ids.length === 0) {
      console.log('ERROR: task_ids가 없습니다')
      return res.status(400).json(createApiResponse(false, null, '완료할 업무 ID가 필요합니다.'))
    }
    
    // 토큰 생성 시도
    console.log('토큰 생성 API 호출 시작...')
    
    const tokenRequestBody = {
      email: completed_by,
      purpose: 'batch_completion_debug',
      task_count: task_ids.length
    }
    
    console.log('토큰 요청 데이터:', JSON.stringify(tokenRequestBody, null, 2))
    
    try {
      const tokenResponse = await fetch(`${appUrl}/api/auth/email-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tokenRequestBody)
      })
      
      console.log('토큰 API 응답 상태:', tokenResponse.status)
      console.log('토큰 API 응답 헤더:', Object.fromEntries(tokenResponse.headers))
      
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json()
        console.log('토큰 API 응답 DATA:', JSON.stringify(tokenData, null, 2))
        
        const token = tokenData.data?.token
        
        if (token) {
          const redirectUrl = `${appUrl}/api/auth/email-login?token=${token}&redirect=${encodeURIComponent('/dashboard?debug=batch_complete&completed=' + task_ids.length)}`
          console.log('성공! 자동 로그인 리디렉션 URL:', redirectUrl)
          console.log('=== BATCH COMPLETE DEBUG END (SUCCESS) ===')
          
          return res.redirect(302, redirectUrl)
        } else {
          console.log('ERROR: 토큰이 응답에 없음')
        }
      } else {
        const errorText = await tokenResponse.text()
        console.log('ERROR: 토큰 API HTTP 오류:', tokenResponse.status, errorText)
      }
    } catch (tokenError) {
      console.log('ERROR: 토큰 생성 예외:', tokenError)
    }
    
    // 실패 시 로그인 페이지로
    const failUrl = `${appUrl}/login?debug=batch_complete_failed&email=${encodeURIComponent(completed_by)}&tasks=${task_ids.length}`
    console.log('실패! 로그인 페이지로 리디렉션:', failUrl)
    console.log('=== BATCH COMPLETE DEBUG END (FAILED) ===')
    
    return res.redirect(302, failUrl)
    
  } catch (error) {
    console.log('FATAL ERROR:', error)
    console.log('=== BATCH COMPLETE DEBUG END (FATAL) ===')
    return res.status(500).json(createApiResponse(false, null, '서버 오류'))
  }
}
