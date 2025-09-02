'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import useAuthStore from '@/lib/stores/auth';
import useDashboardStore from '@/lib/stores/dashboard';
import { requireAuth } from '@/lib/inventory-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Eye, EyeOff, Shield } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();
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
    isAdmin,
    loadDashboardData,
    handleInventorySelect,
    handleSelectAllInventories,
    handlePublicInventorySelect,
    handleSelectAllPublicInventories,
    deleteSelectedInventories,
    toggleVisibility,
    deletePublicInventory,
    handleWindowResize,
    cleanup
  } = useDashboardStore();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Memoized auth and data loading
  const checkAuthAndLoadData = useCallback(async () => {
    if (isLoading) return;
    
    try {
      // Check authentication and redirect if needed
      await requireAuth();
      
      // Load dashboard data with caching
      await loadDashboardData();
    } catch (err) {
      console.error('Dashboard error:', err);
      router.push('/login');
    }
  }, [isLoading, loadDashboardData, router]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  // Window resize handling with debouncing
  useEffect(() => {
    const handleResize = () => handleWindowResize();
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cleanup(); // Clean up any pending timeouts
    };
  }, [handleWindowResize, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Memoized handlers to prevent unnecessary re-renders
  const memoizedHandleInventorySelect = useCallback((inventoryId, checked) => {
    handleInventorySelect(inventoryId, checked);
  }, [handleInventorySelect]);

  const memoizedHandleSelectAllInventories = useCallback((checked) => {
    handleSelectAllInventories(checked);
  }, [handleSelectAllInventories]);

  const memoizedHandlePublicInventorySelect = useCallback((inventoryId, checked) => {
    handlePublicInventorySelect(inventoryId, checked);
  }, [handlePublicInventorySelect]);

  const memoizedHandleSelectAllPublicInventories = useCallback((checked) => {
    handleSelectAllPublicInventories(checked);
  }, [handleSelectAllPublicInventories]);

  // Memoized action handlers
  const handleViewPublicInventories = useCallback(() => {
    if (selectedPublicInventories.size > 0) {
      const inventoryIds = Array.from(selectedPublicInventories);
      router.push(`/inventory/${inventoryIds[0]}`);
    }
  }, [selectedPublicInventories, router]);

  const handleEditPublicInventory = useCallback((inventoryId) => {
    router.push(`/inventory/edit?id=${inventoryId}`);
  }, [router]);

  const handleEdit = useCallback(() => {
    if (selectedInventories.size === 1) {
      const inventoryId = Array.from(selectedInventories)[0];
      router.push(`/inventory/edit?id=${inventoryId}`);
    }
  }, [selectedInventories, router]);

  const handleToggleVisibility = useCallback(async (inventoryId) => {
    try {
      await toggleVisibility(inventoryId);
    } catch (err) {
      console.error('Toggle visibility error:', err);
    }
  }, [toggleVisibility]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedInventories.size === 0) return;
    
    try {
      await deleteSelectedInventories();
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error('Delete error:', err);
    }
  }, [selectedInventories, deleteSelectedInventories]);

  const handleDeletePublicInventoryAction = useCallback(async (inventoryId) => {
    try {
      await deletePublicInventory(inventoryId);
    } catch (err) {
      console.error('Delete public inventory error:', err);
    }
  }, [deletePublicInventory]);

  if (isLoading || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">{t('common.loading')}</div>
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
              {isAdmin ? t('dashboard.adminTitle') : t('dashboard.title')}
            </h1>
            {isAdmin && (
              <Shield className="h-6 w-6 text-amber-500" title="Admin View" />
            )}
          </div>
          <p className="text-muted-foreground">
            {isAdmin 
              ? t('dashboard.adminDescription')
        : t('dashboard.description')
            }
          </p>
        </div>
        <Link href="/inventory/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('actions.createNew')}
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
                  {t('actions.edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedInventories.size === 1) {
                      const inventoryId = Array.from(selectedInventories)[0];
                      handleToggleVisibility(inventoryId);
                    }
                  }}
                  disabled={selectedInventories.size !== 1 || (selectedInventories.size === 1 && (() => {
                    const inventoryId = Array.from(selectedInventories)[0];
                    const inventory = inventories.find(inv => inv.id === inventoryId);
                    return togglingVisibility.has(inventoryId) || (!isAdmin && inventory?.ownerId !== user?.id);
                  })())}
                >
                  {selectedInventories.size === 1 && (() => {
                    const inventoryId = Array.from(selectedInventories)[0];
                    const inventory = inventories.find(inv => inv.id === inventoryId);
                    if (togglingVisibility.has(inventoryId)) {
                      return t('common.updating');
                    }
                    return inventory?.isPublic ? (
                      <><EyeOff className="h-4 w-4 mr-2" />{t('actions.makePrivate')}</>
                    ) : (
                      <><Eye className="h-4 w-4 mr-2" />{t('actions.makePublic')}</>
                    );
                  })()}
                </Button>
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={selectedInventories.size === 0}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('actions.delete')} ({selectedInventories.size})
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('dialogs.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('dialogs.deleteDescription', { count: selectedInventories.size })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? t('actions.deleting') : t('actions.delete')}
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
          <CardTitle>{t('dashboard.title')}</CardTitle>
          <CardDescription>
            {inventories && inventories.length > 0 
              ? t('dashboard.inventoryCount', { count: inventories.length })
            : t('dashboard.noInventoryItems')
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!inventories || inventories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-semibold mb-2">{t('dashboard.noInventories')}</h3>
                <p className="text-sm mb-4">
                  {isAdmin 
                    ? t('dashboard.noInventoriesAdmin')
              : t('dashboard.noInventoriesUser')
                  }
                </p>
              </div>
              <Link href="/inventory/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('actions.createFirst')}
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
                      onCheckedChange={memoizedHandleSelectAllInventories}
                      aria-label="Select all inventories"
                    />
                  </TableHead>
                  <TableHead>{t('forms.title')}</TableHead>
              <TableHead>{t('forms.description')}</TableHead>
              <TableHead>{t('forms.category')}</TableHead>
              <TableHead>{t('forms.tags')}</TableHead>
              <TableHead>{t('common.owner')}</TableHead>
              <TableHead>{t('common.visibility')}</TableHead>
              <TableHead>{t('common.created')}</TableHead>
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
                        onCheckedChange={(checked) => memoizedHandleInventorySelect(inventory.id, checked)}
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
                      {inventory.description || t('common.noDescription')}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {inventory.categories?.name || t('common.uncategorized')}
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
                            <span className="text-muted-foreground text-xs">{t('common.noTags')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{inventory.users?.name || t('common.unknown')}</div>
                          <div className="text-muted-foreground">{inventory.users?.email}</div>
                        </div>
                      </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {inventory.isPublic ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
                            <Eye className="h-3 w-3" />
                            {t('common.public')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-700/10">
                            <EyeOff className="h-3 w-3" />
                            {t('common.private')}
                          </span>
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

      {/* Public Inventories Toolbar */}
      {!isAdmin && publicInventories && publicInventories.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {t('common.selectedCount', { selected: selectedPublicInventories.size, total: publicInventories.length })}
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
                    {t('actions.edit')}
                  </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedPublicInventories.size === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('actions.delete')} ({selectedPublicInventories.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('dialogs.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('dialogs.deleteDescription', { count: selectedPublicInventories.size })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          const deletePromises = Array.from(selectedPublicInventories).map(inventoryId => 
                            handleDeletePublicInventoryAction(inventoryId)
                          );
                          await Promise.all(deletePromises);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t('actions.delete')}
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
            <CardTitle>{t('dashboard.publicInventoriesWithAccess')}</CardTitle>
            {/* <CardDescription>
              {publicInventories && publicInventories.length > 0 
                ? t('dashboard.writeAccessCount', 'Public inventories with write access', { count: publicInventories.length })
                : t('dashboard.noPublicInventoriesWithAccess')
              }
            </CardDescription> */}
          </CardHeader>
          <CardContent>
            {!publicInventories || publicInventories.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-4">
                  <div className="text-4xl mb-4">🌐</div>
                  <h3 className="text-lg font-semibold mb-2">{t('dashboard.noPublicInventories')}</h3>
                  <p className="text-sm">
                    {t('dashboard.noPublicInventoriesDescription')}
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
                        onCheckedChange={memoizedHandleSelectAllPublicInventories}
                        aria-label="Select all public inventories"
                      />
                    </TableHead>
                    <TableHead>{t('forms.title')}</TableHead>
              <TableHead>{t('forms.description')}</TableHead>
              <TableHead>{t('forms.category')}</TableHead>
              <TableHead>{t('forms.tags')}</TableHead>
              <TableHead>{t('common.owner')}</TableHead>
              <TableHead>{t('common.created')}</TableHead>
                    
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
                          onCheckedChange={(checked) => memoizedHandlePublicInventorySelect(inventory.id, checked)}
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
                        {inventory.description || t('common.noDescription')}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {inventory.categories?.name || t('common.uncategorized')}
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
                            <span className="text-muted-foreground text-xs">{t('common.noTags')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{inventory.users?.name || t('common.unknown')}</div>
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