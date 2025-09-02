'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { useTranslation } from 'react-i18next'

export default function AuthCodeErrorPage() {
  const { t } = useTranslation()
  
  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="space-y-4 pb-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
              {t('auth.authError', 'Authentication Error')}
            </CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-300">
              {t('auth.authErrorDescription', 'There was an error during the authentication process.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p>{t('auth.authErrorMessage', 'The authentication code was invalid or expired. Please try signing in again.')}</p>
            </div>
            
            <div className="space-y-3">
              <Link href="/login" className="w-full">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105">
                  {t('auth.tryAgain', 'Try Again')}
                </Button>
              </Link>
              
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full">
                  {t('common.backToHome', 'Back to Home')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}