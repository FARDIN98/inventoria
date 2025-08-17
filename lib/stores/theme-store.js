import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Simplified theme store for basic theme preferences
 * Handles theme persistence with minimal overhead
 */
const useThemeStore = create(
  persist(
    (set) => ({
      // Simple theme preference storage
      preferredTheme: 'system', // 'light' | 'dark' | 'system'
      
      // Actions
      setPreferredTheme: (theme) => set({ preferredTheme: theme }),
    }),
    {
      name: 'theme-preference', // localStorage key
    }
  )
)

export default useThemeStore