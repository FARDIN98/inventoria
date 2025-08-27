import { create } from 'zustand'
import {
  getAllUsersAction,
  bulkBlockUsersAction,
  bulkUnblockUsersAction,
  bulkDeleteUsersAction,
  promoteToAdminAction,
  demoteFromAdminAction,
  checkAdminPermission
} from '@/lib/admin-actions'

/**
 * Admin store for managing admin dashboard state
 * Handles users list, selection states, and bulk operations
 */
const useAdminStore = create((set, get) => ({
  // State
  users: [],
  _selectedUsersSet: new Set(), // Internal Set for performance
  selectedUsers: [], // Array for React components
  loading: false,
  error: null,
  isAdmin: false,
  operationLoading: false,

  // Actions
  setUsers: (users) => set({ users }),
  setSelectedUsers: (selectedUsers) => {
    // Handle both array and Set input
    const newSet = Array.isArray(selectedUsers) 
      ? new Set(selectedUsers) 
      : selectedUsers instanceof Set 
        ? selectedUsers 
        : new Set()
    const newArray = Array.from(newSet)
    set({ _selectedUsersSet: newSet, selectedUsers: newArray })
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setOperationLoading: (operationLoading) => set({ operationLoading }),

  // Check admin permission
  checkAdminStatus: async () => {
    try {
      const result = await checkAdminPermission()
      set({ isAdmin: result.success && result.isAdmin })
      return result.success && result.isAdmin
    } catch (error) {
      set({ isAdmin: false })
      return false
    }
  },

  // Load all users
  loadUsers: async () => {
    set({ loading: true, error: null })
    try {
      const result = await getAllUsersAction()
      if (result.success) {
        set({ users: result.users, loading: false })
      } else {
        set({ error: result.error, loading: false })
      }
    } catch (error) {
      set({ error: 'Failed to load users', loading: false })
    }
  },

  // Bulk block users
  bulkBlockUsers: async () => {
    const { _selectedUsersSet, users } = get()
    if (_selectedUsersSet.size === 0) return { success: false, error: 'No users selected' }

    set({ operationLoading: true })
    try {
      const userIds = Array.from(_selectedUsersSet)
      const result = await bulkBlockUsersAction(userIds)
      
      if (result.success) {
        // Update users in the store
        const updatedUsers = users.map(user => 
          userIds.includes(user.id) 
            ? { ...user, isBlocked: true }
            : user
        )
        set({ 
          users: updatedUsers, 
          _selectedUsersSet: new Set(),
          selectedUsers: [],
          operationLoading: false 
        })
      } else {
        set({ operationLoading: false })
      }
      
      return result
    } catch (error) {
      set({ operationLoading: false })
      return { success: false, error: 'Failed to block users' }
    }
  },

  // Bulk unblock users
  bulkUnblockUsers: async () => {
    const { _selectedUsersSet, users } = get()
    if (_selectedUsersSet.size === 0) return { success: false, error: 'No users selected' }

    set({ operationLoading: true })
    try {
      const userIds = Array.from(_selectedUsersSet)
      const result = await bulkUnblockUsersAction(userIds)
      
      if (result.success) {
        // Update users in the store
        const updatedUsers = users.map(user => 
          userIds.includes(user.id) 
            ? { ...user, isBlocked: false }
            : user
        )
        set({ 
          users: updatedUsers, 
          _selectedUsersSet: new Set(),
          selectedUsers: [],
          operationLoading: false 
        })
      } else {
        set({ operationLoading: false })
      }
      
      return result
    } catch (error) {
      set({ operationLoading: false })
      return { success: false, error: 'Failed to unblock users' }
    }
  },

  // Bulk delete users
  bulkDeleteUsers: async () => {
    const { _selectedUsersSet, users } = get()
    if (_selectedUsersSet.size === 0) return { success: false, error: 'No users selected' }

    set({ operationLoading: true })
    try {
      const userIds = Array.from(_selectedUsersSet)
      const result = await bulkDeleteUsersAction(userIds)
      
      if (result.success) {
        // Remove deleted users from the store
        const updatedUsers = users.filter(user => !userIds.includes(user.id))
        set({ 
          users: updatedUsers, 
          _selectedUsersSet: new Set(),
          selectedUsers: [],
          operationLoading: false 
        })
      } else {
        set({ operationLoading: false })
      }
      
      return result
    } catch (error) {
      set({ operationLoading: false })
      return { success: false, error: 'Failed to delete users' }
    }
  },

  // Promote user to admin
  promoteToAdmin: async (userId) => {
    const { users } = get()
    set({ operationLoading: true })
    
    try {
      const result = await promoteToAdminAction(userId)
      
      if (result.success) {
        // Update user role in the store
        const updatedUsers = users.map(user => 
          user.id === userId 
            ? { ...user, role: 'ADMIN' }
            : user
        )
        set({ users: updatedUsers, operationLoading: false })
      } else {
        set({ operationLoading: false })
      }
      
      return result
    } catch (error) {
      set({ operationLoading: false })
      return { success: false, error: 'Failed to promote user' }
    }
  },

  // Demote user from admin
  demoteFromAdmin: async (userId) => {
    const { users } = get()
    set({ operationLoading: true })
    
    try {
      const result = await demoteFromAdminAction(userId)
      
      if (result.success) {
        // Update user role in the store
        const updatedUsers = users.map(user => 
          user.id === userId 
            ? { ...user, role: 'USER' }
            : user
        )
        set({ users: updatedUsers, operationLoading: false })
      } else {
        set({ operationLoading: false })
      }
      
      return result
    } catch (error) {
      set({ operationLoading: false })
      return { success: false, error: 'Failed to demote user' }
    }
  },

  // Toggle user selection
  toggleUserSelection: (userId) => {
    const { _selectedUsersSet } = get()
    const newSelection = new Set(_selectedUsersSet)
    
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    
    const newArray = Array.from(newSelection)
    set({ _selectedUsersSet: newSelection, selectedUsers: newArray })
  },

  // Select all users
  selectAllUsers: () => {
    const { users } = get()
    const allUserIds = new Set(users.map(user => user.id))
    const allUserIdsArray = Array.from(allUserIds)
    set({ _selectedUsersSet: allUserIds, selectedUsers: allUserIdsArray })
  },

  // Clear selection
  clearSelection: () => {
    set({ _selectedUsersSet: new Set(), selectedUsers: [] })
  },

  // Clear all state
  clearState: () => {
    set({
      users: [],
      _selectedUsersSet: new Set(),
      selectedUsers: [],
      loading: false,
      error: null,
      isAdmin: false,
      operationLoading: false
    })
  },

  // Method aliases for AdminDashboard.jsx compatibility
  loadAllUsers: async () => {
    const { loadUsers } = get()
    return loadUsers()
  },
  bulkBlock: async (selectedUsers) => {
    const { bulkBlockUsers } = get()
    return bulkBlockUsers()
  },
  bulkUnblock: async (selectedUsers) => {
    const { bulkUnblockUsers } = get()
    return bulkUnblockUsers()
  },
  bulkDelete: async (selectedUsers) => {
    const { bulkDeleteUsers } = get()
    return bulkDeleteUsers()
  },
  bulkPromote: async (selectedUsers) => {
    const { promoteToAdmin } = get()
    const results = await Promise.all(Array.from(selectedUsers).map(userId => promoteToAdmin(userId)))
    return results.every(r => r.success) ? { success: true } : { success: false, error: 'Some promotions failed' }
  },
  bulkDemote: async (selectedUsers) => {
    const { demoteFromAdmin } = get()
    const results = await Promise.all(Array.from(selectedUsers).map(userId => demoteFromAdmin(userId)))
    return results.every(r => r.success) ? { success: true } : { success: false, error: 'Some demotions failed' }
  },
  clearAll: () => {
    const { clearState } = get()
    return clearState()
  }
}))

export default useAdminStore