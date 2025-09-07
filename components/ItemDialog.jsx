'use client';

import { useState, useEffect } from 'react';
import { useAsyncOperation, useFormState } from '@/lib/hooks/useAsyncOperation';
import { useTranslation } from 'react-i18next';
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
import { validateCustomIdClient, parseIdFormatClient } from '@/lib/utils/custom-id-client-validator';
import { getFieldColumnName } from '@/lib/utils/custom-fields-utils';
import { FIELD_TYPES } from '@/lib/utils/custom-fields-constants';
import { validateFieldData, getFieldInputType } from '@/lib/utils/field-validation-utils';
import { Loader2, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function ItemDialog({ 
  open, 
  onOpenChange, 
  inventoryId, 
  inventory = null, // inventory object with customIdFormat
  fieldTemplates = [], // field templates for dynamic fields
  item = null, // null for add, item object for edit
  onSuccess 
}) {
  const { t } = useTranslation();
  const [customIdValidation, setCustomIdValidation] = useState({ isValid: true, message: '' });
  
  // Use reusable hooks for common patterns
  const { loading, error, execute: executeSubmit, reset: resetAsyncOperation } = useAsyncOperation(
    async (formDataToSubmit) => {
      let result;
      if (isEdit) {
        result = await editItemAction(item.id, formDataToSubmit, item.version);
      } else {
        result = await addItemAction(inventoryId, formDataToSubmit);
      }
      
      // Handle server action response format
      if (result && !result.success) {
        throw new Error(result.error || 'Operation failed');
      }
      
      return result;
    },
    {
      onSuccess: (result) => {
        if (result && result.success) {
          onSuccess?.();
          onOpenChange(false);
        }
      }
    }
  );
  
  const { formData, setFormData } = useFormState({ customId: '' });
  
  // Helper function to get initial form data
  const getInitialFormData = (itemData = null) => {
    const initialData = { customId: itemData?.customId || '' };
    
    // Add dynamic fields based on field templates
    fieldTemplates.forEach(template => {
      const fieldKey = `field_${template.id}`;
      const columnName = getFieldColumnName(template.fieldType, template.fieldIndex);
      
      if (itemData && itemData[columnName] !== undefined) {
        // Edit mode - use existing data
        if (template.fieldType === FIELD_TYPES.BOOLEAN) {
          initialData[fieldKey] = itemData[columnName] || false;
        } else if (template.fieldType === FIELD_TYPES.NUMBER) {
          initialData[fieldKey] = itemData[columnName] !== null ? itemData[columnName].toString() : '';
        } else {
          initialData[fieldKey] = itemData[columnName] || '';
        }
      } else {
        // Add mode - use default values
        if (template.fieldType === FIELD_TYPES.BOOLEAN) {
          initialData[fieldKey] = false;
        } else {
          initialData[fieldKey] = '';
        }
      }
    });
    
    // Add legacy fields for backward compatibility
    const legacyFields = {
      text1: '', text2: '', text3: '',
      textArea1: '', textArea2: '', textArea3: '',
      num1: '', num2: '', num3: '',
      doc1: '', doc2: '', doc3: '',
      bool1: false, bool2: false, bool3: false
    };
    
    if (itemData) {
      Object.keys(legacyFields).forEach(key => {
        if (key.startsWith('bool')) {
          legacyFields[key] = itemData[key] || false;
        } else if (key.startsWith('num')) {
          legacyFields[key] = itemData[key] !== null ? itemData[key].toString() : '';
        } else {
          legacyFields[key] = itemData[key] || '';
        }
      });
    }
    
    return { ...initialData, ...legacyFields };
  };

  const isEdit = !!item;

  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (open) {
      setFormData(getInitialFormData(item));
      resetAsyncOperation();
    }
  }, [open, item, fieldTemplates, resetAsyncOperation]);

  // Validate custom ID format
  const validateCustomIdFormat = (customId) => {
    if (!inventory?.customIdFormat || !customId.trim()) {
      setCustomIdValidation({ isValid: true, message: '' });
      return;
    }

    try {
      const parsedFormat = parseIdFormatClient(inventory.customIdFormat);
      const isValid = validateCustomIdClient(customId.trim(), parsedFormat);
      
      if (isValid) {
        setCustomIdValidation({ isValid: true, message: t('forms.validation.customIdValid', 'Custom ID is valid') });
      } else {
        setCustomIdValidation({ isValid: false, message: t('forms.validation.customIdInvalid', 'Custom ID format doesnt match ') });
      }
    } catch (error) {
      console.error('Custom ID validation error:', error);
      setCustomIdValidation({ isValid: false, message: t('forms.validation.customIdFormatError', 'Custom ID format is invalid') });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) resetAsyncOperation(); // Clear error when user starts typing
    
    // Validate custom ID format in real-time
    if (field === 'customId') {
      validateCustomIdFormat(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate custom ID format before submission
    if (inventory?.customIdFormat && formData.customId.trim()) {
      validateCustomIdFormat(formData.customId);
      if (!customIdValidation.isValid) {
        return;
      }
    }

    // Create FormData object
    const formDataObj = new FormData();
    
    // Add custom ID
    formDataObj.append('customId', formData.customId);
    
    // Add dynamic fields using field_{templateId} naming convention
    fieldTemplates.forEach(template => {
      const fieldKey = `field_${template.id}`;
      const value = formData[fieldKey];
      
      if (template.fieldType === FIELD_TYPES.BOOLEAN) {
        formDataObj.append(fieldKey, value.toString());
      } else {
        formDataObj.append(fieldKey, value || '');
      }
    });
    
    // Add legacy fields for backward compatibility
    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'customId' && !key.startsWith('field_')) {
        if (key.startsWith('bool')) {
          formDataObj.append(key, value.toString());
        } else {
          formDataObj.append(key, value);
        }
      }
    });

    // Use the executeSubmit hook which handles loading, error states, and success callback
    await executeSubmit(formDataObj);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('pages.itemDialog.editTitle', 'Edit Item') : t('pages.itemDialog.addTitle', 'Add New Item')}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? t('pages.itemDialog.editDescription', 'Update the details of this item') 
              : t('pages.itemDialog.addDescription', 'Fill in the details for the new item')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Custom ID - Required */}
          <div className="space-y-2">
            <Label htmlFor="customId" className="text-sm font-medium">
              {t('forms.customId', 'Custom ID')} <span className="text-destructive">*</span>
              {inventory?.customIdFormat && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({t('forms.formatValidationEnabled', 'Format validation enabled')})
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="customId"
                value={formData.customId}
                onChange={(e) => handleInputChange('customId', e.target.value)}
                placeholder={t('forms.placeholder.customId', 'Enter custom ID')}
                required
                className={`pr-8 ${
                  inventory?.customIdFormat && formData.customId.trim() 
                    ? customIdValidation.isValid 
                      ? 'border-green-500 focus:border-green-500' 
                      : 'border-red-500 focus:border-red-500'
                    : ''
                }`}
              />
              {inventory?.customIdFormat && formData.customId.trim() && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  {customIdValidation.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {inventory?.customIdFormat && customIdValidation.message && (
              <p className={`text-xs ${
                customIdValidation.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {customIdValidation.message}
              </p>
            )}
          </div>

          {/* Dynamic Fields Based on Field Templates */}
          {fieldTemplates.length > 0 && (
            <div className="space-y-6">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                {t('forms.customFields', 'Custom Fields')}
              </h4>
              <div className="space-y-4">
                {fieldTemplates.map((template) => {
                  const fieldKey = `field_${template.id}`;
                  const fieldValue = formData[fieldKey] || '';
                  
                  return (
                    <div key={template.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={fieldKey} className="text-sm font-medium">
                          {template.title}
                        </Label>
                        {template.description && (
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{template.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      
                      {template.fieldType === FIELD_TYPES.TEXT && (
                        <Input
                          id={fieldKey}
                          value={fieldValue}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          placeholder={`Enter ${template.title.toLowerCase()}`}
                        />
                      )}
                      
                      {template.fieldType === FIELD_TYPES.TEXTAREA && (
                        <Textarea
                          id={fieldKey}
                          value={fieldValue}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          placeholder={`Enter ${template.title.toLowerCase()}`}
                          rows={3}
                        />
                      )}
                      
                      {template.fieldType === FIELD_TYPES.NUMBER && (
                        <Input
                          id={fieldKey}
                          type="number"
                          step="any"
                          value={fieldValue}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          placeholder={`Enter ${template.title.toLowerCase()}`}
                        />
                      )}
                      
                      {template.fieldType === FIELD_TYPES.DOCUMENT && (
                        <Input
                          id={fieldKey}
                          type="url"
                          value={fieldValue}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          placeholder={`Enter ${template.title.toLowerCase()} URL`}
                        />
                      )}
                      
                      {template.fieldType === FIELD_TYPES.BOOLEAN && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={fieldKey}
                            checked={fieldValue}
                            onCheckedChange={(checked) => handleInputChange(fieldKey, checked)}
                          />
                          <Label htmlFor={fieldKey} className="text-sm">
                            {template.title}
                          </Label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Legacy Fields for Backward Compatibility */}
          {fieldTemplates.length === 0 && (
            <>
              {/* Text Fields */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">{t('forms.textFields', 'Text Fields')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((num) => (
                    <div key={`text${num}`} className="space-y-2">
                      <Label htmlFor={`text${num}`} className="text-sm">
                        {t('forms.labels.text', { number: num })}
                      </Label>
                      <Input
                        id={`text${num}`}
                        value={formData[`text${num}`]}
                        onChange={(e) => handleInputChange(`text${num}`, e.target.value)}
                        placeholder={t('forms.placeholder.textField', { number: num })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Textarea Fields */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">{t('forms.largeTextFields', 'Large Text Fields')}</h4>
                <div className="space-y-4">
                  {[1, 2, 3].map((num) => (
                    <div key={`textArea${num}`} className="space-y-2">
                      <Label htmlFor={`textArea${num}`} className="text-sm">
                        {t('forms.labels.largeText', { number: num })}
                      </Label>
                      <Textarea
                        id={`textArea${num}`}
                        value={formData[`textArea${num}`]}
                        onChange={(e) => handleInputChange(`textArea${num}`, e.target.value)}
                        placeholder={t('forms.placeholder.largeTextField', { number: num })}
                        rows={3}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Numeric Fields */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">{t('forms.numericFields', 'Numeric Fields')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((num) => (
                    <div key={`num${num}`} className="space-y-2">
                      <Label htmlFor={`num${num}`} className="text-sm">
                        {t('forms.labels.number', { number: num })}
                      </Label>
                      <Input
                        id={`num${num}`}
                        type="number"
                        step="any"
                        value={formData[`num${num}`]}
                        onChange={(e) => handleInputChange(`num${num}`, e.target.value)}
                        placeholder={t('forms.placeholder.numberField', { number: num })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Fields */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">{t('forms.documentFields', 'Document Fields')}</h4>
                <div className="space-y-4">
                  {[1, 2, 3].map((num) => (
                    <div key={`doc${num}`} className="space-y-2">
                      <Label htmlFor={`doc${num}`} className="text-sm">
                        {t('forms.labels.document', { number: num })}
                      </Label>
                      <Input
                        id={`doc${num}`}
                        value={formData[`doc${num}`]}
                        onChange={(e) => handleInputChange(`doc${num}`, e.target.value)}
                        placeholder={t('forms.placeholder.documentField', { number: num })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Boolean Fields */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">{t('forms.booleanFields', 'Boolean Fields')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((num) => (
                    <div key={`bool${num}`} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bool${num}`}
                        checked={formData[`bool${num}`]}
                        onCheckedChange={(checked) => handleInputChange(`bool${num}`, checked)}
                      />
                      <Label htmlFor={`bool${num}`} className="text-sm">
                        {t('forms.labels.boolean', { number: num })}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

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
              {t('actions.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? t('pages.itemDialog.updateItem', 'Update Item') : t('pages.itemDialog.addItem', 'Add Item')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}