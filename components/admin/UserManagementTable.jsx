"use client"

import { useState } from 'react'
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
  const [selectAll, setSelectAll] = useState(false)

  if (!users || users.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <p className="text-muted-foreground">No users found.</p>
        </div>
      </div>
    )
  }

  const handleSelectAll = (checked) => {
    setSelectAll(checked)
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
      setSelectAll(false)
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
      <Badge variant={role === 'ADMIN' ? 'default' : 'secondary'}>
        {role}
      </Badge>
    )
  }

  const getStatusBadge = (isBlocked) => {
    return (
      <Badge variant={isBlocked ? 'destructive' : 'outline'}>
        {isBlocked ? 'Blocked' : 'Active'}
      </Badge>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectAll}
                onCheckedChange={handleSelectAll}
                aria-label="Select all users"
              />
            </TableHead>
            <TableHead className="w-[250px]">Email</TableHead>
            <TableHead className="w-[200px]">Name</TableHead>
            <TableHead className="w-[100px]">Role</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[150px]">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelected = selectedUsers.includes(user.id)
            return (
              <TableRow 
                key={user.id} 
                className={`hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : ''}`}
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
  )
}