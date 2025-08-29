"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import useAuthStore from '@/lib/stores/auth'
import useHomeStore from '@/lib/stores/home'
import InventoryTable from '@/components/InventoryTable'
import TagCloud from '@/components/TagCloud'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const { t } = useTranslation()
  const { user, loading, initialize } = useAuthStore()
  const {
    homeData,
    loading: dataLoading,
    error,
    loadHomeData,
    getLatestInventories,
    getPopularInventories,
    getPopularTags
  } = useHomeStore()
  const router = useRouter()

  // Initialize auth state on component mount
  useEffect(() => {
    initialize()
  }, [])
  
  // Fetch home page data
  useEffect(() => {
    loadHomeData()
  }, [loadHomeData])

  // No redirect needed - authenticated users can view the home page

  // Show loading state while checking authentication or loading data
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  // Show error state if data loading failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">{t('home.errorLoadingData')}</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            {t('home.retry')}
          </button>
        </div>
      </div>
    )
  }

  // Render content for both authenticated and non-authenticated users

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              {t('home.welcome')}
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
              {t('home.description')}
            </p>
          </div>
        </div>
      </section>

      {/* Dashboard Button - Only for authenticated users */}
      {user && (
        <section className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <Link href="/dashboard">
              <Button size="lg" className="px-8 py-3">
                {t('home.goToDashboard')}
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Latest Inventories Section */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              {t('home.latestInventories')}
            </h2>
            <p className="text-muted-foreground">
              {t('home.latestInventoriesDescription')}
            </p>
          </div>
          <InventoryTable 
            data={getLatestInventories()} 
            title={t('home.latestInventories')}
          />
        </div>
      </section>

      

      {/* Popular Inventories Section */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              {t('home.popularInventories')}
            </h2>
            <p className="text-muted-foreground">
              {t('home.popularInventoriesDescription')}
            </p>
          </div>
          <InventoryTable 
            data={getPopularInventories()} 
            title={t('home.popularInventories')}
          />
        </div>
      </section>

      {/* Tag Cloud Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              {t('home.popularTags')}
            </h2>
            <p className="text-muted-foreground">
              {t('home.popularTagsDescription')}
            </p>
          </div>
          <TagCloud tags={getPopularTags()} />
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
            {t('home.ctaTitle')}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t('home.ctaDescription')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/register" 
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {t('home.getStarted')}
            </a>
            <a 
              href="/login" 
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {t('home.signIn')}
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
