"use client"

import { useState } from 'react'
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
            Select users to perform bulk actions
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-4 border-b bg-muted/30">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        <span className="text-sm font-medium">
          {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Block Users */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={loading || actionLoading}
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              Block
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Block Users</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to block {selectedCount} user{selectedCount !== 1 ? 's' : ''}? 
                Blocked users will not be able to access the application.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction(onBlockUsers, 'block')}
                disabled={actionLoading === 'block'}
              >
                {actionLoading === 'block' ? 'Blocking...' : 'Block Users'}
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
              Unblock
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unblock Users</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unblock {selectedCount} user{selectedCount !== 1 ? 's' : ''}? 
                Unblocked users will regain access to the application.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction(onUnblockUsers, 'unblock')}
                disabled={actionLoading === 'unblock'}
              >
                {actionLoading === 'unblock' ? 'Unblocking...' : 'Unblock Users'}
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
              Promote
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Promote to Admin</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to promote {selectedCount} user{selectedCount !== 1 ? 's' : ''} to admin role? 
                Admin users will have full access to the application.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction(onPromoteUsers, 'promote')}
                disabled={actionLoading === 'promote'}
              >
                {actionLoading === 'promote' ? 'Promoting...' : 'Promote Users'}
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
              Demote
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Demote from Admin</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to demote {selectedCount} user{selectedCount !== 1 ? 's' : ''} from admin role? 
                They will lose admin privileges.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction(onDemoteUsers, 'demote')}
                disabled={actionLoading === 'demote'}
              >
                {actionLoading === 'demote' ? 'Demoting...' : 'Demote Users'}
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
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Users</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete {selectedCount} user{selectedCount !== 1 ? 's' : ''}? 
                This action cannot be undone and will remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction(onDeleteUsers, 'delete')}
                disabled={actionLoading === 'delete'}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {actionLoading === 'delete' ? 'Deleting...' : 'Delete Users'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}