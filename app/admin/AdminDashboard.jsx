"use client"

import { useEffect } from 'react'
import { toast } from 'sonner'
import UserManagementTable from '@/components/admin/UserManagementTable'
import AdminToolbar from '@/components/admin/AdminToolbar'
import { checkAdminPermission } from '@/lib/admin-actions'
import { useRouter } from 'next/navigation'
import useAuthStore from '@/lib/stores/auth'
import useAdminStore from '@/lib/stores/admin'

export default function AdminDashboard() {
  const {
    users,
    selectedUsers,
    loading,
    error,
    isAdmin,
    operationLoading,
    checkAdminStatus,
    loadAllUsers,
    bulkBlock,
    bulkUnblock,
    bulkDelete,
    bulkPromote,
    bulkDemote,
    setSelectedUsers,
    clearAll
  } = useAdminStore()
  const router = useRouter()

  // Check admin permission and load users
  useEffect(() => {
    async function initializeAdmin() {
      try {
        // Check if user has admin permission
        const adminCheck = await checkAdminPermission()
        if (!adminCheck.success || !adminCheck.isAdmin) {
          toast.error('Access denied: Admin privileges required')
          router.push('/dashboard')
          return
        }

        // Load admin status and all users
        await checkAdminStatus()
        await loadAllUsers()
      } catch (err) {
        toast.error('Failed to load admin dashboard')
      }
    }

    initializeAdmin()
  }, [checkAdminStatus, loadAllUsers, router])

  const refreshUsers = async () => {
    try {
      await loadAllUsers()
    } catch (err) {
      toast.error('Failed to refresh users')
    }
  }

  const handleBulkBlock = async () => {
    try {
      await bulkBlock(selectedUsers)
      toast.success(`Successfully blocked ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`)
    } catch (err) {
      toast.error('Failed to block users')
    }
  }

  const handleBulkUnblock = async () => {
    try {
      await bulkUnblock(selectedUsers)
      toast.success(`Successfully unblocked ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`)
    } catch (err) {
      toast.error('Failed to unblock users')
    }
  }

  const handleBulkDelete = async () => {
    try {
      await bulkDelete(selectedUsers)
      toast.success(`Successfully deleted ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`)
    } catch (err) {
      toast.error('Failed to delete users')
    }
  }

  const handleBulkPromote = async () => {
    try {
      await bulkPromote(selectedUsers)
      toast.success(`Successfully promoted ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''} to admin`)
    } catch (err) {
      toast.error('Failed to promote users')
    }
  }

  const handleBulkDemote = async () => {
    try {
      const result = await bulkDemote(selectedUsers)
      toast.success(`Successfully demoted ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''} from admin`)
      
      // If admin demoted themselves, redirect to homepage
      if (result?.isSelfDemotion) {
        toast.info('You have been demoted from admin. Redirecting to login...')
        setTimeout(() => {
          router.push('/')
        }, 1500)
        return
      }
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
        loading={operationLoading}
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