'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuthStore from '@/lib/stores/auth';
import useInventoryStore from '@/lib/stores/inventory';
import { requireAuth } from '@/lib/inventory-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Eye, EyeOff, Shield } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading } = useAuthStore();
  const {
    inventories,
    publicInventories,
    selectedInventories,
    selectedPublicInventories,
    loading,
    error,
    isDeleting,
    togglingVisibility,
    loadUserInventories,
    loadAllInventoriesForAdmin,
    loadPublicInventories,
    setSelectedInventories,
    setSelectedPublicInventories,
    deleteSelectedInventories,
    toggleVisibility
  } = useInventoryStore();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAuthAndLoadData() {
      if (isLoading) return;
      
      try {
        // Check authentication and redirect if needed
        await requireAuth();
        
        // First, load user inventories to get admin status
        const userInventoriesResult = await loadUserInventories();
        
        // Get admin status from the API response
        const userIsAdmin = userInventoriesResult?.isAdmin || false;
        setIsAdmin(userIsAdmin);
        
        // If user is admin, load all inventories instead of just user's own
        if (userIsAdmin) {
          await loadAllInventoriesForAdmin();
        }
        
        // Load public inventories with write access (only for non-admin users)
        if (!userIsAdmin) {
          await loadPublicInventories();
        }
      } catch (err) {
        console.error('Dashboard error:', err);
        router.push('/login');
      }
    }

    checkAuthAndLoadData();
  }, [isLoading, user, router, loadUserInventories, loadAllInventoriesForAdmin, loadPublicInventories]);

  // Handle inventory selection
  const handleInventorySelect = (inventoryId, checked) => {
    const newSelected = new Set(selectedInventories);
    if (checked) {
      newSelected.add(inventoryId);
    } else {
      newSelected.delete(inventoryId);
    }
    setSelectedInventories(newSelected);
  };

  // Handle select all inventories
  const handleSelectAllInventories = (checked) => {
    if (checked) {
      setSelectedInventories(new Set(inventories.map(inv => inv.id)));
    } else {
      setSelectedInventories(new Set());
    }
  };

  // Handle public inventory selection
  const handlePublicInventorySelect = (inventoryId, checked) => {
    const newSelected = new Set(selectedPublicInventories);
    if (checked) {
      newSelected.add(inventoryId);
    } else {
      newSelected.delete(inventoryId);
    }
    setSelectedPublicInventories(newSelected);
  };

  // Handle select all public inventories
  const handleSelectAllPublicInventories = (checked) => {
    if (checked) {
      setSelectedPublicInventories(new Set(publicInventories.map(inv => inv.id)));
    } else {
      setSelectedPublicInventories(new Set());
    }
  };

  // Handle view selected public inventories
  const handleViewPublicInventories = () => {
    if (selectedPublicInventories.size > 0) {
      const inventoryIds = Array.from(selectedPublicInventories);
      // Open first selected inventory, or could open multiple tabs
      router.push(`/inventory/${inventoryIds[0]}`);
    }
  };

  // Handle edit public inventory
  const handleEditPublicInventory = (inventoryId) => {
    router.push(`/inventory/edit?id=${inventoryId}`);
  };

  // Handle delete public inventory
  const handleDeletePublicInventory = async (inventoryId) => {
    try {
      const result = await deleteInventoryAction(inventoryId);
      if (result.success) {
        // Remove deleted inventory from public inventories state
        setPublicInventories(prev => prev.filter(inv => inv.id !== inventoryId));
        setSelectedPublicInventories(prev => {
          const newSet = new Set(prev);
          newSet.delete(inventoryId);
          return newSet;
        });
      } else {
        setError(result.error || 'Failed to delete inventory');
      }
    } catch (err) {
      setError('An unexpected error occurred while deleting inventory');
    }
  };

  // Handle edit action
  const handleEdit = () => {
    if (selectedInventories.size === 1) {
      const inventoryId = Array.from(selectedInventories)[0];
      router.push(`/inventory/edit?id=${inventoryId}`);
    }
  };

  // Handle visibility toggle
  const handleToggleVisibility = async (inventoryId) => {
    try {
      await toggleVisibility(inventoryId);
    } catch (err) {
      console.error('Toggle visibility error:', err);
    }
  };

  // Handle delete selected inventories
  const handleDeleteSelected = async () => {
    if (selectedInventories.size === 0) return;
    
    try {
      const inventoryIds = Array.from(selectedInventories);
      await deleteSelectedInventories(inventoryIds);
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error('Delete error:', err);
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {isAdmin ? 'All Inventories' : 'My Inventories'}
            </h1>
            {isAdmin && (
              <Shield className="h-6 w-6 text-amber-500" title="Admin View" />
            )}
          </div>
          <p className="text-muted-foreground">
            {isAdmin 
              ? 'Admin view: Manage all inventories in the system'
              : 'Manage and track your inventory items'
            }
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
                        onClick={handleDeleteSelected}
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
                      onCheckedChange={handleSelectAllInventories}
                      aria-label="Select all inventories"
                    />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tags</TableHead>
                  {isAdmin && <TableHead>Owner</TableHead>}
                  <TableHead>Visibility</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
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
                        onCheckedChange={(checked) => handleInventorySelect(inventory.id, checked)}
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
                    {isAdmin && (
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{inventory.users?.name || 'Unknown'}</div>
                          <div className="text-muted-foreground">{inventory.users?.email}</div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {inventory.isPublic ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
                            <Eye className="h-3 w-3" />
                            Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-700/10">
                            <EyeOff className="h-3 w-3" />
                            Private
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(inventory.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleVisibility(inventory.id)}
                        disabled={togglingVisibility.has(inventory.id) || (!isAdmin && inventory.ownerId !== user?.id)}
                        className="h-8 px-2"
                      >
                        {togglingVisibility.has(inventory.id) ? (
                          'Updating...'
                        ) : inventory.isPublic ? (
                          <><EyeOff className="h-3 w-3 mr-1" />Make Private</>
                        ) : (
                          <><Eye className="h-3 w-3 mr-1" />Make Public</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Public Inventories Toolbar */}
      {!isAdmin && publicInventories && publicInventories.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {selectedPublicInventories.size} of {publicInventories.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedPublicInventories.size === 1) {
                      const inventoryId = Array.from(selectedPublicInventories)[0];
                      handleEditPublicInventory(inventoryId);
                    }
                  }}
                  disabled={selectedPublicInventories.size !== 1}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedPublicInventories.size === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedPublicInventories.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the selected public inventory(ies) and all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          const deletePromises = Array.from(selectedPublicInventories).map(inventoryId => 
                            handleDeletePublicInventory(inventoryId)
                          );
                          await Promise.all(deletePromises);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Public Inventories with Write Access Table (for non-admin users) */}
      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Public Inventories with Write Access</CardTitle>
            <CardDescription>
              {publicInventories && publicInventories.length > 0 
                ? `You have write access to ${publicInventories.length} public inventor${publicInventories.length === 1 ? "y" : "ies"}`
                : "No public inventories with write access found"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!publicInventories || publicInventories.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-4">
                  <div className="text-4xl mb-4">🌐</div>
                  <h3 className="text-lg font-semibold mb-2">No public inventories available</h3>
                  <p className="text-sm">
                    When other users make their inventories public, you will be able to add, edit, and delete items in them.
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedPublicInventories.size === publicInventories.length && publicInventories.length > 0}
                        onCheckedChange={handleSelectAllPublicInventories}
                        aria-label="Select all public inventories"
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Created</TableHead>
                    
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {publicInventories.map((inventory) => (
                    <TableRow 
                      key={inventory.id}
                      className={selectedPublicInventories.has(inventory.id) ? 'bg-muted/50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedPublicInventories.has(inventory.id)}
                          onCheckedChange={(checked) => handlePublicInventorySelect(inventory.id, checked)}
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
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{inventory.users?.name || 'Unknown'}</div>
                          <div className="text-muted-foreground">{inventory.users?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(inventory.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          
                          
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}