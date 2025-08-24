'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuthStore from '@/lib/stores/auth';
import { getUserInventoriesAction, requireAuth, deleteInventoryAction } from '@/lib/inventory-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInventories, setSelectedInventories] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  // Handle inventory selection
  const handleSelectInventory = (inventoryId, checked) => {
    const newSelected = new Set(selectedInventories);
    if (checked) {
      newSelected.add(inventoryId);
    } else {
      newSelected.delete(inventoryId);
    }
    setSelectedInventories(newSelected);
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedInventories(new Set(inventories.map(inv => inv.id)));
    } else {
      setSelectedInventories(new Set());
    }
  };

  // Handle edit action
  const handleEdit = () => {
    if (selectedInventories.size === 1) {
      const inventoryId = Array.from(selectedInventories)[0];
      router.push(`/inventory/edit?id=${inventoryId}`);
    }
  };

  // Handle delete action
  const handleDelete = async () => {
    if (selectedInventories.size === 0) return;
    
    setIsDeleting(true);
    const deletePromises = Array.from(selectedInventories).map(async (inventoryId) => {
      const result = await deleteInventoryAction(inventoryId);
      if (!result.success) {
        console.error(`Failed to delete inventory ${inventoryId}:`, result.error);
        return { inventoryId, error: result.error };
      }
      return { inventoryId, success: true };
    });

    try {
      const results = await Promise.all(deletePromises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        setError(`Failed to delete some inventories: ${errors.map(e => e.error).join(', ')}`);
      } else {
        // Remove deleted inventories from state
        setInventories(prev => prev.filter(inv => !selectedInventories.has(inv.id)));
        setSelectedInventories(new Set());
      }
    } catch (err) {
      setError('An unexpected error occurred while deleting inventories');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

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

      {/* Toolbar */}
      {inventories && inventories.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {selectedInventories.size} of {inventories.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  disabled={selectedInventories.size !== 1}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedInventories.size === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedInventories.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the selected inventory(ies) and all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          <CardTitle>Inventory</CardTitle>
          <CardDescription>
            {inventories && inventories.length > 0 
              ? `You have ${inventories.length} inventory${inventories.length === 1 ? '' : 's'}`
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
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedInventories.size === inventories.length && inventories.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all inventories"
                    />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventories && inventories.map((inventory) => (
                  <TableRow 
                    key={inventory.id}
                    className={selectedInventories.has(inventory.id) ? 'bg-muted/50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedInventories.has(inventory.id)}
                        onCheckedChange={(checked) => handleSelectInventory(inventory.id, checked)}
                        aria-label={`Select ${inventory.title}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link 
                        href={`/inventory/${inventory.id}`}
                        className="hover:underline text-primary"
                      >
                        {inventory.title}
                      </Link>
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