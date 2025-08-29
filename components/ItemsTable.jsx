'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
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

export default function ItemsTable({ 
  items = [], 
  inventoryId, 
  canEdit = false, 
  onItemsChange 
}) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const handleDialogSuccess = () => {
    onItemsChange?.();
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

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">{t('items.customId')}</TableHead>
            <TableHead>{t('items.text1')}</TableHead>
            <TableHead>{t('items.text2')}</TableHead>
            <TableHead>{t('items.text3')}</TableHead>
            <TableHead>{t('items.number1')}</TableHead>
            <TableHead>{t('items.number2')}</TableHead>
            <TableHead>{t('items.number3')}</TableHead>
            <TableHead>{t('items.bool1')}</TableHead>
            <TableHead>{t('items.bool2')}</TableHead>
            <TableHead>{t('items.bool3')}</TableHead>
            {canEdit && <TableHead className="w-[100px]">{t('common.actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.customId}
                </TableCell>
                <TableCell>{formatValue(item.text1)}</TableCell>
                <TableCell>{formatValue(item.text2)}</TableCell>
                <TableCell>{formatValue(item.text3)}</TableCell>
                <TableCell>{formatValue(item.num1, 'number')}</TableCell>
                <TableCell>{formatValue(item.num2, 'number')}</TableCell>
                <TableCell>{formatValue(item.num3, 'number')}</TableCell>
                <TableCell>{formatValue(item.bool1, 'boolean')}</TableCell>
                <TableCell>{formatValue(item.bool2, 'boolean')}</TableCell>
                <TableCell>{formatValue(item.bool3, 'boolean')}</TableCell>
                {canEdit && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
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