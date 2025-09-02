"use client"

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import UserManagementTable from '@/components/admin/UserManagementTable'
import AdminToolbar from '@/components/admin/AdminToolbar'
import { checkAdminPermission } from '@/lib/admin-actions'
import { useRouter } from 'next/navigation'
import useAuthStore from '@/lib/stores/auth'
import useAdminStore from '@/lib/stores/admin'

export default function AdminDashboard() {
  const { t } = useTranslation()
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
          toast.error(t('admin.accessDenied'))
          router.push('/dashboard')
          return
        }

        // Load admin status and all users
        await checkAdminStatus()
        await loadAllUsers()
      } catch (err) {
        toast.error(t('admin.failedToLoad'))
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
      <div className="rounded-xl border bg-gradient-to-br from-white/90 to-amber-50/80 dark:from-slate-900/90 dark:to-amber-950/80 border-amber-200/50 dark:border-amber-800/30 shadow-xl backdrop-blur-sm">
        <div className="p-8 text-center">
          <p className="text-muted-foreground">{t('admin.loadingDashboard')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-gradient-to-br from-red-50/90 to-pink-50/80 dark:from-red-950/90 dark:to-pink-950/80 border-red-200/50 dark:border-red-800/30 shadow-xl backdrop-blur-sm">
        <div className="p-8 text-center">
          <p className="text-destructive mb-4 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {t('admin.tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-white/90 to-amber-50/80 dark:from-slate-900/90 dark:to-amber-950/80 border-amber-200/50 dark:border-amber-800/30 shadow-xl backdrop-blur-sm rounded-xl border">
        <AdminToolbar
          selectedUsers={selectedUsers}
          onBlockUsers={handleBulkBlock}
          onUnblockUsers={handleBulkUnblock}
          onDeleteUsers={handleBulkDelete}
          onPromoteUsers={handleBulkPromote}
          onDemoteUsers={handleBulkDemote}
          loading={operationLoading}
        />
      </div>
      
      <div className="bg-gradient-to-br from-white/90 to-orange-50/80 dark:from-slate-900/90 dark:to-orange-950/80 border-orange-200/50 dark:border-orange-800/30 shadow-xl backdrop-blur-sm rounded-xl border">
        <UserManagementTable
          users={users}
          selectedUsers={selectedUsers}
          onSelectionChange={setSelectedUsers}
        />
      </div>
      
      {users.length > 0 && (
        <div className="text-sm text-muted-foreground text-center pt-4 p-4 bg-gradient-to-r from-slate-100/80 to-amber-100/80 dark:from-slate-800/80 dark:to-amber-900/80 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
          {t('admin.totalUsers', { count: users.length })}
        </div>
      )}
    </div>
  )
}