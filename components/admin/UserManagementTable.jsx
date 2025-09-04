"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

export default function UserManagementTable({ users, selectedUsers, onSelectionChange }) {
  if (!users || users.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-800/50 dark:to-blue-950/30 border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm rounded-xl">
        <div className="p-12 text-center">
          <div className="text-6xl mb-6">👥</div>
          <h3 className="text-xl font-semibold mb-3 bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-100 bg-clip-text text-transparent">
            No users found
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            No users available at the moment.
          </p>
        </div>
      </div>
    )
  }

  // Calculate selectAll state based on current selection
  const allSelected = users.length > 0 && selectedUsers.length === users.length
  const someSelected = selectedUsers.length > 0 && selectedUsers.length < users.length

  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(users.map(user => user.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectUser = (userId, checked) => {
    if (checked) {
      onSelectionChange([...selectedUsers, userId])
    } else {
      onSelectionChange(selectedUsers.filter(id => id !== userId))
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getRoleBadge = (role) => {
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm border transition-transform duration-200 hover:scale-105 ${
        role === 'ADMIN' 
          ? 'bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/60 dark:to-indigo-900/60 text-purple-800 dark:text-purple-200 border-purple-200/50 dark:border-purple-700/50'
          : 'bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-900/60 dark:to-slate-900/60 text-gray-800 dark:text-gray-200 border-gray-200/50 dark:border-gray-700/50'
      }`}>
        {role}
      </span>
    )
  }

  const getStatusBadge = (isBlocked) => {
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm border transition-transform duration-200 hover:scale-105 ${
        isBlocked 
          ? 'bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/60 dark:to-pink-900/60 text-red-800 dark:text-red-200 border-red-200/50 dark:border-red-700/50'
          : 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/60 dark:to-emerald-900/60 text-green-800 dark:text-green-200 border-green-200/50 dark:border-green-700/50'
      }`}>
        {isBlocked ? 'Blocked' : 'Active'}
      </span>
    )
  }

  return (
    <div className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-800/50 dark:to-blue-950/30 border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm rounded-xl overflow-hidden">
      {/* Mobile responsive wrapper with horizontal scroll */}
      <div className="overflow-x-auto lg:overflow-x-visible">
        <Table className="min-w-[800px] lg:min-w-full">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/30 dark:to-purple-950/30 border-b border-slate-200/50 dark:border-slate-700/50">
              <TableHead className="w-[50px] min-w-[50px] font-bold text-slate-700 dark:text-slate-200">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all users"
                />
              </TableHead>
              <TableHead className="w-[250px] min-w-[200px] font-bold text-slate-700 dark:text-slate-200">Email</TableHead>
              <TableHead className="w-[200px] min-w-[150px] font-bold text-slate-700 dark:text-slate-200">Name</TableHead>
              <TableHead className="w-[100px] min-w-[80px] font-bold text-slate-700 dark:text-slate-200">Role</TableHead>
              <TableHead className="w-[100px] min-w-[80px] font-bold text-slate-700 dark:text-slate-200">Status</TableHead>
              <TableHead className="w-[150px] min-w-[120px] font-bold text-slate-700 dark:text-slate-200">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelected = selectedUsers.includes(user.id)
              return (
                <TableRow 
                  key={user.id} 
                  className={`transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-950/30 dark:hover:to-purple-950/30 hover:scale-[1.01] hover:shadow-lg ${isSelected ? 'bg-gradient-to-r from-blue-100/60 to-purple-100/60 dark:from-blue-900/40 dark:to-purple-900/40 shadow-sm' : ''}`}
                >
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectUser(user.id, checked)}
                    aria-label={`Select user ${user.email}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="text-sm">{user.email}</span>
                    {user.id && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {user.id.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {user.name || 'No name'}
                  </span>
                </TableCell>
                <TableCell>
                  {getRoleBadge(user.role)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(user.isBlocked)}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </span>
                </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}