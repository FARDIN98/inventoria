"use client"

import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import AdminDashboard from './AdminDashboard'

export default function AdminPage() {
  const { t } = useTranslation()
  
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('admin.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('admin.description')}
        </p>
      </div>
      
      <Suspense fallback={
        <div className="rounded-md border">
          <div className="p-8 text-center">
            <p className="text-muted-foreground">{t('admin.loadingUsers')}</p>
          </div>
        </div>
      }>
        <AdminDashboard />
      </Suspense>
    </div>
  )
}