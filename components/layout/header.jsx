"use client"

import { ThemeToggle } from "@/components/ui/theme-toggle"

/**
 * Header component with theme toggle functionality
 * Clean, responsive header with theme switching capability
 * 
 * @returns {JSX.Element} Header component with theme toggle
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-4 -mt-6 mb-6">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-lg">
            Inventoria
          </span>
        </div>
        
        <nav className="flex items-center">
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}