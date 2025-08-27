import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  getUserInventoriesAction,
  getAllInventoriesForAdminAction,
  getPublicInventoriesWithWriteAccessAction,
  deleteInventoryAction,
  toggleInventoryVisibilityAction,
  createInventoryAction,
  editInventoryAction,
  getInventoryByIdAction
} from '@/lib/inventory-actions'

/**
 * Inventory store for managing inventory-related state
 * Handles inventories list, loading states, and CRUD operations
 */
const useInventoryStore = create(
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

      // Actions
      setInventories: (inventories) => set({ inventories }),
      setPublicInventories: (publicInventories) => set({ publicInventories }),
      setSelectedInventories: (selectedInventories) => set({ selectedInventories }),
      setSelectedPublicInventories: (selectedPublicInventories) => set({ selectedPublicInventories }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setTogglingVisibility: (togglingVisibility) => set({ togglingVisibility }),
      setIsDeleting: (isDeleting) => set({ isDeleting }),

      // Load user inventories
      loadUserInventories: async () => {
        set({ loading: true, error: null })
        try {
          const result = await getUserInventoriesAction()
          if (result.success) {
            set({ inventories: result.inventories, loading: false })
            return result // Return the result so caller can access isAdmin
          } else {
            set({ error: result.error, loading: false })
            return result
          }
        } catch (error) {
          set({ error: 'Failed to load inventories', loading: false })
          return { success: false, error: 'Failed to load inventories' }
        }
      },

      // Load all inventories for admin users
      loadAllInventoriesForAdmin: async () => {
        set({ loading: true, error: null })
        try {
          const result = await getAllInventoriesForAdminAction()
          if (result.success) {
            set({ inventories: result.inventories, loading: false })
            return result
          } else {
            set({ error: result.error, loading: false })
            return result
          }
        } catch (error) {
          set({ error: 'Failed to load inventories', loading: false })
          return { success: false, error: 'Failed to load inventories' }
        }
      },

      // Load public inventories with write access
      loadPublicInventories: async () => {
        set({ loading: true, error: null })
        try {
          const result = await getPublicInventoriesWithWriteAccessAction()
          if (result.success) {
            set({ publicInventories: result.inventories, loading: false })
          } else {
            set({ error: result.error, loading: false })
          }
        } catch (error) {
          set({ error: 'Failed to load public inventories', loading: false })
        }
      },

      // Delete selected inventories
      deleteSelectedInventories: async () => {
        const { selectedInventories, inventories } = get()
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

          // Update inventories list by removing successfully deleted ones
          const updatedInventories = inventories.filter(
            inv => !successfulDeletes.includes(inv.id)
          )

          set({
            inventories: updatedInventories,
            selectedInventories: new Set(),
            isDeleting: false
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

      // Toggle inventory visibility
      toggleVisibility: async (inventoryId) => {
        const { togglingVisibility, inventories } = get()
        const newTogglingSet = new Set(togglingVisibility)
        newTogglingSet.add(inventoryId)
        set({ togglingVisibility: newTogglingSet })

        try {
          const result = await toggleInventoryVisibilityAction(inventoryId)
          if (result.success) {
            // Update the inventory in the list
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

      // Add new inventory to the list
      addInventory: (inventory) => {
        const { inventories } = get()
        set({ inventories: [inventory, ...inventories] })
      },

      // Update inventory in the list
      updateInventory: (inventoryId, updatedData) => {
        const { inventories } = get()
        const updatedInventories = inventories.map(inv => 
          inv.id === inventoryId ? { ...inv, ...updatedData } : inv
        )
        set({ inventories: updatedInventories })
      },

      // Clear all state
      clearState: () => {
        set({
          inventories: [],
          publicInventories: [],
          selectedInventories: new Set(),
          selectedPublicInventories: new Set(),
          loading: false,
          error: null,
          togglingVisibility: new Set(),
          isDeleting: false
        })
      }
    }),
    {
      name: 'inventory-store',
      // Only persist non-function values
      partialize: (state) => ({
        inventories: state.inventories,
        publicInventories: state.publicInventories
      })
    }
  )
)

export default useInventoryStore