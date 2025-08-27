import { create } from 'zustand'
import {
  getInventoryItemsAction,
  addItemAction,
  editItemAction,
  deleteItemAction
} from '@/lib/item-actions'

/**
 * Items store for managing inventory items state
 * Handles items list, CRUD operations, and loading states
 */
const useItemsStore = create((set, get) => ({
  // State
  items: [],
  loading: false,
  error: null,
  currentInventoryId: null,
  dialogOpen: false,
  editingItem: null,
  deleteDialogOpen: false,
  itemToDelete: null,
  submitting: false,

  // Actions
  setItems: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setCurrentInventoryId: (inventoryId) => set({ currentInventoryId: inventoryId }),
  setDialogOpen: (open) => set({ dialogOpen: open }),
  setEditingItem: (item) => set({ editingItem: item }),
  setDeleteDialogOpen: (open) => set({ deleteDialogOpen: open }),
  setItemToDelete: (item) => set({ itemToDelete: item }),
  setSubmitting: (submitting) => set({ submitting }),

  // Load items for a specific inventory
  loadItems: async (inventoryId) => {
    set({ loading: true, error: null, currentInventoryId: inventoryId })
    try {
      const result = await getInventoryItemsAction(inventoryId)
      if (result.success) {
        set({ items: result.items, loading: false })
      } else {
        set({ error: result.error, loading: false })
      }
    } catch (error) {
      set({ error: 'Failed to load items', loading: false })
    }
  },

  // Refresh items for current inventory
  refreshItems: async () => {
    const { currentInventoryId } = get()
    if (!currentInventoryId) return
    
    set({ loading: true, error: null })
    try {
      const result = await getInventoryItemsAction(currentInventoryId)
      if (result.success) {
        set({ items: result.items, loading: false })
      } else {
        set({ error: result.error, loading: false })
      }
    } catch (error) {
      set({ error: 'Failed to refresh items', loading: false })
    }
  },

  // Add new item
  addItem: async (inventoryId, itemData) => {
    set({ submitting: true, error: null })
    try {
      const result = await addItemAction(inventoryId, itemData)
      if (result.success) {
        const { items } = get()
        set({ 
          items: [result.item, ...items],
          submitting: false,
          dialogOpen: false
        })
        return result
      } else {
        set({ submitting: false })
        return result
      }
    } catch (error) {
      set({ submitting: false })
      return { success: false, error: 'Failed to add item' }
    }
  },

  // Edit existing item
  editItem: async (itemId, itemData) => {
    set({ submitting: true, error: null })
    try {
      const result = await editItemAction(itemId, itemData)
      if (result.success) {
        const { items } = get()
        const updatedItems = items.map(item => 
          item.id === itemId ? result.item : item
        )
        set({ 
          items: updatedItems,
          submitting: false,
          dialogOpen: false,
          editingItem: null
        })
        return result
      } else {
        set({ submitting: false })
        return result
      }
    } catch (error) {
      set({ submitting: false })
      return { success: false, error: 'Failed to edit item' }
    }
  },

  // Delete item
  deleteItem: async (itemId) => {
    set({ submitting: true, error: null })
    try {
      const result = await deleteItemAction(itemId)
      if (result.success) {
        const { items } = get()
        const updatedItems = items.filter(item => item.id !== itemId)
        set({ 
          items: updatedItems,
          submitting: false,
          deleteDialogOpen: false,
          itemToDelete: null
        })
        return result
      } else {
        set({ submitting: false })
        return result
      }
    } catch (error) {
      set({ submitting: false })
      return { success: false, error: 'Failed to delete item' }
    }
  },

  // Open add item dialog
  openAddDialog: () => {
    set({ 
      dialogOpen: true, 
      editingItem: null 
    })
  },

  // Open edit item dialog
  openEditDialog: (item) => {
    set({ 
      dialogOpen: true, 
      editingItem: item 
    })
  },

  // Close item dialog
  closeDialog: () => {
    set({ 
      dialogOpen: false, 
      editingItem: null 
    })
  },

  // Open delete confirmation dialog
  openDeleteDialog: (item) => {
    set({ 
      deleteDialogOpen: true, 
      itemToDelete: item 
    })
  },

  // Close delete confirmation dialog
  closeDeleteDialog: () => {
    set({ 
      deleteDialogOpen: false, 
      itemToDelete: null 
    })
  },

  // Clear all state
  clearState: () => {
    set({
      items: [],
      loading: false,
      error: null,
      currentInventoryId: null,
      dialogOpen: false,
      editingItem: null,
      deleteDialogOpen: false,
      itemToDelete: null,
      submitting: false
    })
  }
}))

export default useItemsStore