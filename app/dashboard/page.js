'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuthStore from '@/lib/stores/auth';
import { getUserInventoriesAction, requireAuth } from '@/lib/inventory-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkAuthAndLoadData() {
      if (isLoading) return;
      
      try {
        // Check authentication and redirect if needed
        await requireAuth();
        
        // Load user inventories
        const result = await getUserInventoriesAction();
        if (result.success) {
          setInventories(result.inventories || []);
        } else {
          setError(result.error || 'Failed to load inventories');
        }
      } catch (err) {
        console.error('Dashboard error:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndLoadData();
  }, [isLoading, router]);

  if (isLoading || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Inventories</h1>
          <p className="text-muted-foreground">
            Manage and track your inventory items
          </p>
        </div>
        <Link href="/inventory/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Inventory
          </Button>
        </Link>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Inventories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            {inventories && inventories.length > 0 
              ? `You have ${inventories.length} inventory item${inventories.length === 1 ? '' : 's'}`
              : 'No inventory items found'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!inventories || inventories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-semibold mb-2">No inventories yet</h3>
                <p className="text-sm mb-4">
                  Get started by creating your first inventory item
                </p>
              </div>
              <Link href="/inventory/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Inventory
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventories && inventories.map((inventory) => (
                  <TableRow key={inventory.id}>
                    <TableCell className="font-medium">
                      {inventory.title}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {inventory.description || 'No description'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {inventory.categories?.name || 'Uncategorized'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {inventory.inventory_tags && inventory.inventory_tags.length > 0 ? (
                          inventory.inventory_tags.map((tagRelation, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
                            >
                              {tagRelation.tags?.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">No tags</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(inventory.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}