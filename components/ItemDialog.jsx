'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { addItemAction, editItemAction } from '@/lib/item-actions';
import { Loader2 } from 'lucide-react';

export default function ItemDialog({ 
  open, 
  onOpenChange, 
  inventoryId, 
  item = null, // null for add, item object for edit
  onSuccess 
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    customId: '',
    text1: '',
    text2: '',
    text3: '',
    textArea1: '',
    textArea2: '',
    textArea3: '',
    num1: '',
    num2: '',
    num3: '',
    doc1: '',
    doc2: '',
    doc3: '',
    bool1: false,
    bool2: false,
    bool3: false,
  });

  const isEdit = !!item;

  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (open) {
      if (item) {
        // Edit mode - populate with existing data
        setFormData({
          customId: item.customId || '',
          text1: item.text1 || '',
          text2: item.text2 || '',
          text3: item.text3 || '',
          textArea1: item.textArea1 || '',
          textArea2: item.textArea2 || '',
          textArea3: item.textArea3 || '',
          num1: item.num1 !== null ? item.num1.toString() : '',
          num2: item.num2 !== null ? item.num2.toString() : '',
          num3: item.num3 !== null ? item.num3.toString() : '',
          doc1: item.doc1 || '',
          doc2: item.doc2 || '',
          doc3: item.doc3 || '',
          bool1: item.bool1 || false,
          bool2: item.bool2 || false,
          bool3: item.bool3 || false,
        });
      } else {
        // Add mode - reset to empty
        setFormData({
          customId: '',
          text1: '',
          text2: '',
          text3: '',
          textArea1: '',
          textArea2: '',
          textArea3: '',
          num1: '',
          num2: '',
          num3: '',
          doc1: '',
          doc2: '',
          doc3: '',
          bool1: false,
          bool2: false,
          bool3: false,
        });
      }
      setError('');
    }
  }, [open, item]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // Clear error when user starts typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create FormData object
      const formDataObj = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key.startsWith('bool')) {
          formDataObj.append(key, value.toString());
        } else {
          formDataObj.append(key, value);
        }
      });

      let result;
      if (isEdit) {
        result = await editItemAction(item.id, formDataObj, item.version);
      } else {
        result = await addItemAction(inventoryId, formDataObj);
      }

      if (result.success) {
        onSuccess?.(result.item);
        onOpenChange(false);
      } else {
        setError(result.error || 'An error occurred');
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Update the item details below.' 
              : 'Fill in the details for the new item.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Custom ID - Required */}
          <div className="space-y-2">
            <Label htmlFor="customId" className="text-sm font-medium">
              Custom ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customId"
              value={formData.customId}
              onChange={(e) => handleInputChange('customId', e.target.value)}
              placeholder="Enter unique item ID"
              required
            />
          </div>

          {/* Text Fields */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Text Fields</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((num) => (
                <div key={`text${num}`} className="space-y-2">
                  <Label htmlFor={`text${num}`} className="text-sm">
                    Text {num}
                  </Label>
                  <Input
                    id={`text${num}`}
                    value={formData[`text${num}`]}
                    onChange={(e) => handleInputChange(`text${num}`, e.target.value)}
                    placeholder={`Text field ${num}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Textarea Fields */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Large Text Fields</h4>
            <div className="space-y-4">
              {[1, 2, 3].map((num) => (
                <div key={`textArea${num}`} className="space-y-2">
                  <Label htmlFor={`textArea${num}`} className="text-sm">
                    Large Text {num}
                  </Label>
                  <Textarea
                    id={`textArea${num}`}
                    value={formData[`textArea${num}`]}
                    onChange={(e) => handleInputChange(`textArea${num}`, e.target.value)}
                    placeholder={`Large text field ${num}`}
                    rows={3}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Numeric Fields */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Numeric Fields</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((num) => (
                <div key={`num${num}`} className="space-y-2">
                  <Label htmlFor={`num${num}`} className="text-sm">
                    Number {num}
                  </Label>
                  <Input
                    id={`num${num}`}
                    type="number"
                    step="any"
                    value={formData[`num${num}`]}
                    onChange={(e) => handleInputChange(`num${num}`, e.target.value)}
                    placeholder={`Number ${num}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Document Fields */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Document/URL Fields</h4>
            <div className="space-y-4">
              {[1, 2, 3].map((num) => (
                <div key={`doc${num}`} className="space-y-2">
                  <Label htmlFor={`doc${num}`} className="text-sm">
                    Document/URL {num}
                  </Label>
                  <Input
                    id={`doc${num}`}
                    value={formData[`doc${num}`]}
                    onChange={(e) => handleInputChange(`doc${num}`, e.target.value)}
                    placeholder={`Document or URL ${num}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Boolean Fields */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Boolean Fields</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((num) => (
                <div key={`bool${num}`} className="flex items-center space-x-2">
                  <Checkbox
                    id={`bool${num}`}
                    checked={formData[`bool${num}`]}
                    onCheckedChange={(checked) => handleInputChange(`bool${num}`, checked)}
                  />
                  <Label htmlFor={`bool${num}`} className="text-sm">
                    Boolean {num}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}