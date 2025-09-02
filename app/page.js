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
    isDataFresh
  } = useHomeStore()
  const router = useRouter()

  // Initialize auth state on component mount
  useEffect(() => {
    initialize()
  }, [])
  
  // Fetch home page data only if not fresh (optimized API calls)
  useEffect(() => {
    if (!isDataFresh()) {
      loadHomeData()
    }
  }, [loadHomeData, isDataFresh])

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
          <h2 className="text-2xl font-bold text-destructive mb-4">{t('home.errorLoadingData', 'Error Loading Data')}</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            {t('home.retry', 'Retry')}
          </button>
        </div>
      </div>
    )
  }

  // Render content for both authenticated and non-authenticated users

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-blue-950/30 dark:to-indigo-950/50">
      {/* Hero Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 dark:from-blue-400/5 dark:via-purple-400/5 dark:to-pink-400/5 backdrop-blur-3xl"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent sm:text-6xl animate-pulse">
              {t('home.welcome', 'Welcome to Inventoria')}
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto font-medium">
              {t('home.description', 'Organize and manage your inventories with ease. Create, track, and share your collections with powerful tools and intuitive design.')}
            </p>
          </div>
        </div>
      </section>

      {/* Dashboard Button - Only for authenticated users */}
      {user && (
        <section className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <Link href="/dashboard">
              <Button size="lg" className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-0">
                {t('home.goToDashboard', 'Go to Dashboard')}
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Latest Inventories Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mb-4">
              {t('home.latestInventories', 'Latest Inventories')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('home.latestInventoriesDescription', 'Discover the most recently created inventories from our community')}
            </p>
          </div>
          <InventoryTable 
            data={homeData.latestInventories} 
            title={t('home.latestInventories', 'Latest Inventories')}
          />
        </div>
      </section>

      

      {/* Popular Inventories Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent mb-4">
              {t('home.popularInventories', 'Popular Inventories')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('home.popularInventoriesDescription', 'Explore the most popular and trending inventories')}
            </p>
          </div>
          <InventoryTable 
            data={homeData.popularInventories} 
            title={t('home.popularInventories', 'Popular Inventories')}
          />
        </div>
      </section>

      {/* Tag Cloud Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-violet-50/50 via-purple-50/30 to-fuchsia-50/50 dark:from-violet-950/20 dark:via-purple-950/10 dark:to-fuchsia-950/20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent mb-4">
              {t('home.popularTags', 'Popular Tags')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('home.popularTagsDescription', 'Browse inventories by popular tags and categories')}
            </p>
          </div>
          <TagCloud tags={homeData.popularTags} />
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-100/80 via-blue-100/60 to-indigo-100/80 dark:from-slate-900/80 dark:via-blue-900/60 dark:to-indigo-900/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-700 to-blue-700 dark:from-slate-300 dark:to-blue-300 bg-clip-text text-transparent mb-6">
            {t('home.ctaTitle', 'Ready to Get Started?')}
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('home.ctaDescription', 'Join thousands of users who are already organizing their inventories with Inventoria')}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href="/register" 
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-10 py-4 text-lg font-semibold text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-0"
            >
              {t('home.getStarted', 'Get Started')}
            </a>
            <a 
              href="/login" 
              className="inline-flex items-center justify-center rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-10 py-4 text-lg font-semibold text-slate-700 dark:text-slate-300 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              {t('home.signIn', 'Sign In')}
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
