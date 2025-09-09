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
import { Plus, Edit, Trash2, Eye, EyeOff, Shield, RefreshCw } from 'lucide-react';

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
      
      // Load dashboard data (always fresh with no cache)
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

  // Simple refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      await loadDashboardData(true); // Force refresh
    } catch (err) {
      console.error('Refresh error:', err);
    }
  }, [loadDashboardData]);

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
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 rounded-2xl -z-10"></div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-8 rounded-2xl backdrop-blur-sm border border-white/20 shadow-lg gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {isAdmin ? t('dashboard.adminTitle') : t('dashboard.title')}
              </h1>
              {isAdmin && (
                <div className="relative">
                  <Shield className="h-7 w-7 text-amber-500 drop-shadow-lg" title="Admin View" />
                  <div className="absolute -inset-1 bg-amber-400/20 rounded-full blur animate-pulse"></div>
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-lg mb-4 lg:mb-0">
              {isAdmin 
                ? t('dashboard.adminDescription')
          : t('dashboard.description')
              }
            </p>
          </div>
          <div className="flex justify-center lg:justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? t('common.loading') : 'Refresh'}
            </Button>
            <Link href="/inventory/create">
              <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                {t('actions.createNew')}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      {inventories && inventories.length > 0 && (
        <Card className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border-2 border-slate-200/50 dark:border-slate-700/50 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {selectedInventories.size} of {inventories.length} selected
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
      <Card className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-800/50 dark:to-blue-950/30 border-2 border-slate-200/60 dark:border-slate-700/60 shadow-2xl backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-t-lg border-b border-slate-200/50 dark:border-slate-700/50">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-100 bg-clip-text text-transparent">{t('dashboard.title')}</CardTitle>
          <CardDescription className="text-base font-medium text-slate-600 dark:text-slate-400">
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
            <div className="overflow-x-auto lg:overflow-x-visible">
              <Table className="min-w-[850px] lg:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 min-w-[48px]">
                      <Checkbox
                        checked={selectedInventories.size === inventories.length && inventories.length > 0}
                        onCheckedChange={memoizedHandleSelectAllInventories}
                        aria-label="Select all inventories"
                      />
                    </TableHead>
                    <TableHead className="min-w-[140px]">{t('forms.title')}</TableHead>
                <TableHead className="min-w-[160px]">{t('forms.description')}</TableHead>
                <TableHead className="min-w-[100px]">{t('forms.category')}</TableHead>
                <TableHead className="min-w-[120px]">{t('forms.tags')}</TableHead>
                <TableHead className="min-w-[120px]">{t('common.owner')}</TableHead>
                <TableHead className="min-w-[90px]">{t('common.visibility')}</TableHead>
                <TableHead className="min-w-[80px]">{t('common.created')}</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {inventories && inventories.map((inventory) => (
                  <TableRow 
                    key={inventory.id}
                    className={`transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-950/30 dark:hover:to-purple-950/30 ${selectedInventories.has(inventory.id) ? 'bg-gradient-to-r from-blue-100/60 to-purple-100/60 dark:from-blue-900/40 dark:to-purple-900/40 shadow-sm' : ''}`}
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
                      <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:text-blue-200 shadow-sm border border-blue-200/50 dark:border-blue-700/50">
                        {inventory.categories?.name || t('common.uncategorized')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {inventory.inventory_tags && inventory.inventory_tags.length > 0 ? (
                          inventory.inventory_tags.map((tagRelation, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/60 dark:to-pink-900/60 px-2.5 py-1 text-xs font-medium text-purple-800 dark:text-purple-200 shadow-sm border border-purple-200/50 dark:border-purple-700/50 hover:scale-105 transition-transform duration-200"
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
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/60 dark:to-emerald-900/60 px-3 py-1.5 text-xs font-semibold text-green-800 dark:text-green-200 shadow-md border border-green-200/50 dark:border-green-700/50">
                            <Eye className="h-3.5 w-3.5" />
                            {t('common.public')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-900/60 dark:to-slate-900/60 px-3 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-md border border-gray-200/50 dark:border-gray-700/50">
                            <EyeOff className="h-3.5 w-3.5" />
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Public Inventories Toolbar - Hidden for authenticated users */}
      {!isAdmin && !user && publicInventories && publicInventories.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/80 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 border-blue-200/50 dark:border-blue-800/30 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground font-medium">
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
        <Card className="bg-gradient-to-br from-emerald-50/80 via-teal-50/60 to-cyan-50/80 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/30 border-emerald-200/50 dark:border-emerald-800/30 backdrop-blur-sm shadow-xl">
          <CardHeader className="bg-gradient-to-r from-emerald-100/50 to-teal-100/50 dark:from-emerald-900/20 dark:to-teal-900/20 border-b border-emerald-200/30 dark:border-emerald-700/30">
            <CardTitle className="bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent font-bold">{t('dashboard.publicInventoriesWithAccess')}</CardTitle>
            {/* <CardDescription>
              {publicInventories && publicInventories.length > 0 
                ? t('dashboard.writeAccessCount', 'Public inventories with write access', { count: publicInventories.length })
                : t('dashboard.noPublicInventoriesWithAccess')
              }
            </CardDescription> */}
          </CardHeader>
          <CardContent>
            {!publicInventories || publicInventories.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-6">
                  <div className="text-6xl mb-6 animate-pulse">🌐</div>
                  <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">{t('dashboard.noPublicInventories')}</h3>
                  <p className="text-sm max-w-md mx-auto leading-relaxed">
                    {t('dashboard.noPublicInventoriesDescription')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto lg:overflow-x-visible">
                <Table className="min-w-[750px] lg:min-w-full">
                  <TableHeader>
                    <TableRow>
                      {/* Checkbox column - Hidden for authenticated users */}
                      {!user && (
                        <TableHead className="w-12 min-w-[48px]">
                          <Checkbox
                            checked={selectedPublicInventories.size === publicInventories.length && publicInventories.length > 0}
                            onCheckedChange={memoizedHandleSelectAllPublicInventories}
                            aria-label="Select all public inventories"
                          />
                        </TableHead>
                      )}
                      <TableHead className="min-w-[140px]">{t('forms.title')}</TableHead>
                <TableHead className="min-w-[160px]">{t('forms.description')}</TableHead>
                <TableHead className="min-w-[100px]">{t('forms.category')}</TableHead>
                <TableHead className="min-w-[120px]">{t('forms.tags')}</TableHead>
                <TableHead className="min-w-[120px]">{t('common.owner')}</TableHead>
                <TableHead className="min-w-[80px]">{t('common.created')}</TableHead>
                      
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {publicInventories.map((inventory) => (
                    <TableRow 
                      key={inventory.id}
                      className={`transition-all duration-200 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-teal-50/50 dark:hover:from-emerald-950/30 dark:hover:to-teal-950/30 ${
                        selectedPublicInventories.has(inventory.id) 
                          ? 'bg-gradient-to-r from-emerald-100/70 to-teal-100/70 dark:from-emerald-900/40 dark:to-teal-900/40 shadow-sm' 
                          : ''
                      }`}
                    >
                      {/* Checkbox cell - Hidden for authenticated users */}
                      {!user && (
                        <TableCell>
                          <Checkbox
                            checked={selectedPublicInventories.has(inventory.id)}
                            onCheckedChange={(checked) => memoizedHandlePublicInventorySelect(inventory.id, checked)}
                            aria-label={`Select ${inventory.title}`}
                          />
                        </TableCell>
                      )}
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
                        <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:text-blue-200 shadow-md border border-blue-200/50 dark:border-blue-700/50 hover:scale-105 transition-transform duration-200">
                          {inventory.categories?.name || t('common.uncategorized')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {inventory.inventory_tags && inventory.inventory_tags.length > 0 ? (
                            inventory.inventory_tags.map((tagRelation, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/60 dark:to-pink-900/60 px-2.5 py-1 text-xs font-semibold text-purple-800 dark:text-purple-200 shadow-sm border border-purple-200/50 dark:border-purple-700/50 hover:scale-105 transition-all duration-200 cursor-default"
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
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}