"use client"

import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import AdminDashboard from './AdminDashboard'

export default function AdminPage() {
  const { t } = useTranslation()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/50 dark:from-slate-950 dark:via-amber-950/30 dark:to-orange-950/50">
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6 p-6 bg-gradient-to-r from-white/80 to-amber-50/80 dark:from-slate-900/80 dark:to-amber-950/80 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 dark:from-amber-400 dark:via-orange-400 dark:to-red-400 bg-clip-text text-transparent">{t('admin.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('admin.description')}
          </p>
        </div>
        
        <Suspense fallback={
          <div className="rounded-xl border bg-gradient-to-br from-white/90 to-amber-50/80 dark:from-slate-900/90 dark:to-amber-950/80 border-amber-200/50 dark:border-amber-800/30 shadow-xl backdrop-blur-sm">
            <div className="p-8 text-center">
              <p className="text-muted-foreground">{t('admin.loadingUsers')}</p>
            </div>
          </div>
        }>
          <AdminDashboard />
        </Suspense>
      </div>
    </div>
  )
}