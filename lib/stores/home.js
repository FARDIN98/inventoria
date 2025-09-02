import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getHomeDataAction } from '@/lib/home-actions'

/**
 * Home store for managing home page data
 * Handles latest inventories, popular inventories, and tags
 */
const useHomeStore = create(
  persist(
    (set, get) => ({
      // State
      homeData: {
        latestInventories: [],
        popularInventories: [],
        popularTags: []
      },
      loading: false,
      error: null,
      lastFetched: null,

      // Actions
      setHomeData: (homeData) => set({ homeData }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setLastFetched: (timestamp) => set({ lastFetched: timestamp }),

      // Load home page data
      loadHomeData: async (forceRefresh = false) => {
        const { lastFetched } = get()
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000 // 5 minutes in milliseconds

        // Skip loading if data is fresh and not forcing refresh
        if (!forceRefresh && lastFetched && (now - lastFetched) < fiveMinutes) {
          return { success: true, cached: true }
        }

        set({ loading: true, error: null })
        try {
          const result = await getHomeDataAction()
          if (result.success) {
            set({ 
              homeData: {
                latestInventories: result.data.latestInventories || [],
                popularInventories: result.data.popularInventories || [],
                popularTags: result.data.tagCloud || []
              },
              loading: false,
              lastFetched: now
            })
            return { success: true, cached: false }
          } else {
            set({ error: result.error || 'Failed to load data', loading: false })
            return result
          }
        } catch (error) {
          set({ error: 'An unexpected error occurred', loading: false })
          return { success: false, error: 'An unexpected error occurred' }
        }
      },

      // Refresh home data (force refresh)
      refreshHomeData: async () => {
        const { loadHomeData } = get()
        return await loadHomeData(true)
      },

      // Check if data is fresh (less than 5 minutes old)
      isDataFresh: () => {
        const { lastFetched } = get()
        if (!lastFetched) return false
        
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000
        return (now - lastFetched) < fiveMinutes
      },

      // Clear error
      clearError: () => {
        set({ error: null })
      },

      // Clear all state
      clearState: () => {
        set({
          homeData: {
            latestInventories: [],
            popularInventories: [],
            popularTags: []
          },
          loading: false,
          error: null,
          lastFetched: null
        })
      }
    }),
    {
      name: 'home-store',
      // Only persist home data and timestamp, not loading/error states
      partialize: (state) => ({
        homeData: state.homeData,
        lastFetched: state.lastFetched
      })
    }
  )
)

export default useHomeStore