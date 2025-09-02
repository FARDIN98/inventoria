'use client';

import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus,
  GripVertical,
  Trash2,
  Eye,
  EyeOff,
  HelpCircle,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { FIELD_TYPES, MAX_FIELDS_PER_TYPE } from '@/lib/utils/custom-fields-constants';
import useFieldTemplatesStore from '@/lib/stores/field-templates';
import { getFieldInputType } from '@/lib/utils/field-validation-utils';

// Field type descriptions for help popovers
const FIELD_TYPE_DESCRIPTIONS = {
  [FIELD_TYPES.TEXT]: {
    title: 'Single-line Text',
    description: 'Short text input for names, titles, or brief information.',
    example: 'Book Title, Author Name, ISBN',
    maxLength: '255 characters',
    icon: '📝'
  },
  [FIELD_TYPES.TEXTAREA]: {
    title: 'Multi-line Text',
    description: 'Large text area for descriptions, notes, or detailed information.',
    example: 'Book Summary, Notes, Description',
    maxLength: '10,000 characters',
    icon: '📄'
  },
  [FIELD_TYPES.NUMBER]: {
    title: 'Numeric Field',
    description: 'Numeric input for quantities, prices, or measurements.',
    example: 'Price, Quantity, Year Published',
    maxLength: 'Any finite number',
    icon: '🔢'
  },
  [FIELD_TYPES.DOCUMENT]: {
    title: 'Document/Image Link',
    description: 'URL input for linking to external documents or images.',
    example: 'PDF Link, Image URL, External Reference',
    maxLength: 'Valid URL format',
    icon: '🔗'
  },
  [FIELD_TYPES.BOOLEAN]: {
    title: 'True/False Field',
    description: 'Checkbox for yes/no or true/false values.',
    example: 'Available, Featured, Completed',
    maxLength: 'True or False',
    icon: '☑️'
  }
};

// Sortable field component
function SortableField({ field, index, onUpdate, onRemove, disabled, validationErrors }) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldErrors = validationErrors[field.id] || [];
  const hasErrors = fieldErrors.length > 0;

  const handleFieldChange = (property, value) => {
    const updatedField = {
      ...field,
      [property]: value
    };
    onUpdate(index, updatedField);
  };

  const handleTypeChange = (newType) => {
    const updatedField = {
      ...field,
      fieldType: newType,
      // Reset field index when type changes to avoid conflicts
      fieldIndex: 1
    };
    onUpdate(index, updatedField);
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`mb-3 ${isDragging ? 'shadow-lg' : ''} ${hasErrors ? 'border-destructive' : ''}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <span>{FIELD_TYPE_DESCRIPTIONS[field.fieldType]?.icon}</span>
              Field {index + 1}
            </Badge>
            {field.isVisible ? (
              <Tooltip>
                <TooltipTrigger>
                  <Eye className="h-3 w-3 text-green-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Visible in table view</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger>
                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Hidden from table view</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{FIELD_TYPE_DESCRIPTIONS[field.fieldType]?.icon}</span>
                    <h4 className="font-medium">{FIELD_TYPE_DESCRIPTIONS[field.fieldType]?.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {FIELD_TYPE_DESCRIPTIONS[field.fieldType]?.description}
                  </p>
                  <div className="text-sm">
                    <strong>Examples:</strong> {FIELD_TYPE_DESCRIPTIONS[field.fieldType]?.example}
                  </div>
                  <div className="text-sm">
                    <strong>Limit:</strong> {FIELD_TYPE_DESCRIPTIONS[field.fieldType]?.maxLength}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => await onRemove(index)}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        {hasErrors && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <div className="text-sm text-destructive">
              {fieldErrors.map((error, i) => (
                <div key={i}>{error}</div>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Field Type Selection */}
        <div className="space-y-2">
          <Label>Field Type</Label>
          <Select value={field.fieldType} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FIELD_TYPES).map(([key, value]) => (
                <SelectItem key={key} value={value}>
                  <div className="flex items-center gap-2">
                    <span>{FIELD_TYPE_DESCRIPTIONS[value]?.icon}</span>
                    {FIELD_TYPE_DESCRIPTIONS[value]?.title || value}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Field Title */}
        <div className="space-y-2">
          <Label>Field Title *</Label>
          <Input
            value={field.title || ''}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Enter field title (e.g., Book Title, Author)"
            className={fieldErrors.some(e => e.includes('title')) ? 'border-destructive' : ''}
          />
        </div>

        {/* Field Description */}
        <div className="space-y-2">
          <Label>Description (Optional)</Label>
          <Textarea
            value={field.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Enter field description or help text"
            rows={2}
          />
        </div>

        {/* Field Index Selection */}
        <div className="space-y-2">
          <Label>Field Position</Label>
          <Select 
            value={field.fieldIndex?.toString() || '1'} 
            onValueChange={(value) => handleFieldChange('fieldIndex', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3].map(index => (
                <SelectItem key={index} value={index.toString()}>
                  Position {index}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Visibility Toggle */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`visible-${field.id}`}
            checked={field.isVisible !== false}
            onCheckedChange={(checked) => handleFieldChange('isVisible', checked)}
          />
          <Label htmlFor={`visible-${field.id}`} className="flex items-center gap-2">
            Show in table view
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>When enabled, this field will be displayed in the items table</p>
              </TooltipContent>
            </Tooltip>
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}



// Main component
export default function CustomFieldsManager({ 
  inventoryId, 
  initialFields = [], 
  onFieldsChange,
  className = '' 
}) {
  const { t } = useTranslation();
  
  // Zustand store
  const {
    fieldTemplates: fields,
    validationErrors,
    fieldTypeCounts,
    saving: isSaving,
    hasUnsavedChanges,
    error,
    setFieldTemplates,
    addFieldTemplate,
    updateFieldTemplate,
    removeFieldTemplate,
    reorderFieldTemplates,
    saveFieldTemplates,
    canAddFieldType,
    setCurrentInventoryId
  } = useFieldTemplatesStore();

  // Initialize store with inventory ID and initial fields
  useEffect(() => {
    if (inventoryId) {
      setCurrentInventoryId(inventoryId);
    }
    
    if (initialFields && initialFields.length > 0) {
      const fieldsWithIds = initialFields.map((field, index) => ({
        ...field,
        id: field.id || `field_${Date.now()}_${index}`
      }));
      setFieldTemplates(fieldsWithIds);
    }
  }, [inventoryId, initialFields, setCurrentInventoryId, setFieldTemplates]);

  // Notify parent component when fields change
  useEffect(() => {
    if (onFieldsChange) {
      const cleanFields = fields.map(({ id, ...field }) => ({
        ...field,
        displayOrder: fields.indexOf(fields.find(f => f.id === id))
      }));
      onFieldsChange(cleanFields, Object.keys(validationErrors).length === 0);
    }
  }, [fields, validationErrors, onFieldsChange]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );



  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = fields.findIndex(item => item.id === active.id);
      const newIndex = fields.findIndex(item => item.id === over.id);
      const reorderedFields = arrayMove(fields, oldIndex, newIndex);
      reorderFieldTemplates(reorderedFields);
    }
  };

  const addField = (fieldType = FIELD_TYPES.TEXT) => {
    addFieldTemplate(fieldType);
  };

  const updateField = (index, updatedField) => {
    const fieldId = fields[index]?.id;
    if (fieldId) {
      updateFieldTemplate(fieldId, updatedField);
    }
  };

  const removeField = async (index) => {
    const fieldId = fields[index]?.id;
    if (fieldId) {
      const result = await removeFieldTemplate(fieldId);
      if (!result.success) {
        console.error('Failed to remove field:', result.error);
        // You could also show a toast notification here
      }
    }
  };

  const canAddField = (fieldType) => {
    return canAddFieldType(fieldType);
  };

  const getTotalFields = () => fields.length;
  const getMaxTotalFields = () => Object.keys(FIELD_TYPES).length * MAX_FIELDS_PER_TYPE;

  // Save field templates
  const handleSave = async () => {
    if (isSaving) return;
    
    // Validate fields before saving
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    
    await saveFieldTemplates();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Custom Fields Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure custom fields for items in this inventory. Maximum {MAX_FIELDS_PER_TYPE} fields per type.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {getTotalFields()}/{getMaxTotalFields()} fields
          </Badge>
        </div>
      </div>

      {/* Add Field Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add New Field</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {Object.entries(FIELD_TYPES).map(([key, fieldType]) => {
              const canAdd = canAddField(fieldType);
              const count = fieldTypeCounts[fieldType] || 0;
              
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={canAdd ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => addField(fieldType)}
                      disabled={!canAdd}
                      className="flex flex-col items-center gap-1 h-auto py-3"
                    >
                      <span className="text-lg">{FIELD_TYPE_DESCRIPTIONS[fieldType]?.icon}</span>
                      <span className="text-xs">{FIELD_TYPE_DESCRIPTIONS[fieldType]?.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {count}/{MAX_FIELDS_PER_TYPE}
                      </Badge>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {canAdd 
                        ? `Add ${FIELD_TYPE_DESCRIPTIONS[fieldType]?.title} field` 
                        : `Maximum ${MAX_FIELDS_PER_TYPE} ${FIELD_TYPE_DESCRIPTIONS[fieldType]?.title} fields reached`
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Fields List */}
      {fields.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={fields} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <SortableField
                  key={field.id}
                  field={field}
                  index={index}
                  onUpdate={updateField}
                  onRemove={removeField}
                  disabled={false}
                  validationErrors={validationErrors}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Card className="p-8 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-medium">No Custom Fields Added</h4>
              <p className="text-sm text-muted-foreground">
                Add custom fields to collect specific information for your inventory items.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Summary */}
      {fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Field Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(FIELD_TYPES).map(([key, fieldType]) => {
                const count = fieldTypeCounts[fieldType] || 0;
                const visibleCount = fields.filter(f => f.fieldType === fieldType && f.isVisible).length;
                
                return (
                  <div key={key} className="text-center">
                    <div className="text-lg mb-1">{FIELD_TYPE_DESCRIPTIONS[fieldType]?.icon}</div>
                    <div className="text-sm font-medium">{FIELD_TYPE_DESCRIPTIONS[fieldType]?.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {count} total, {visibleCount} visible
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Changes Button */}
      {fields.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <>
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">
                  You have unsaved changes
                </span>
              </>
            )}
            {!hasUnsavedChanges && (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">
                  All changes saved
                </span>
              </>
            )}
          </div>
          <Button 
            onClick={handleSave}
            disabled={isSaving || Object.keys(validationErrors).length > 0}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      {/* Help Text */}
      <div className="text-sm text-muted-foreground space-y-2">
        <p><strong>Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Drag fields to reorder them</li>
          <li>Each field type can have up to {MAX_FIELDS_PER_TYPE} instances</li>
          <li>Use "Show in table view" to control which fields appear in the items list</li>
          <li>Field titles are required and should be descriptive</li>
          <li>Descriptions help users understand what information to enter</li>
          <li><strong>Remember to save your changes!</strong></li>
        </ul>
      </div>
    </div>
  );
}