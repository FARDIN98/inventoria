"use client"

import Link from "next/link"
import { Search, Settings } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import useAuthStore from "@/lib/stores/auth"
import { useEffect, useState } from "react"
import { checkAdminPermission } from "@/lib/admin-actions"

/**
 * Global Header component with navigation, search, and theme toggle
 * Responsive header with project branding, search functionality, and user actions
 * 
 * @returns {JSX.Element} Complete header component with all navigation elements
 */
export function Header() {
  const { user, loading, initialize, signOut } = useAuthStore()
  const [isAdmin, setIsAdmin] = useState(false)

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
            <Link href="/" className="font-bold text-xl hover:opacity-80 transition-opacity">
              Inventoria
            </Link>
          </div>
          
          {/* Search Box - Hidden on mobile, visible on tablet+ */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search inventories..."
                className="pl-10 w-full"
                aria-label="Search inventories"
              />
            </div>
          </div>
          
          {/* Navigation Actions */}
          <nav className="flex items-center space-x-2">
            {/* Mobile Search Button - Visible only on mobile and when not authenticated */}
            {!user && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
            
            {/* Navigation Links for authenticated users */}
            {user && (
              <div className="flex items-center space-x-2">
                
                {isAdmin && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/admin" className="flex items-center gap-1">
                      <Settings className="h-4 w-4" />
                      Admin
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
                  Log out
                </Button>
              </div>
            ) : (
              <Button asChild variant="outline">
                <Link href="/login">Log in</Link>
              </Button>
            )}
            
            {/* Theme Toggle */}
            <ThemeToggle />
          </nav>
        </div>
        
        {/* Mobile Search Bar - Visible only on mobile when needed */}
        <div className="md:hidden pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search inventories..."
              className="pl-10 w-full"
              aria-label="Search inventories"
            />
          </div>
        </div>
      </div>
    </header>
  )
}