import { create } from 'zustand'
import {
  toggleItemLikeAction,
  getItemLikeStatusAction,
  getMultipleItemsLikeStatusAction
} from '@/lib/like-actions'

/**
 * Likes store for managing like states across the application
 * Centralizes like state management, batch operations, and optimistic updates
 * Follows DRY principles by eliminating duplicate like logic
 */
const useLikesStore = create((set, get) => ({
  // State
  likeStates: {}, // { [itemId]: { likeCount: number, isLiked: boolean, isOptimistic?: boolean } }
  loading: false,
  error: null,
  batchOperationInProgress: false,
  optimisticUpdates: new Set(), // Track items with optimistic updates

  // Actions
  setLikeStates: (states) => set({ likeStates: states }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setBatchOperationInProgress: (inProgress) => set({ batchOperationInProgress: inProgress }),

  // Get like state for a single item
  getLikeState: (itemId) => {
    const { likeStates } = get()
    return likeStates[itemId] || { likeCount: 0, isLiked: false }
  },

  // Get like states for multiple items
  getLikeStates: (itemIds) => {
    const { likeStates } = get()
    const result = {}
    itemIds.forEach(itemId => {
      result[itemId] = likeStates[itemId] || { likeCount: 0, isLiked: false }
    })
    return result
  },

  // Load like states for multiple items
  loadLikeStates: async (itemIds) => {
    if (!itemIds || itemIds.length === 0) return

    set({ loading: true, error: null })
    try {
      const result = await getMultipleItemsLikeStatusAction(itemIds)
      if (result.success) {
        const { likeStates } = get()
        const newStates = { ...likeStates, ...result.items }
        set({ likeStates: newStates, loading: false })
      } else {
        set({ error: result.error, loading: false })
      }
    } catch (error) {
      console.error('Failed to load like states:', error)
      set({ error: 'Failed to load like states', loading: false })
    }
  },

  // Refresh like states for specific items
  refreshLikeStates: async (itemIds) => {
    if (!itemIds || itemIds.length === 0) return

    try {
      const result = await getMultipleItemsLikeStatusAction(itemIds)
      if (result.success) {
        const { likeStates } = get()
        const newStates = { ...likeStates, ...result.items }
        set({ likeStates: newStates })
      }
    } catch (error) {
      console.error('Failed to refresh like states:', error)
    }
  },

  // Add optimistic update for a single item
  addOptimisticUpdate: (itemId, action, likeCount) => {
    const { likeStates, optimisticUpdates } = get()
    const newOptimisticUpdates = new Set(optimisticUpdates)
    newOptimisticUpdates.add(itemId)

    const newStates = {
      ...likeStates,
      [itemId]: {
        isLiked: action === 'liked',
        likeCount: likeCount,
        isOptimistic: true
      }
    }

    set({ 
      likeStates: newStates, 
      optimisticUpdates: newOptimisticUpdates 
    })
  },

  // Remove optimistic update and apply actual result
  applyActualUpdate: (itemId, result) => {
    const { likeStates, optimisticUpdates } = get()
    const newOptimisticUpdates = new Set(optimisticUpdates)
    newOptimisticUpdates.delete(itemId)

    const newStates = {
      ...likeStates,
      [itemId]: {
        isLiked: result.isLiked,
        likeCount: result.likeCount,
        isOptimistic: false
      }
    }

    set({ 
      likeStates: newStates, 
      optimisticUpdates: newOptimisticUpdates 
    })
  },

  // Revert optimistic update on error
  revertOptimisticUpdate: (itemId, originalState) => {
    const { likeStates, optimisticUpdates } = get()
    const newOptimisticUpdates = new Set(optimisticUpdates)
    newOptimisticUpdates.delete(itemId)

    const newStates = { ...likeStates }
    if (originalState) {
      newStates[itemId] = originalState
    } else {
      delete newStates[itemId]
    }

    set({ 
      likeStates: newStates, 
      optimisticUpdates: newOptimisticUpdates 
    })
  },

  // Toggle like for a single item
  toggleLike: async (itemId) => {
    const { likeStates } = get()
    const currentState = likeStates[itemId] || { isLiked: false, likeCount: 0 }
    
    // Add optimistic update
    const newAction = currentState.isLiked ? 'unliked' : 'liked'
    const newLikeCount = currentState.isLiked 
      ? Math.max(0, currentState.likeCount - 1)
      : currentState.likeCount + 1
    
    get().addOptimisticUpdate(itemId, newAction, newLikeCount)

    try {
      const result = await toggleItemLikeAction(itemId)
      if (result.success) {
        get().applyActualUpdate(itemId, result)
        return result
      } else {
        get().revertOptimisticUpdate(itemId, currentState)
        return result
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      get().revertOptimisticUpdate(itemId, currentState)
      return { success: false, error: 'Failed to toggle like' }
    }
  },

  // Batch toggle likes for multiple items
  batchToggleLikes: async (itemIds, onProgress) => {
    if (!itemIds || itemIds.length === 0) return { success: true, results: [] }

    set({ batchOperationInProgress: true, error: null })
    const { likeStates } = get()
    const results = []
    const originalStates = {}

    try {
      // Get current states for all items
      const currentStatesResult = await getMultipleItemsLikeStatusAction(itemIds)
      let currentStates = {}
      
      if (currentStatesResult.success) {
        currentStates = currentStatesResult.items
        // Update store with current states
        const newStates = { ...likeStates, ...currentStates }
        set({ likeStates: newStates })
      }

      // Process each item with optimistic updates
      for (let i = 0; i < itemIds.length; i++) {
        const itemId = itemIds[i]
        const currentState = currentStates[itemId] || { isLiked: false, likeCount: 0 }
        originalStates[itemId] = currentState

        // Add optimistic update
        const newAction = currentState.isLiked ? 'unliked' : 'liked'
        const newLikeCount = currentState.isLiked 
          ? Math.max(0, currentState.likeCount - 1)
          : currentState.likeCount + 1
        
        get().addOptimisticUpdate(itemId, newAction, newLikeCount)

        // Execute server action
        try {
          const result = await toggleItemLikeAction(itemId)
          if (result.success) {
            get().applyActualUpdate(itemId, result)
          } else {
            get().revertOptimisticUpdate(itemId, originalStates[itemId])
          }
          results.push({ itemId, result })
        } catch (error) {
          console.error(`Error toggling like for item ${itemId}:`, error)
          get().revertOptimisticUpdate(itemId, originalStates[itemId])
          results.push({ 
            itemId, 
            result: { success: false, error: 'Failed to toggle like' } 
          })
        }

        // Call progress callback if provided
        if (onProgress) {
          onProgress(i + 1, itemIds.length)
        }
      }

      const hasErrors = results.some(({ result }) => !result.success)
      set({ batchOperationInProgress: false })
      
      return {
        success: !hasErrors,
        results,
        processedCount: results.length
      }

    } catch (error) {
      console.error('Error in batch like operation:', error)
      
      // Revert all optimistic updates on batch error
      itemIds.forEach(itemId => {
        if (originalStates[itemId]) {
          get().revertOptimisticUpdate(itemId, originalStates[itemId])
        }
      })
      
      set({ batchOperationInProgress: false, error: 'Batch operation failed' })
      return { success: false, error: 'Batch operation failed', results: [] }
    }
  },

  // Get aggregated stats for selected items
  getSelectedItemsStats: (itemIds) => {
    const { likeStates } = get()
    const selectedStates = itemIds.map(itemId => 
      likeStates[itemId] || { isLiked: false, likeCount: 0 }
    )
    
    const totalLikes = selectedStates.reduce((sum, state) => sum + state.likeCount, 0)
    const likedCount = selectedStates.filter(state => state.isLiked).length
    const hasLikedItems = likedCount > 0
    const allLiked = likedCount === itemIds.length
    
    return {
      totalLikes,
      likedCount,
      hasLikedItems,
      allLiked,
      selectedStates
    }
  },

  // Clear all like states
  clearLikeStates: () => {
    set({
      likeStates: {},
      loading: false,
      error: null,
      batchOperationInProgress: false,
      optimisticUpdates: new Set()
    })
  },

  // Clear like states for specific items
  clearItemLikeStates: (itemIds) => {
    const { likeStates, optimisticUpdates } = get()
    const newStates = { ...likeStates }
    const newOptimisticUpdates = new Set(optimisticUpdates)
    
    itemIds.forEach(itemId => {
      delete newStates[itemId]
      newOptimisticUpdates.delete(itemId)
    })
    
    set({ 
      likeStates: newStates, 
      optimisticUpdates: newOptimisticUpdates 
    })
  }
}))

export default useLikesStore

// Utility functions for common like operations
export const likeUtils = {
  // Format like count for display
  formatLikeCount: (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  },

  // Get button text based on selection and like states
  getButtonText: (selectedCount, stats, isAuthenticated, t) => {
    if (!isAuthenticated) {
      return t('likes.signInToLike', 'Sign in to like items')
    }
    
    if (selectedCount === 0) {
      return t('likes.selectItemsToLike', 'Select items to like')
    }
    
    if (selectedCount === 1) {
      const state = stats.selectedStates[0]
      return state.isLiked 
        ? t('likes.unlikeItem', 'Unlike item')
        : t('likes.likeItem', 'Like item')
    }
    
    if (stats.allLiked) {
      return t('likes.unlikeSelected', 'Unlike selected ({{count}})', { count: selectedCount })
    }
    
    if (stats.hasLikedItems) {
      return t('likes.toggleSelected', 'Toggle likes ({{count}})', { count: selectedCount })
    }
    
    return t('likes.likeSelected', 'Like selected ({{count}})', { count: selectedCount })
  },

  // Get tooltip text for like button
  getTooltipText: (selectedCount, stats, isAuthenticated, t) => {
    if (!isAuthenticated) {
      return t('likes.authenticationRequired', 'Sign in to like items')
    }
    
    if (selectedCount === 0) {
      return t('likes.selectItemsFirst', 'Select items using checkboxes to like them')
    }
    
    if (stats.totalLikes > 0) {
      return t('likes.totalLikesCount', 'Total likes: {{count}}', { count: stats.totalLikes })
    }
    
    return t('likes.likeSelectedItems', 'Like the selected items')
  }
}