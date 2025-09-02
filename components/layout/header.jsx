"use client"

import Link from "next/link"
import { Settings, Menu, X } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/SearchInput"
import useAuthStore from "@/lib/stores/auth"
import { useEffect, useState } from "react"
import { checkAdminPermission } from "@/lib/admin-actions"
import dynamic from "next/dynamic"
import { useTranslation } from "react-i18next"

const LanguageSwitcher = dynamic(() => import('../LanguageSwitcher'), { ssr: false })

/**
 * Global Header component with navigation, search, and theme toggle
 * Responsive header with project branding, search functionality, and user actions
 * 
 * @returns {JSX.Element} Complete header component with all navigation elements
 */
export function Header() {
  const { t } = useTranslation()
  const { user, loading, initialize, signOut } = useAuthStore()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Initialize auth state on component mount
  useEffect(() => {
    initialize()
  }, [])

  // Check admin status when user changes
  useEffect(() => {
    async function checkAdmin() {
      if (user) {
        try {
          const result = await checkAdminPermission()
          setIsAdmin(result.success && result.isAdmin)
        } catch (error) {
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
    }
    checkAdmin()
  }, [user])

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-2">
            <Link href="/" className="font-bold text-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent hover:scale-105 hover:from-purple-600 hover:via-pink-600 hover:to-blue-600 dark:hover:from-purple-400 dark:hover:via-pink-400 dark:hover:to-blue-400 transition-all duration-300 ease-in-out transform">
              Inventoria
            </Link>
          </div>
          
          {/* Search Box - Hidden on mobile, visible on tablet+ */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <SearchInput
              placeholder={t('search.placeholder', 'Search inventories...')}
              className="w-full"
            />
          </div>
          
          {/* Desktop Navigation Actions */}
          <nav className="hidden md:flex items-center space-x-2">
            {/* Navigation Links for authenticated users */}
            {user && (
              <div className="flex items-center space-x-2">
                {isAdmin && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/admin" className="flex items-center gap-1">
                      <Settings className="h-4 w-4" />
                      {t('navigation.admin')}
                    </Link>
                  </Button>
                )}
              </div>
            )}

            {/* Authentication Section */}
            {loading ? (
              <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
            ) : user ? (
              <div className="flex items-center space-x-2">
                 <span className="text-sm font-medium text-foreground">
                   {user.user_metadata?.name || user.name || user.email}
                 </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                >
                  {t('navigation.logOut', 'Log out')}
                </Button>
              </div>
            ) : (
              <Button asChild variant="outline">
                <Link href="/login">{t('navigation.logIn', 'Log in')}</Link>
              </Button>
            )}
            
            {/* Language Switcher */}
            <div className="ml-3 md:ml-4">
              <LanguageSwitcher />
            </div>
            
            {/* Theme Toggle */}
            <ThemeToggle />
          </nav>
          
          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Language Switcher - Always visible on mobile */}
            <LanguageSwitcher />
            
            {/* Theme Toggle - Always visible on mobile */}
            <ThemeToggle />
            
            {/* Hamburger Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={t('actions.toggleMobileMenu', 'Toggle mobile menu')}
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur">
            <div className="px-4 py-4 space-y-3">
              {/* Search Bar */}
              <SearchInput
                placeholder={t('search.placeholder', 'Search inventories...')}
                className="w-full"
              />
              
              {/* Navigation Items */}
              <div className="space-y-2">
                {user ? (
                  <>
                    {/* Admin Link */}
                    {isAdmin && (
                      <Button asChild variant="ghost" className="w-full justify-start">
                        <Link href="/admin" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                          <Settings className="h-4 w-4" />
                          {t('navigation.admin', 'Admin')}
                        </Link>
                      </Button>
                    )}
                    
                    {/* User Info */}
                    <div className="px-3 py-2 text-sm font-medium text-foreground border rounded-md">
                      {user.user_metadata?.name || user.name || user.email}
                    </div>
                    
                    {/* Logout Button */}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        handleLogout()
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      {t('navigation.logOut', 'Log out')}
                    </Button>
                  </>
                ) : (
                  /* Login Button */
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>{t('navigation.logIn', 'Log in')}</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile Search Bar - Visible only on mobile when menu is closed and not authenticated */}
        {!isMobileMenuOpen && !user && (
          <div className="md:hidden pb-4">
            <SearchInput
              placeholder={t('search.placeholder', 'Search inventories...')}
              className="w-full"
            />
          </div>
        )}
      </div>
    </header>
  )
}