import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  getInventoryFieldTemplatesAction,
  bulkSaveFieldTemplatesAction,
  addFieldTemplateAction,
  editFieldTemplateAction,
  deleteFieldTemplateAction
} from '@/lib/field-actions'
import { 
  FIELD_TYPES, 
  MAX_FIELDS_PER_TYPE 
} from '@/lib/utils/custom-fields-constants'

/**
 * Field Templates store for managing field template state
 * Centralizes field template CRUD operations and validation
 */
const useFieldTemplatesStore = create(
  persist(
    (set, get) => ({
      // State
      fieldTemplates: [],
      currentInventoryId: null,
      loading: false,
      saving: false,
      error: null,
      validationErrors: {},
      fieldTypeCounts: {},
      hasUnsavedChanges: false,
      originalTemplates: [], // For change detection

      // Actions
      setFieldTemplates: (templates) => {
        const counts = {};
        Object.values(FIELD_TYPES).forEach(type => {
          counts[type] = templates.filter(template => template.fieldType === type).length;
        });
        
        set({ 
          fieldTemplates: templates,
          fieldTypeCounts: counts,
          originalTemplates: JSON.parse(JSON.stringify(templates)),
          hasUnsavedChanges: false
        });
      },

      setLoading: (loading) => set({ loading }),
      setSaving: (saving) => set({ saving }),
      setError: (error) => set({ error }),
      setValidationErrors: (errors) => set({ validationErrors: errors }),
      setCurrentInventoryId: (inventoryId) => set({ currentInventoryId: inventoryId }),

      // Load field templates for inventory
      loadFieldTemplates: async (inventoryId) => {
        set({ loading: true, error: null, currentInventoryId: inventoryId });
        try {
          const result = await getInventoryFieldTemplatesAction(inventoryId);
          if (result.success) {
            get().setFieldTemplates(result.fieldTemplates);
          } else {
            set({ error: result.error, loading: false });
          }
        } catch (error) {
          set({ error: 'Failed to load field templates', loading: false });
        } finally {
          set({ loading: false });
        }
      },

      // Validate all field templates
      validateFieldTemplates: (templates = null) => {
        const fieldsToValidate = templates || get().fieldTemplates;
        const errors = {};
        const usedPositions = {};

        fieldsToValidate.forEach(field => {
          const fieldErrors = [];

          // Validate required title
          if (!field.title || field.title.trim().length === 0) {
            fieldErrors.push('Field title is required');
          }

          // Validate field type
          if (!field.fieldType || !Object.values(FIELD_TYPES).includes(field.fieldType)) {
            fieldErrors.push('Valid field type is required');
          }

          // Validate field index
          if (!field.fieldIndex || field.fieldIndex < 1 || field.fieldIndex > MAX_FIELDS_PER_TYPE) {
            fieldErrors.push(`Field position must be between 1 and ${MAX_FIELDS_PER_TYPE}`);
          }

          // Check for duplicate positions within the same type
          if (field.fieldType && field.fieldIndex) {
            const positionKey = `${field.fieldType}_${field.fieldIndex}`;
            if (usedPositions[positionKey]) {
              fieldErrors.push(`Position ${field.fieldIndex} is already used for ${field.fieldType} fields`);
            } else {
              usedPositions[positionKey] = true;
            }
          }

          if (fieldErrors.length > 0) {
            errors[field.id] = fieldErrors;
          }
        });

        set({ validationErrors: errors });
        return Object.keys(errors).length === 0;
      },

      // Add new field template
      addFieldTemplate: (fieldType) => {
        const { fieldTemplates, fieldTypeCounts } = get();
        
        // Check if we can add more fields of this type
        const currentCount = fieldTypeCounts[fieldType] || 0;
        if (currentCount >= MAX_FIELDS_PER_TYPE) {
          return false;
        }

        // Find next available position
        const usedPositions = fieldTemplates
          .filter(f => f.fieldType === fieldType)
          .map(f => f.fieldIndex);
        
        let nextPosition = 1;
        while (usedPositions.includes(nextPosition) && nextPosition <= MAX_FIELDS_PER_TYPE) {
          nextPosition++;
        }

        if (nextPosition > MAX_FIELDS_PER_TYPE) {
          return false;
        }

        const newField = {
          id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: '',
          description: '',
          fieldType,
          fieldIndex: nextPosition,
          isVisible: true,
          displayOrder: fieldTemplates.length
        };

        const updatedTemplates = [...fieldTemplates, newField];
        get().updateFieldTemplatesState(updatedTemplates);
        return true;
      },

      // Update field template
      updateFieldTemplate: (fieldId, updates) => {
        const { fieldTemplates } = get();
        const updatedTemplates = fieldTemplates.map(field => 
          field.id === fieldId ? { ...field, ...updates } : field
        );
        get().updateFieldTemplatesState(updatedTemplates);
      },

      // Remove field template
      removeFieldTemplate: async (fieldId) => {
        const { fieldTemplates } = get();
        
        // Find the field to be removed
        const fieldToRemove = fieldTemplates.find(field => field.id === fieldId);
        
        if (!fieldToRemove) {
          return { success: false, error: 'Field not found' };
        }
        
        // If field has a real database ID (not a temporary client-side ID), delete from database
        if (fieldToRemove.id && !fieldToRemove.id.startsWith('temp_') && !fieldToRemove.id.startsWith('field_')) {
          try {
            const result = await deleteFieldTemplateAction(fieldToRemove.id);
            if (!result.success) {
              set({ error: result.error });
              return result;
            }
          } catch (error) {
            const errorMessage = 'Failed to delete field from database';
            set({ error: errorMessage });
            return { success: false, error: errorMessage };
          }
        }
        
        // Remove from local state
        const updatedTemplates = fieldTemplates.filter(field => field.id !== fieldId);
        get().updateFieldTemplatesState(updatedTemplates);
        
        return { success: true };
      },

      // Reorder field templates
      reorderFieldTemplates: (newOrder) => {
        const updatedTemplates = newOrder.map((field, index) => ({
          ...field,
          displayOrder: index
        }));
        get().updateFieldTemplatesState(updatedTemplates);
      },

      // Internal helper to update state and detect changes
      updateFieldTemplatesState: (updatedTemplates) => {
        const { originalTemplates } = get();
        
        // Update field type counts
        const counts = {};
        Object.values(FIELD_TYPES).forEach(type => {
          counts[type] = updatedTemplates.filter(template => template.fieldType === type).length;
        });

        // Detect changes
        const hasChanges = JSON.stringify(updatedTemplates) !== JSON.stringify(originalTemplates);

        set({ 
          fieldTemplates: updatedTemplates,
          fieldTypeCounts: counts,
          hasUnsavedChanges: hasChanges
        });

        // Validate updated templates
        get().validateFieldTemplates(updatedTemplates);
      },

      // Save field templates
      saveFieldTemplates: async () => {
        const { fieldTemplates, currentInventoryId, validationErrors } = get();
        
        if (!currentInventoryId) {
          set({ error: 'No inventory selected' });
          return { success: false, error: 'No inventory selected' };
        }

        if (Object.keys(validationErrors).length > 0) {
          set({ error: 'Please fix validation errors before saving' });
          return { success: false, error: 'Please fix validation errors before saving' };
        }

        set({ saving: true, error: null });
        
        try {
          const cleanTemplates = fieldTemplates.map(({ id, ...template }) => ({
            ...template,
            displayOrder: fieldTemplates.indexOf(fieldTemplates.find(f => f.id === id))
          }));

          const result = await bulkSaveFieldTemplatesAction(currentInventoryId, cleanTemplates);
          
          if (result.success) {
            // Update original templates to mark as saved
            set({ 
              originalTemplates: JSON.parse(JSON.stringify(fieldTemplates)),
              hasUnsavedChanges: false
            });
          } else {
            set({ error: result.error });
          }
          
          return result;
        } catch (error) {
          const errorMessage = 'An unexpected error occurred while saving';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        } finally {
          set({ saving: false });
        }
      },

      // Check if field type can be added
      canAddFieldType: (fieldType) => {
        const { fieldTypeCounts } = get();
        return (fieldTypeCounts[fieldType] || 0) < MAX_FIELDS_PER_TYPE;
      },

      // Get total fields count
      getTotalFieldsCount: () => {
        const { fieldTemplates } = get();
        return fieldTemplates.length;
      },

      // Get max total fields
      getMaxTotalFields: () => {
        return Object.keys(FIELD_TYPES).length * MAX_FIELDS_PER_TYPE;
      },

      // Reset state
      resetState: () => {
        set({
          fieldTemplates: [],
          currentInventoryId: null,
          loading: false,
          saving: false,
          error: null,
          validationErrors: {},
          fieldTypeCounts: {},
          hasUnsavedChanges: false,
          originalTemplates: []
        });
      },

      // Clear unsaved changes (revert to original)
      revertChanges: () => {
        const { originalTemplates } = get();
        get().setFieldTemplates([...originalTemplates]);
      }
    }),
    {
      name: 'field-templates-store',
      // Only persist templates and inventory ID
      partialize: (state) => ({
        fieldTemplates: state.fieldTemplates,
        currentInventoryId: state.currentInventoryId,
        originalTemplates: state.originalTemplates
      })
    }
  )
);

export default useFieldTemplatesStore;