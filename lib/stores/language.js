import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { updateUserLanguageAction } from '@/lib/language-actions'
import { toast } from 'sonner'

/**
 * Language store for managing UI language state
 * Handles language switching, persistence, and integration with i18next
 */
const useLanguageStore = create(
  persist(
    (set, get) => ({
      // State
      currentLanguage: 'en',
      loading: false,
      error: null,

      // Actions
      setCurrentLanguage: (language) => set({ currentLanguage: language }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // Initialize language from user preferences or localStorage
      initialize: async (user = null) => {
        try {
          set({ loading: true, error: null })
          
          let preferredLanguage = 'en' // Default fallback
          
          if (user && user.user_metadata?.language) {
            // Get from authenticated user's metadata
            preferredLanguage = user.user_metadata.language
          } else if (user && user.language) {
            // Get from user object if available
            preferredLanguage = user.language
          } else {
            // For unauthenticated users, check localStorage
            if (typeof window !== 'undefined') {
              const storedLanguage = localStorage.getItem('inventoria-language')
              if (storedLanguage && ['en', 'es'].includes(storedLanguage)) {
                preferredLanguage = storedLanguage
              }
            }
          }
          
          // Validate language
          if (!['en', 'es'].includes(preferredLanguage)) {
            preferredLanguage = 'en'
          }
          
          set({ 
            currentLanguage: preferredLanguage,
            loading: false 
          })
          
          // Update i18next if available
          if (typeof window !== 'undefined') {
            // Try to get i18next instance from global or import
            let i18n = window.i18n
            if (!i18n) {
              try {
                const i18nModule = await import('react-i18next')
                i18n = i18nModule.i18n
              } catch (e) {
                console.warn('i18next not available during language initialization')
              }
            }
            
            if (i18n && i18n.changeLanguage) {
              await i18n.changeLanguage(preferredLanguage)
            }
          }
          
        } catch (error) {
          console.error('Error initializing language:', error)
          set({ 
            error: error.message || 'Failed to initialize language',
            loading: false,
            currentLanguage: 'en' // Fallback to English
          })
        }
      },

      // Set language with optimistic updates and server persistence
      setLanguage: async (language) => {
        // Validate input
        if (!['en', 'es'].includes(language)) {
          const errorMessage = 'Invalid language. Only "en" and "es" are supported.'
          set({ error: errorMessage })
          toast.error(errorMessage)
          return { success: false, error: errorMessage }
        }

        const previousLanguage = get().currentLanguage
        
        try {
          set({ loading: true, error: null })
          
          // Optimistic update
          set({ currentLanguage: language })
          
          // Update i18next immediately for better UX
          if (typeof window !== 'undefined') {
            let i18n = window.i18n
            if (!i18n) {
              try {
                const i18nModule = await import('react-i18next')
                i18n = i18nModule.i18n
              } catch (e) {
                console.warn('i18next not available during language change')
              }
            }
            
            if (i18n && i18n.changeLanguage) {
              await i18n.changeLanguage(language)
            }
          }
          
          // Persist to localStorage for unauthenticated users
          if (typeof window !== 'undefined') {
            localStorage.setItem('inventoria-language', language)
          }
          
          // Try to persist to server for authenticated users
          const result = await updateUserLanguageAction(language)
          
          if (!result.success) {
            // If server update fails but user is not authenticated, that's okay
            if (result.error !== 'Unauthenticated') {
              console.error('Failed to update language on server:', result.error)
              // Don't rollback for server errors, keep the optimistic update
              toast.error('Language updated locally, but failed to sync with server')
            }
          } else {
            // Success toast for authenticated users
            toast.success('Language preference updated successfully')
          }
          
          set({ loading: false })
          return { success: true }
          
        } catch (error) {
          console.error('Error setting language:', error)
          
          // Rollback optimistic update
          set({ 
            currentLanguage: previousLanguage,
            error: error.message || 'Failed to update language',
            loading: false 
          })
          
          // Rollback i18next
          if (typeof window !== 'undefined') {
            let i18n = window.i18n
            if (!i18n) {
              try {
                const i18nModule = await import('react-i18next')
                i18n = i18nModule.i18n
              } catch (e) {
                console.warn('i18next not available during language rollback')
              }
            }
            
            if (i18n && i18n.changeLanguage) {
              await i18n.changeLanguage(previousLanguage)
            }
          }
          
          const errorMessage = error.message || 'Failed to update language'
          toast.error(errorMessage)
          return { success: false, error: errorMessage }
        }
      },

      // Clear error
      clearError: () => set({ error: null })
    }),
    {
      name: 'language-storage',
      partialize: (state) => ({ 
        currentLanguage: state.currentLanguage
      })
    }
  )
)

export default useLanguageStore