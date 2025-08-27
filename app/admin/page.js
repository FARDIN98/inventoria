import { Suspense } from 'react'
import AdminDashboard from './AdminDashboard'

export const metadata = {
  title: 'Admin Dashboard - Inventoria',
  description: 'User management and administration'
}

export default function AdminPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage users, roles, and system administration
        </p>
      </div>
      
      <Suspense fallback={
        <div className="rounded-md border">
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        </div>
      }>
        <AdminDashboard />
      </Suspense>
    </div>
  )
}