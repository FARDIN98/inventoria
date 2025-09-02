import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  getUserInventoriesAction,
  getAllInventoriesForAdminAction,
  getPublicInventoriesWithWriteAccessAction,
  deleteInventoryAction,
  toggleInventoryVisibilityAction
} from '@/lib/inventory-actions'

/**
 * Dashboard-specific store for optimized performance
 * Implements caching, debouncing, and prevents unnecessary API calls
 */
const useDashboardStore = create(
  persist(
    (set, get) => ({
      // State
      inventories: [],
      publicInventories: [],
      selectedInventories: new Set(),
      selectedPublicInventories: new Set(),
      loading: false,
      error: null,
      togglingVisibility: new Set(),
      isDeleting: false,
      isAdmin: false,
      
      // Cache management
      lastFetchTime: null,
      lastPublicFetchTime: null,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes cache
      
      // Window resize debouncing
      resizeTimeout: null,
      
      // Setters
      setInventories: (inventories) => set({ inventories }),
      setPublicInventories: (publicInventories) => set({ publicInventories }),
      setSelectedInventories: (selectedInventories) => set({ selectedInventories }),
      setSelectedPublicInventories: (selectedPublicInventories) => set({ selectedPublicInventories }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setTogglingVisibility: (togglingVisibility) => set({ togglingVisibility }),
      setIsDeleting: (isDeleting) => set({ isDeleting }),
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      
      // Cache helpers
      isCacheValid: (lastFetchTime) => {
        const { cacheTimeout } = get()
        return lastFetchTime && (Date.now() - lastFetchTime) < cacheTimeout
      },
      
      // Optimized data loading with caching
      loadDashboardData: async (forceRefresh = false) => {
        const { 
          isCacheValid, 
          lastFetchTime, 
          lastPublicFetchTime,
          inventories,
          publicInventories,
          loading 
        } = get()
        
        // Prevent multiple simultaneous calls
        if (loading && !forceRefresh) {
          return { success: true, cached: true }
        }
        
        // Check cache validity
        const inventoryCacheValid = !forceRefresh && isCacheValid(lastFetchTime) && inventories.length > 0
        const publicCacheValid = !forceRefresh && isCacheValid(lastPublicFetchTime) && publicInventories.length > 0
        
        if (inventoryCacheValid && publicCacheValid) {
          return { success: true, cached: true }
        }
        
        set({ loading: true, error: null })
        
        try {
          let userInventoriesResult = null
          let isUserAdmin = false
          
          // Load user inventories if cache is invalid
          if (!inventoryCacheValid) {
            userInventoriesResult = await getUserInventoriesAction()
            
            if (userInventoriesResult.success) {
              isUserAdmin = userInventoriesResult.isAdmin || false
              set({ 
                inventories: userInventoriesResult.inventories,
                isAdmin: isUserAdmin,
                lastFetchTime: Date.now()
              })
              
              // If user is admin, load all inventories instead
              if (isUserAdmin) {
                const adminResult = await getAllInventoriesForAdminAction()
                if (adminResult.success) {
                  set({ inventories: adminResult.inventories })
                }
              }
            } else {
              set({ error: userInventoriesResult.error })
              return userInventoriesResult
            }
          }
          
          // Load public inventories for non-admin users if cache is invalid
          if (!publicCacheValid && !isUserAdmin) {
            const publicResult = await getPublicInventoriesWithWriteAccessAction()
            if (publicResult.success) {
              set({ 
                publicInventories: publicResult.inventories,
                lastPublicFetchTime: Date.now()
              })
            }
          }
          
          set({ loading: false })
          return { success: true, cached: false }
          
        } catch (error) {
          set({ error: 'Failed to load dashboard data', loading: false })
          return { success: false, error: 'Failed to load dashboard data' }
        }
      },
      
      // Debounced window resize handler
      handleWindowResize: () => {
        const { resizeTimeout } = get()
        
        // Clear existing timeout
        if (resizeTimeout) {
          clearTimeout(resizeTimeout)
        }
        
        // Set new debounced timeout
        const newTimeout = setTimeout(() => {
          // Only trigger re-render if necessary
          // Most dashboard content doesn't need to change on resize
          set({ resizeTimeout: null })
        }, 150) // 150ms debounce
        
        set({ resizeTimeout: newTimeout })
      },
      
      // Optimized selection handlers
      handleInventorySelect: (inventoryId, checked) => {
        const { selectedInventories } = get()
        const newSelected = new Set(selectedInventories)
        
        if (checked) {
          newSelected.add(inventoryId)
        } else {
          newSelected.delete(inventoryId)
        }
        
        set({ selectedInventories: newSelected })
      },
      
      handleSelectAllInventories: (checked) => {
        const { inventories } = get()
        
        if (checked) {
          set({ selectedInventories: new Set(inventories.map(inv => inv.id)) })
        } else {
          set({ selectedInventories: new Set() })
        }
      },
      
      handlePublicInventorySelect: (inventoryId, checked) => {
        const { selectedPublicInventories } = get()
        const newSelected = new Set(selectedPublicInventories)
        
        if (checked) {
          newSelected.add(inventoryId)
        } else {
          newSelected.delete(inventoryId)
        }
        
        set({ selectedPublicInventories: newSelected })
      },
      
      handleSelectAllPublicInventories: (checked) => {
        const { publicInventories } = get()
        
        if (checked) {
          set({ selectedPublicInventories: new Set(publicInventories.map(inv => inv.id)) })
        } else {
          set({ selectedPublicInventories: new Set() })
        }
      },
      
      // Optimized delete with local state update
      deleteSelectedInventories: async () => {
        const { selectedInventories, inventories } = get()
        
        if (selectedInventories.size === 0) {
          return { success: false, error: 'No inventories selected' }
        }
        
        set({ isDeleting: true })
        
        try {
          const deletePromises = Array.from(selectedInventories).map(async (inventoryId) => {
            const result = await deleteInventoryAction(inventoryId)
            if (!result.success) {
              return { inventoryId, error: result.error }
            }
            return { inventoryId, success: true }
          })

          const results = await Promise.all(deletePromises)
          const successfulDeletes = results.filter(r => r.success).map(r => r.inventoryId)
          const failedDeletes = results.filter(r => r.error)

          // Update local state immediately
          const updatedInventories = inventories.filter(
            inv => !successfulDeletes.includes(inv.id)
          )

          set({
            inventories: updatedInventories,
            selectedInventories: new Set(),
            isDeleting: false,
            // Invalidate cache to ensure fresh data on next load
            lastFetchTime: null
          })

          return {
            success: failedDeletes.length === 0,
            successCount: successfulDeletes.length,
            failedCount: failedDeletes.length,
            errors: failedDeletes
          }
        } catch (error) {
          set({ isDeleting: false })
          return { success: false, error: 'Failed to delete inventories' }
        }
      },
      
      // Optimized visibility toggle with local state update
      toggleVisibility: async (inventoryId) => {
        const { togglingVisibility, inventories } = get()
        const newTogglingSet = new Set(togglingVisibility)
        newTogglingSet.add(inventoryId)
        set({ togglingVisibility: newTogglingSet })

        try {
          const result = await toggleInventoryVisibilityAction(inventoryId)
          
          if (result.success) {
            // Update local state immediately
            const updatedInventories = inventories.map(inv => 
              inv.id === inventoryId 
                ? { ...inv, isPublic: result.inventory.isPublic }
                : inv
            )
            set({ inventories: updatedInventories })
          }
          
          // Remove from toggling set
          const finalTogglingSet = new Set(togglingVisibility)
          finalTogglingSet.delete(inventoryId)
          set({ togglingVisibility: finalTogglingSet })
          
          return result
        } catch (error) {
          // Remove from toggling set on error
          const finalTogglingSet = new Set(togglingVisibility)
          finalTogglingSet.delete(inventoryId)
          set({ togglingVisibility: finalTogglingSet })
          return { success: false, error: 'Failed to toggle visibility' }
        }
      },
      
      // Delete public inventory with local state update
      deletePublicInventory: async (inventoryId) => {
        const { publicInventories, selectedPublicInventories } = get()
        
        try {
          const result = await deleteInventoryAction(inventoryId)
          
          if (result.success) {
            // Update local state immediately
            const updatedPublicInventories = publicInventories.filter(inv => inv.id !== inventoryId)
            const updatedSelectedPublic = new Set(selectedPublicInventories)
            updatedSelectedPublic.delete(inventoryId)
            
            set({ 
              publicInventories: updatedPublicInventories,
              selectedPublicInventories: updatedSelectedPublic,
              // Invalidate cache
              lastPublicFetchTime: null
            })
          }
          
          return result
        } catch (error) {
          return { success: false, error: 'An unexpected error occurred while deleting inventory' }
        }
      },
      
      // Force refresh data
      refreshData: async () => {
        return await get().loadDashboardData(true)
      },
      
      // Clear cache
      clearCache: () => {
        set({ 
          lastFetchTime: null,
          lastPublicFetchTime: null
        })
      },
      
      // Clear all state
      clearState: () => {
        const { resizeTimeout } = get()
        
        // Clear any pending timeouts
        if (resizeTimeout) {
          clearTimeout(resizeTimeout)
        }
        
        set({
          inventories: [],
          publicInventories: [],
          selectedInventories: new Set(),
          selectedPublicInventories: new Set(),
          loading: false,
          error: null,
          togglingVisibility: new Set(),
          isDeleting: false,
          isAdmin: false,
          lastFetchTime: null,
          lastPublicFetchTime: null,
          resizeTimeout: null
        })
      },
      
      // Cleanup function for component unmount
      cleanup: () => {
        const { resizeTimeout } = get()
        
        if (resizeTimeout) {
          clearTimeout(resizeTimeout)
          set({ resizeTimeout: null })
        }
      }
    }),
    {
      name: 'dashboard-store',
      // Only persist essential data, not functions or timeouts
      partialize: (state) => ({
        inventories: state.inventories,
        publicInventories: state.publicInventories,
        isAdmin: state.isAdmin,
        lastFetchTime: state.lastFetchTime,
        lastPublicFetchTime: state.lastPublicFetchTime
      })
    }
  )
)

export default useDashboardStore