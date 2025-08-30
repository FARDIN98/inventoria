'use client';

import { useState } from 'react';
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
import { deleteItemAction } from '@/lib/item-actions';
import { formatDistanceToNow } from 'date-fns';
import { getFieldColumnName } from '@/lib/utils/custom-fields-utils';
import { FIELD_TYPES } from '@/lib/utils/custom-fields-constants';

export default function ItemsTable({ 
  items = [], 
  inventoryId, 
  inventory,
  fieldTemplates = [],
  canEdit = false, 
  onItemsChange 
}) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());

  const handleAddItem = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDeleteClick = (item) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    
    setLoading(true);
    try {
      const result = await deleteItemAction(deletingItem.id);
      if (result.success) {
        onItemsChange?.();
        setDeleteDialogOpen(false);
        setDeletingItem(null);
        setSelectedItems(new Set()); // Clear selection after successful deletion
      } else {
        console.error('Delete failed:', result.error);
        // You might want to show a toast notification here
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(new Set(items.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId, checked) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleEditSelected = () => {
    if (selectedItems.size === 1) {
      const itemId = Array.from(selectedItems)[0];
      const item = items.find(i => i.id === itemId);
      if (item) {
        handleEditItem(item);
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItems.size === 1) {
      const itemId = Array.from(selectedItems)[0];
      const item = items.find(i => i.id === itemId);
      if (item) {
        handleDeleteClick(item);
      }
    }
  };

  const selectedItem = selectedItems.size === 1 ? items.find(i => selectedItems.has(i.id)) : null;

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
    setDialogOpen(false);
    setEditingItem(null);
    setSelectedItems(new Set()); // Clear selection after successful operation
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
          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
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
            onOpenChange={setDialogOpen}
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
      {canEdit && items.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {t('common.selectedCount', { selected: selectedItems.size, total: items.length })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditSelected}
              disabled={selectedItems.size !== 1}
            >
              <Edit className="h-4 w-4 mr-2" />
              {t('actions.edit')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={selectedItems.size !== 1}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('actions.delete')}
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {canEdit && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedItems.size === items.length && items.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all items"
                  />
                </TableHead>
              )}
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                {canEdit && (
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={(checked) => handleSelectItem(item.id, checked)}
                      aria-label={`Select item ${item.customId}`}
                    />
                  </TableCell>
                )}
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
                    <TableCell>{formatValue(item.text1)}</TableCell>
                    <TableCell>{formatValue(item.text2)}</TableCell>
                    <TableCell>{formatValue(item.text3)}</TableCell>
                    <TableCell>{formatValue(item.num1, 'number')}</TableCell>
                    <TableCell>{formatValue(item.num2, 'number')}</TableCell>
                    <TableCell>{formatValue(item.num3, 'number')}</TableCell>
                    <TableCell>{formatValue(item.bool1, 'boolean')}</TableCell>
                    <TableCell>{formatValue(item.bool2, 'boolean')}</TableCell>
                    <TableCell>{formatValue(item.bool3, 'boolean')}</TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      {canEdit && (
        <ItemDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          inventoryId={inventoryId}
          inventory={inventory}
          fieldTemplates={fieldTemplates}
          item={editingItem}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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