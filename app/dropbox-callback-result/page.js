'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function DropboxCallbackResult() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Wait 2 seconds then redirect to dashboard
    const timer = setTimeout(() => {
      const success = searchParams.get('success')
      const error = searchParams.get('error')
      
      if (success) {
        router.push(`/dashboard?success=${success}`)
      } else if (error) {
        router.push(`/dashboard?error=${error}`)
      } else {
        router.push('/dashboard')
      }
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [router, searchParams])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Connecting...
        </h2>
        <p className="text-gray-600">
          You will be redirected to Dashboard in 3 seconds
        </p>
      </div>
    </div>
  )
}