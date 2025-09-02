import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Build-safe Supabase client initialization
let supabase = null;

const getSupabaseClient = async () => {
  if (typeof window === 'undefined') {
    // Return null during build/SSR
    return null;
  }
  
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables')
      return null;
    }

    try {
      // Dynamic import to prevent build issues
      const { createBrowserClient } = await import('@supabase/ssr')
      supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      return null;
    }
  }
  
  return supabase;
}

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
          
          const client = await getSupabaseClient();
          if (!client) {
            set({ loading: false });
            return;
          }
          
          // Get current session
          const { data: { session }, error } = await client.auth.getSession()
          
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

          // Initialize language store after auth is ready
          if (session?.user) {
            // Dynamically import to avoid circular dependencies
            const { default: useLanguageStore } = await import('@/lib/stores/language')
            await useLanguageStore.getState().initialize(session.user)
          }

          // Listen for auth changes
          client.auth.onAuthStateChange(async (event, session) => {
            set({ 
              session, 
              user: session?.user || null,
              loading: false 
            })
            
            // Initialize language store on auth state changes
            if (event === 'SIGNED_IN' && session?.user) {
              const { default: useLanguageStore } = await import('@/lib/stores/language')
              await useLanguageStore.getState().initialize(session.user)
            } else if (event === 'SIGNED_OUT') {
              // Initialize with no user (will use localStorage)
              const { default: useLanguageStore } = await import('@/lib/stores/language')
              await useLanguageStore.getState().initialize(null)
            }
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
          
          const client = await getSupabaseClient();
          if (!client) {
            set({ error: 'Authentication service unavailable', loading: false });
            return { success: false, error: 'Authentication service unavailable' };
          }
          
          const { data, error } = await client.auth.signInWithPassword({
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
          
          const client = await getSupabaseClient();
          if (!client) {
            set({ error: 'Authentication service unavailable', loading: false });
            return { success: false, error: 'Authentication service unavailable' };
          }
          
          const { data, error } = await client.auth.signUp({
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
          
          const client = await getSupabaseClient();
          if (!client) {
            set({ error: 'Authentication service unavailable', loading: false });
            return { success: false, error: 'Authentication service unavailable' };
          }
          
          const { data, error } = await client.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo: `${window.location.origin}/auth/callback`
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
          
          const client = await getSupabaseClient();
          if (!client) {
            set({ error: 'Authentication service unavailable', loading: false });
            return { success: false, error: 'Authentication service unavailable' };
          }
          
          const { error } = await client.auth.signOut()
          
          if (error) {
            set({ error: error.message, loading: false })
            return { success: false, error: error.message }
          }

          set({ 
            user: null, 
            session: null, 
            loading: false 
          })
          
          // Redirect to login page after successful logout
          if (typeof window !== 'undefined') {
            window.location.href = '/'
          }
          
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