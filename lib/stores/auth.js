import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../supabase'

/**
 * Auth store for managing authentication state
 * Handles user session, loading states, and auth actions
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      session: null,
      loading: true,
      error: null,

      // Actions
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // Initialize auth state
      initialize: async () => {
        try {
          set({ loading: true, error: null })
          
          // Get current session
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Error getting session:', error)
            set({ error: error.message, loading: false })
            return
          }

          set({ 
            session, 
            user: session?.user || null, 
            loading: false 
          })

          // Listen for auth changes
          supabase.auth.onAuthStateChange((event, session) => {
            set({ 
              session, 
              user: session?.user || null,
              loading: false 
            })
          })
        } catch (error) {
          console.error('Error initializing auth:', error)
          set({ error: error.message, loading: false })
        }
      },

      // Sign in with email and password
      signIn: async (email, password) => {
        try {
          set({ loading: true, error: null })
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          })

          if (error) {
            set({ error: error.message, loading: false })
            return { success: false, error: error.message }
          }

          set({ 
            user: data.user, 
            session: data.session, 
            loading: false 
          })
          
          return { success: true, user: data.user }
        } catch (error) {
          const errorMessage = error.message || 'An unexpected error occurred'
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      },

      // Sign up with email and password
      signUp: async (email, password) => {
        try {
          set({ loading: true, error: null })
          
          const { data, error } = await supabase.auth.signUp({
            email,
            password
          })

          if (error) {
            set({ error: error.message, loading: false })
            return { success: false, error: error.message }
          }

          set({ 
            user: data.user, 
            session: data.session, 
            loading: false 
          })
          
          return { success: true, user: data.user }
        } catch (error) {
          const errorMessage = error.message || 'An unexpected error occurred'
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      },

      // Sign in with OAuth (Google, Facebook)
      signInWithOAuth: async (provider) => {
        try {
          set({ loading: true, error: null })
          
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo: `${window.location.origin}/dashboard`
            }
          })

          if (error) {
            set({ error: error.message, loading: false })
            return { success: false, error: error.message }
          }

          return { success: true }
        } catch (error) {
          const errorMessage = error.message || 'An unexpected error occurred'
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      },

      // Sign out
      signOut: async () => {
        try {
          set({ loading: true, error: null })
          
          const { error } = await supabase.auth.signOut()
          
          if (error) {
            set({ error: error.message, loading: false })
            return { success: false, error: error.message }
          }

          set({ 
            user: null, 
            session: null, 
            loading: false 
          })
          
          return { success: true }
        } catch (error) {
          const errorMessage = error.message || 'An unexpected error occurred'
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      },

      // Clear error
      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        session: state.session 
      })
    }
  )
)

export default useAuthStore