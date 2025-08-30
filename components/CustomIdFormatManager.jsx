'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  HelpCircle, 
  Eye, 
  Copy,
  AlertCircle
} from 'lucide-react';
import { 
  ELEMENT_TYPES, 
  DATETIME_FORMATS
} from '@/lib/utils/custom-id-constants';

// Element type descriptions for help popovers
const ELEMENT_TYPE_DESCRIPTIONS = {
  [ELEMENT_TYPES.FIXED_TEXT]: {
    title: 'Fixed Text',
    description: 'Static text that appears exactly as entered in every ID.',
    example: 'EQ-, ITEM_, PREFIX-',
    options: ['Case transformation']
  },
  [ELEMENT_TYPES.RANDOM_20BIT]: {
    title: '20-bit Random Number',
    description: 'Random number between 0 and 1,048,575 (2^20-1).',
    example: '524288, 123456, 999999',
    options: ['Leading zeros', 'Minimum digits']
  },
  [ELEMENT_TYPES.RANDOM_32BIT]: {
    title: '32-bit Random Number', 
    description: 'Random number between 0 and 4,294,967,295 (2^32-1).',
    example: '2147483648, 1234567890',
    options: ['Leading zeros', 'Minimum digits']
  },
  [ELEMENT_TYPES.RANDOM_6DIGIT]: {
    title: '6-Digit Random',
    description: 'Random 6-digit number string.',
    example: '123456, 789012, 456789',
    options: ['Leading zeros', 'Minimum digits']
  },
  [ELEMENT_TYPES.RANDOM_9DIGIT]: {
    title: '9-Digit Random',
    description: 'Random 9-digit number string.',
    example: '123456789, 987654321',
    options: ['Leading zeros', 'Minimum digits']
  },
  [ELEMENT_TYPES.GUID]: {
    title: 'GUID (UUID v4)',
    description: 'Globally unique identifier in standard UUID format.',
    example: '12345678-1234-4123-8123-123456789012',
    options: ['Case transformation']
  },
  [ELEMENT_TYPES.DATETIME]: {
    title: 'Date/Time',
    description: 'Current date and time in various formats.',
    example: '20240115, 103045, 20240115103045',
    options: ['Format pattern']
  },
  [ELEMENT_TYPES.SEQUENCE]: {
    title: 'Sequential Number',
    description: 'Auto-incrementing number based on item count in inventory.',
    example: '1, 002, 0123 (with formatting)',
    options: ['Leading zeros', 'Minimum digits']
  }
};

// Sortable element component
function SortableElement({ element, index, onUpdate, onRemove, disabled }) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTypeChange = (newType) => {
    const updatedElement = {
      ...element,
      type: newType,
      value: newType === ELEMENT_TYPES.FIXED_TEXT ? (element.value || '') : undefined,
      options: getDefaultOptions(newType)
    };
    onUpdate(index, updatedElement);
  };

  const handleValueChange = (field, value) => {
    const updatedElement = {
      ...element,
      [field]: value
    };
    onUpdate(index, updatedElement);
  };

  const handleOptionChange = (optionKey, value) => {
    const updatedElement = {
      ...element,
      options: {
        ...element.options,
        [optionKey]: value
      }
    };
    onUpdate(index, updatedElement);
  };

  return (
    <Card ref={setNodeRef} style={style} className={`mb-3 ${isDragging ? 'shadow-lg' : ''}`}>
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
            <Badge variant="outline">Element {index + 1}</Badge>
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
                  <h4 className="font-medium">{ELEMENT_TYPE_DESCRIPTIONS[element.type]?.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {ELEMENT_TYPE_DESCRIPTIONS[element.type]?.description}
                  </p>
                  <div className="text-sm">
                    <strong>Example:</strong> {ELEMENT_TYPE_DESCRIPTIONS[element.type]?.example}
                  </div>
                  <div className="text-sm">
                    <strong>Options:</strong> {ELEMENT_TYPE_DESCRIPTIONS[element.type]?.options.join(', ')}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Element Type Selection */}
        <div className="space-y-2">
          <Label>Element Type</Label>
          <Select value={element.type} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ELEMENT_TYPES).map(([key, value]) => (
                <SelectItem key={key} value={value}>
                  {ELEMENT_TYPE_DESCRIPTIONS[value]?.title || value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fixed Text Value */}
        {element.type === ELEMENT_TYPES.FIXED_TEXT && (
          <div className="space-y-2">
            <Label>Text Value</Label>
            <Input
              value={element.value || ''}
              onChange={(e) => handleValueChange('value', e.target.value)}
              placeholder="Enter fixed text (e.g., EQ-, ITEM_)"
            />
          </div>
        )}

        {/* DateTime Format */}
        {element.type === ELEMENT_TYPES.DATETIME && (
          <div className="space-y-2">
            <Label>Date Format</Label>
            <Select 
              value={element.options?.format || 'YYYYMMDD'} 
              onValueChange={(value) => handleOptionChange('format', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATETIME_FORMATS).map(([key, value]) => (
                  <SelectItem key={key} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Numeric Options */}
        {(element.type === ELEMENT_TYPES.RANDOM_20BIT ||
          element.type === ELEMENT_TYPES.RANDOM_32BIT ||
          element.type === ELEMENT_TYPES.RANDOM_6DIGIT ||
          element.type === ELEMENT_TYPES.RANDOM_9DIGIT ||
          element.type === ELEMENT_TYPES.SEQUENCE) && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`leadingZeros-${element.id}`}
                checked={element.options?.leadingZeros || false}
                onCheckedChange={(checked) => handleOptionChange('leadingZeros', checked)}
              />
              <Label htmlFor={`leadingZeros-${element.id}`}>Leading Zeros</Label>
            </div>
            {element.options?.leadingZeros && (
              <div className="space-y-2">
                <Label>Minimum Digits</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={element.options?.minDigits || ''}
                  onChange={(e) => handleOptionChange('minDigits', parseInt(e.target.value) || 1)}
                  placeholder="Minimum number of digits"
                />
              </div>
            )}
          </div>
        )}

        {/* Case Options */}
        {(element.type === ELEMENT_TYPES.FIXED_TEXT || element.type === ELEMENT_TYPES.GUID) && (
          <div className="space-y-2">
            <Label>Case</Label>
            <Select 
              value={element.options?.case || 'none'} 
              onValueChange={(value) => handleOptionChange('case', value === 'none' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Change</SelectItem>
                <SelectItem value="upper">UPPERCASE</SelectItem>
                <SelectItem value="lower">lowercase</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Get default options for element type
function getDefaultOptions(elementType) {
  switch (elementType) {
    case ELEMENT_TYPES.DATETIME:
      return { format: 'YYYYMMDD' };
    case ELEMENT_TYPES.SEQUENCE:
      return { leadingZeros: true, minDigits: 3 };
    case ELEMENT_TYPES.RANDOM_6DIGIT:
      return { leadingZeros: true, minDigits: 6 };
    case ELEMENT_TYPES.RANDOM_9DIGIT:
      return { leadingZeros: true, minDigits: 9 };
    default:
      return {};
  }
}

// Generate unique ID for elements
function generateElementId() {
  return `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Main component
export default function CustomIdFormatManager({ 
  initialFormat = null, 
  onFormatChange,
  inventoryId = 'sample_inventory' 
}) {
  const { t } = useTranslation();
  const [elements, setElements] = useState([]);
  const [previewId, setPreviewId] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');

  // Initialize elements from format
  useEffect(() => {
    if (initialFormat) {
      try {
        if (typeof initialFormat === 'string') {
          try {
            const parsed = JSON.parse(initialFormat);
            if (parsed.elements && Array.isArray(parsed.elements)) {
              const elementsWithIds = parsed.elements.map(element => ({
                ...element,
                id: generateElementId()
              }));
              setElements(elementsWithIds);
            } else {
              setElements([]);
            }
          } catch (error) {
            console.error('Error parsing initial format:', error);
            setElements([]);
          }
        } else {
          const parsed = initialFormat.elements || [];
          const elementsWithIds = parsed.map(element => ({
            ...element,
            id: generateElementId()
          }));
          setElements(elementsWithIds);
        }
      } catch (error) {
        console.error('Error parsing initial format:', error);
        setElements([]);
      }
    }
  }, [initialFormat]);

  // Update JSON output and preview when elements change
  useEffect(() => {
    updateJsonOutput();
    updatePreview();
  }, [elements]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateJsonOutput = useCallback(() => {
    if (elements.length === 0) {
      setJsonOutput('');
      return;
    }

    const format = {
      elements: elements.map(({ id, ...element }) => element)
    };
    
    const jsonString = JSON.stringify(format, null, 2);
    setJsonOutput(jsonString);
    
    // Notify parent component
    if (onFormatChange) {
      onFormatChange(jsonString);
    }
  }, [elements, onFormatChange]);

  const updatePreview = useCallback(() => {
    if (elements.length === 0) {
      setPreviewId('');
      setPreviewError('');
      return;
    }

    try {
      // Generate a simple preview without server-side functions
      let preview = '';
      elements.forEach(element => {
        switch (element.type) {
          case ELEMENT_TYPES.FIXED_TEXT:
            preview += element.value || '';
            break;
          case ELEMENT_TYPES.DATETIME:
            preview += '20240115'; // Mock date
            break;
          case ELEMENT_TYPES.SEQUENCE:
            preview += '001'; // Mock sequence
            break;
          case ELEMENT_TYPES.GUID:
            preview += '12345678-1234-4123-8123-123456789012'; // Mock GUID
            break;
          case ELEMENT_TYPES.RANDOM_6DIGIT:
            preview += '123456'; // Mock random
            break;
          case ELEMENT_TYPES.RANDOM_9DIGIT:
            preview += '123456789'; // Mock random
            break;
          case ELEMENT_TYPES.RANDOM_20BIT:
            preview += '524288'; // Mock random
            break;
          case ELEMENT_TYPES.RANDOM_32BIT:
            preview += '2147483648'; // Mock random
            break;
          default:
            preview += '[' + element.type + ']';
        }
      });
      setPreviewId(preview);
      setPreviewError('');
    } catch (error) {
      setPreviewError(error.message);
      setPreviewId('');
    }
  }, [elements]);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setElements((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addElement = () => {
    if (elements.length >= 10) return;
    
    const newElement = {
      id: generateElementId(),
      type: ELEMENT_TYPES.FIXED_TEXT,
      value: '',
      options: {}
    };
    
    setElements(prev => [...prev, newElement]);
  };

  const updateElement = (index, updatedElement) => {
    setElements(prev => 
      prev.map((element, i) => i === index ? updatedElement : element)
    );
  };

  const removeElement = (index) => {
    setElements(prev => prev.filter((_, i) => i !== index));
  };

  const copyJsonToClipboard = () => {
    if (jsonOutput) {
      navigator.clipboard.writeText(jsonOutput);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Custom ID Format</h3>
          <p className="text-sm text-muted-foreground">
            Configure how custom IDs are generated for items in this inventory.
          </p>
        </div>
        <Button 
          onClick={addElement} 
          disabled={elements.length >= 10}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Element
        </Button>
      </div>

      {/* Elements List */}
      {elements.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={elements} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {elements.map((element, index) => (
                <SortableElement
                  key={element.id}
                  element={element}
                  index={index}
                  onUpdate={updateElement}
                  onRemove={removeElement}
                  disabled={elements.length <= 1}
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
              <h4 className="font-medium">No Elements Added</h4>
              <p className="text-sm text-muted-foreground">
                Add elements to create your custom ID format.
              </p>
            </div>
            <Button onClick={addElement}>
              Add First Element
            </Button>
          </div>
        </Card>
      )}

      {/* Preview Section */}
      {elements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewError ? (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">{previewError}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Sample Generated ID:</Label>
                <div className="p-3 bg-muted rounded-md font-mono text-sm">
                  {previewId || 'Generating...'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* JSON Output */}
      {jsonOutput && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>JSON Format</CardTitle>
              <Button variant="outline" size="sm" onClick={copyJsonToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
              {jsonOutput}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <div className="text-sm text-muted-foreground space-y-2">
        <p><strong>Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Drag elements to reorder them</li>
          <li>Use fixed text for prefixes and separators</li>
          <li>Sequence numbers auto-increment based on item count</li>
          <li>Maximum 10 elements per format</li>
          <li>Preview shows how IDs will look when generated</li>
        </ul>
      </div>
    </div>
  );
}