import { useState, useCallback } from 'react';

/**
 * Custom hook for managing async operations with loading and error states
 * Provides a consistent pattern for handling async operations across components
 * 
 * @param {Function} asyncFunction - The async function to execute
 * @param {Object} options - Configuration options
 * @param {boolean} options.initialLoading - Initial loading state (default: false)
 * @param {Function} options.onSuccess - Callback for successful operations
 * @param {Function} options.onError - Callback for error handling
 * @returns {Object} - { loading, error, execute, reset }
 */
export function useAsyncOperation(asyncFunction, options = {}) {
  const {
    initialLoading = false,
    onSuccess,
    onError
  } = options;

  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await asyncFunction(...args);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [asyncFunction, onSuccess, onError]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    execute,
    reset
  };
}

/**
 * Custom hook for managing form state with validation
 * Provides consistent form state management across components
 * 
 * @param {Object} initialData - Initial form data
 * @param {Function} validator - Optional validation function
 * @returns {Object} - { formData, errors, updateField, setFormData, validate, reset }
 */
export function useFormState(initialData = {}, validator = null) {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});

  const updateField = useCallback((fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }, [errors]);

  const validate = useCallback(() => {
    if (!validator) return true;
    
    const validationErrors = validator(formData);
    setErrors(validationErrors || {});
    
    return Object.keys(validationErrors || {}).length === 0;
  }, [formData, validator]);

  const reset = useCallback(() => {
    setFormData(initialData);
    setErrors({});
  }, [initialData]);

  return {
    formData,
    errors,
    updateField,
    setFormData,
    validate,
    reset
  };
}

/**
 * Custom hook for managing selection state (checkboxes, multi-select)
 * Provides consistent selection management across components
 * 
 * @param {Array} initialSelected - Initial selected items
 * @returns {Object} - { selected, selectAll, selectItem, clearSelection, isSelected, selectedCount }
 */
export function useSelection(initialSelected = []) {
  const [selected, setSelected] = useState(new Set(initialSelected));

  const selectAll = useCallback((items) => {
    setSelected(new Set(items.map(item => typeof item === 'object' ? item.id : item)));
  }, []);

  const selectItem = useCallback((itemId, isSelected) => {
    setSelected(prev => {
      const newSelected = new Set(prev);
      if (isSelected) {
        newSelected.add(itemId);
      } else {
        newSelected.delete(itemId);
      }
      return newSelected;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((itemId) => {
    return selected.has(itemId);
  }, [selected]);

  const selectedCount = selected.size;
  const selectedArray = Array.from(selected);

  return {
    selected: selectedArray,
    selectedSet: selected,
    selectAll,
    selectItem,
    clearSelection,
    isSelected,
    selectedCount
  };
}

/**
 * Custom hook for managing dialog/modal state
 * Provides consistent dialog state management across components
 * 
 * @param {boolean} initialOpen - Initial open state
 * @returns {Object} - { open, openDialog, closeDialog, toggleDialog }
 */
export function useDialog(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen);

  const openDialog = useCallback(() => setOpen(true), []);
  const closeDialog = useCallback(() => setOpen(false), []);
  const toggleDialog = useCallback(() => setOpen(prev => !prev), []);

  return {
    open,
    openDialog,
    closeDialog,
    toggleDialog
  };
}