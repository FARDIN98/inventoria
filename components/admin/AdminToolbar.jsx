"use client"

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { 
  Shield, 
  ShieldOff, 
  Trash2, 
  UserPlus, 
  UserMinus,
  Users
} from 'lucide-react'

export default function AdminToolbar({ 
  selectedUsers, 
  onBlockUsers, 
  onUnblockUsers, 
  onDeleteUsers, 
  onPromoteUsers, 
  onDemoteUsers,
  loading 
}) {
  const { t } = useTranslation()
  const [actionLoading, setActionLoading] = useState(null)
  const selectedCount = selectedUsers.length

  const handleAction = async (action, actionName) => {
    setActionLoading(actionName)
    try {
      await action()
    } finally {
      setActionLoading(null)
    }
  }

  if (selectedCount === 0) {
    return (
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {t('admin.selectUsersForActions')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b bg-muted/30 gap-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        <span className="text-sm font-medium">
          {t('admin.usersSelected', { count: selectedCount })}
        </span>
      </div>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Block Users */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={loading || actionLoading}
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              {t('admin.block')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.blockUsers')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.blockUsersConfirm', { count: selectedCount })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction(onBlockUsers, 'block')}
                disabled={actionLoading === 'block'}
              >
                {actionLoading === 'block' ? t('admin.blocking') : t('admin.blockUsers')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Unblock Users */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={loading || actionLoading}
            >
              <Shield className="h-4 w-4 mr-2" />
              {t('admin.unblock')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.unblockUsers')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.unblockUsersConfirm', { count: selectedCount })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction(onUnblockUsers, 'unblock')}
                disabled={actionLoading === 'unblock'}
              >
                {actionLoading === 'unblock' ? t('admin.unblocking') : t('admin.unblockUsers')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Promote to Admin */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={loading || actionLoading}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('admin.promote')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.promoteToAdmin')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.promoteUsersConfirm', { count: selectedCount })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction(onPromoteUsers, 'promote')}
                disabled={actionLoading === 'promote'}
              >
                {actionLoading === 'promote' ? t('admin.promoting') : t('admin.promoteUsers')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Demote from Admin */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={loading || actionLoading}
            >
              <UserMinus className="h-4 w-4 mr-2" />
              {t('admin.demote')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.demoteFromAdmin')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.demoteUsersConfirm', { count: selectedCount })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction(onDemoteUsers, 'demote')}
                disabled={actionLoading === 'demote'}
              >
                {actionLoading === 'demote' ? t('admin.demoting') : t('admin.demoteUsers')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Users */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              size="sm"
              disabled={loading || actionLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('admin.delete')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.deleteUsers')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.deleteUsersConfirm', { count: selectedCount })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction(onDeleteUsers, 'delete')}
                disabled={actionLoading === 'delete'}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {actionLoading === 'delete' ? t('admin.deleting') : t('admin.deleteUsers')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}