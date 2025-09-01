'use client';

import { useState, useEffect } from 'react';
import { useAsyncOperation, useDialog } from '@/lib/hooks/useAsyncOperation';
import { useItemSelection } from '@/lib/hooks/useItemSelection';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import ItemDialog from './ItemDialog';
import LikeButton from './LikeButton';
import LikeCount from './LikeCount';
import { deleteItemAction } from '@/lib/item-actions';
import useLikesStore from '@/lib/stores/likes';
import { formatDistanceToNow } from 'date-fns';
import { getFieldColumnName } from '@/lib/utils/custom-fields-utils';
import { FIELD_TYPES } from '@/lib/utils/custom-fields-constants';

export default function ItemsTable({ 
  items = [], 
  inventoryId, 
  inventory,
  fieldTemplates = [],
  canEdit = false,
  currentUser = null,
  onItemsChange 
}) {
  const { t } = useTranslation();
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  
  // Use Zustand store for centralized like state management
  const {
    loadLikeStates,
    refreshLikeStates,
    getLikeState,
    clearItemLikeStates
  } = useLikesStore();
  
  // Use reusable hooks for common patterns
  const { open: dialogOpen, openDialog, closeDialog } = useDialog();
  const { open: deleteDialogOpen, openDialog: openDeleteDialog, closeDialog: closeDeleteDialog } = useDialog();
  
  // Use the new item selection hook
  const {
    selectedItems,
    selectedCount,
    hasSelection,
    isSelected,
    toggleItemSelection,
    handleSelectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected
  } = useItemSelection(items);
  
  const { loading, execute: executeDelete } = useAsyncOperation(
    async (itemId) => await deleteItemAction(itemId),
    {
      onSuccess: () => {
        onItemsChange?.();
        closeDeleteDialog();
        setDeletingItem(null);
        clearSelection();
      }
    }
  );
  
  // Load like states for all items using Zustand store
  useEffect(() => {
    if (items.length > 0) {
      const itemIds = items.map(item => item.id);
      loadLikeStates(itemIds);
    }
  }, [items, loadLikeStates]);
  const handleAddItem = () => {
    setEditingItem(null);
    openDialog();
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    openDialog();
  };

  const handleDeleteClick = (item) => {
    setDeletingItem(item);
    openDeleteDialog();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    await executeDelete(deletingItem.id);
  };

  const handleEditSelected = () => {
    if (selectedCount === 1) {
      const itemId = selectedItems[0];
      const item = items.find(i => i.id === itemId);
      if (item) {
        handleEditItem(item);
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedCount === 1) {
      const itemId = selectedItems[0];
      const item = items.find(i => i.id === itemId);
      if (item) {
        handleDeleteClick(item);
      }
    }
  };

  const handleLikeComplete = (result) => {
    if (result.success) {
      // Refresh like states after successful like operation using Zustand store
      const itemIds = items.map(item => item.id);
      refreshLikeStates(itemIds);
      
      // Clear selection after successful like operation
      clearSelection();
      
      // Trigger items refresh if callback provided
      onItemsChange?.();
    }
  };

  const selectedItem = selectedCount === 1 ? items.find(i => isSelected(i.id)) : null;

  // Generate dynamic columns based on field templates
  const visibleFieldTemplates = fieldTemplates.filter(template => template.isVisible);
  
  // Helper function to get field value from item
  const getFieldValue = (item, template) => {
    const columnName = getFieldColumnName(template.fieldType, template.fieldIndex);
    return item[columnName];
  };
  
  // Helper function to get field type for formatting
  const getFieldDisplayType = (fieldType) => {
    switch (fieldType) {
      case FIELD_TYPES.TEXT:
      case FIELD_TYPES.TEXTAREA:
        return 'text';
      case FIELD_TYPES.NUMBER:
        return 'number';
      case FIELD_TYPES.DOCUMENT:
        return 'url';
      case FIELD_TYPES.BOOLEAN:
        return 'boolean';
      default:
        return 'text';
    }
  };

  const handleDialogSuccess = () => {
    onItemsChange?.();
    closeDialog();
    setEditingItem(null);
    clearSelection(); // Clear selection after successful operation
  };

  const formatValue = (value, type = 'text') => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground">—</span>;
    }
    
    if (type === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? t('common.yes') : t('common.no')}
        </Badge>
      );
    }
    
    if (type === 'url' && value) {
      return (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <span className="truncate max-w-[200px]">{value}</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      );
    }
    
    if (type === 'number') {
      return <span className="font-mono">{value}</span>;
    }
    
    return <span className="truncate max-w-[200px]" title={value}>{value}</span>;
  };

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{t('items.title')}</h3>
          {canEdit && (
            <Button onClick={handleAddItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('items.addItem')}
            </Button>
          )}
        </div>
        
        <div className="text-center py-8 text-muted-foreground">
          <p>{t('items.noItems')}</p>
          {canEdit && (
            <p className="text-sm mt-2">{t('items.getStarted')}</p>
          )}
        </div>

        {canEdit && (
          <ItemDialog
            open={dialogOpen}
            onOpenChange={closeDialog}
            inventoryId={inventoryId}
            inventory={inventory}
            fieldTemplates={fieldTemplates}
            item={editingItem}
            onSuccess={handleDialogSuccess}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{t('items.itemsCount', { count: items.length })}</h3>
        {canEdit && (
          <Button onClick={handleAddItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('items.addItem')}
          </Button>
        )}
      </div>

      {/* Items Toolbar */}
      {items.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {t('common.selectedCount', { selected: selectedCount, total: items.length })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Like Button - Active when items are selected */}
            <LikeButton
              selectedItemIds={selectedItems}
              currentUser={currentUser}
              onLikeComplete={handleLikeComplete}
              disabled={!hasSelection}
            />
            
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditSelected}
                  disabled={selectedCount !== 1}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('actions.edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={selectedCount !== 1}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('actions.delete')}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all items"
                />
              </TableHead>
              <TableHead className="w-[120px]">{t('items.customId')}</TableHead>
              {visibleFieldTemplates.map((template) => (
                <TableHead key={template.id}>
                  {template.title}
                </TableHead>
              ))}
              {/* Fallback to legacy columns if no field templates */}
              {visibleFieldTemplates.length === 0 && (
                <>
                  <TableHead>{t('items.text1')}</TableHead>
                  <TableHead>{t('items.text2')}</TableHead>
                  <TableHead>{t('items.text3')}</TableHead>
                  <TableHead>{t('items.number1')}</TableHead>
                  <TableHead>{t('items.number2')}</TableHead>
                  <TableHead>{t('items.number3')}</TableHead>
                  <TableHead>{t('items.bool1')}</TableHead>
                  <TableHead>{t('items.bool2')}</TableHead>
                  <TableHead>{t('items.bool3')}</TableHead>
                </>
              )}
              <TableHead className="w-[80px]">{t('items.likes')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const likeState = getLikeState(item.id);
              
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected(item.id)}
                      onCheckedChange={(checked) => toggleItemSelection(item.id)}
                      aria-label={`Select item ${item.customId}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.customId}
                  </TableCell>
                  {visibleFieldTemplates.map((template) => {
                    const value = getFieldValue(item, template);
                    const displayType = getFieldDisplayType(template.fieldType);
                    return (
                      <TableCell key={template.id}>
                        {formatValue(value, displayType)}
                      </TableCell>
                    );
                  })}
                  {/* Fallback to legacy columns if no field templates */}
                  {visibleFieldTemplates.length === 0 && (
                    <>
                      <TableCell>{formatValue(item.text1, 'text')}</TableCell>
                      <TableCell>{formatValue(item.text2, 'text')}</TableCell>
                      <TableCell>{formatValue(item.text3, 'text')}</TableCell>
                      <TableCell>{formatValue(item.num1, 'number')}</TableCell>
                      <TableCell>{formatValue(item.num2, 'number')}</TableCell>
                      <TableCell>{formatValue(item.num3, 'number')}</TableCell>
                      <TableCell>{formatValue(item.bool1, 'boolean')}</TableCell>
                      <TableCell>{formatValue(item.bool2, 'boolean')}</TableCell>
                      <TableCell>{formatValue(item.bool3, 'boolean')}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <LikeCount 
                      likeCount={likeState.likeCount} 
                      showZero={false}
                      size="sm"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      {canEdit && (
        <ItemDialog
          open={dialogOpen}
          onOpenChange={closeDialog}
          inventoryId={inventoryId}
          inventory={inventory}
          fieldTemplates={fieldTemplates}
          item={editingItem}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={closeDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the item "{deletingItem?.customId}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}