"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * ThemeProvider component that wraps the entire app to provide theme context
 * Uses next-themes for seamless dark/light mode switching with SSR support
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.props - Additional props passed to NextThemesProvider
 * @returns {JSX.Element} ThemeProvider component
 */
export function ThemeProvider({ children, ...props }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

/**
 * Configuration options for ThemeProvider:
 * 
 * - attribute: "class" - Uses CSS classes for theme switching (dark/light)
 * - defaultTheme: "system" - Respects user's system preference by default
 * - enableSystem: true - Allows automatic system theme detection
 * - disableTransitionOnChange: true - Prevents flash during theme transitions
 */