"use client"

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import UserManagementTable from '@/components/admin/UserManagementTable'
import AdminToolbar from '@/components/admin/AdminToolbar'
import {
  getAllUsersAction,
  bulkBlockUsersAction,
  bulkUnblockUsersAction,
  bulkDeleteUsersAction,
  promoteToAdminAction,
  demoteFromAdminAction,
  checkAdminPermission
} from '@/lib/admin-actions'
import { useRouter } from 'next/navigation'
import useAuthStore from '@/lib/stores/auth'

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()

  // Check admin permission and load users
  useEffect(() => {
    async function initializeAdmin() {
      try {
        setLoading(true)
        setError(null)
        
        // Check if user has admin permission
        const adminCheck = await checkAdminPermission()
        if (!adminCheck.success || !adminCheck.isAdmin) {
          toast.error('Access denied: Admin privileges required')
          router.push('/dashboard')
          return
        }

        // Load all users
        const result = await getAllUsersAction()
        console.log('Fetched users:', result.users?.length, result.users)
        if (result.success) {
          setUsers(result.users)
        } else {
          setError(result.error)
          toast.error(result.error)
        }
      } catch (err) {
        setError('Failed to load admin dashboard')
        toast.error('Failed to load admin dashboard')
      } finally {
        setLoading(false)
      }
    }

    initializeAdmin()
  }, [])

  const refreshUsers = async () => {
    try {
      const result = await getAllUsersAction()
      if (result.success) {
        setUsers(result.users)
        setSelectedUsers([]) // Clear selection after refresh
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error('Failed to refresh users')
    }
  }

  const handleBulkBlock = async () => {
    try {
      const result = await bulkBlockUsersAction(selectedUsers)
      if (result.success) {
        toast.success(`Successfully blocked ${result.count} user${result.count !== 1 ? 's' : ''}`)
        await refreshUsers()
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error('Failed to block users')
    }
  }

  const handleBulkUnblock = async () => {
    try {
      const result = await bulkUnblockUsersAction(selectedUsers)
      if (result.success) {
        toast.success(`Successfully unblocked ${result.count} user${result.count !== 1 ? 's' : ''}`)
        await refreshUsers()
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error('Failed to unblock users')
    }
  }

  const handleBulkDelete = async () => {
    try {
      const result = await bulkDeleteUsersAction(selectedUsers)
      if (result.success) {
        toast.success(`Successfully deleted ${result.count} user${result.count !== 1 ? 's' : ''}`)
        await refreshUsers()
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error('Failed to delete users')
    }
  }

  const handleBulkPromote = async () => {
    try {
      // Promote users one by one since we don't have a bulk promote action
      const promises = selectedUsers.map(userId => promoteToAdminAction(userId))
      const results = await Promise.all(promises)
      
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length
      
      if (successCount > 0) {
        toast.success(`Successfully promoted ${successCount} user${successCount !== 1 ? 's' : ''} to admin`)
      }
      if (failCount > 0) {
        toast.error(`Failed to promote ${failCount} user${failCount !== 1 ? 's' : ''}`)
      }
      
      await refreshUsers()
    } catch (err) {
      toast.error('Failed to promote users')
    }
  }

  const handleBulkDemote = async () => {
    try {
      const { user: currentUser } = useAuthStore.getState()
      
      // Demote users one by one since we don't have a bulk demote action
      const promises = selectedUsers.map(userId => demoteFromAdminAction(userId))
      const results = await Promise.all(promises)
      
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length
      
      // Check if current user demoted themselves
      const selfDemotionResult = results.find(r => r.success && r.isSelfDemotion)
      
      if (successCount > 0) {
        toast.success(`Successfully demoted ${successCount} user${successCount !== 1 ? 's' : ''} from admin`)
      }
      if (failCount > 0) {
        toast.error(`Failed to demote ${failCount} user${failCount !== 1 ? 's' : ''}`)
      }
      
      // If admin demoted themselves, redirect to homepage
      if (selfDemotionResult) {
        toast.info('You have been demoted from admin. Redirecting to login...')
        setTimeout(() => {
          router.push('/')
        }, 1500)
        return
      }
      
      await refreshUsers()
    } catch (err) {
      toast.error('Failed to demote users')
    }
  }

  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/20">
        <div className="p-8 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <AdminToolbar
        selectedUsers={selectedUsers}
        onBlockUsers={handleBulkBlock}
        onUnblockUsers={handleBulkUnblock}
        onDeleteUsers={handleBulkDelete}
        onPromoteUsers={handleBulkPromote}
        onDemoteUsers={handleBulkDemote}
        loading={loading}
      />
      
      <UserManagementTable
        users={users}
        selectedUsers={selectedUsers}
        onSelectionChange={setSelectedUsers}
      />
      
      {users.length > 0 && (
        <div className="text-sm text-muted-foreground text-center pt-4">
          Total: {users.length} user{users.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}