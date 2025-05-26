import { useState, FormEvent, ChangeEvent } from 'react';
import { toast } from '@/hooks/use-toast';

/**
 * Hook for managing form state and handling form submissions
 * @param initialState - Initial form state
 * @param onSubmit - Function to call on form submission
 * @param options - Additional options for form handling
 * @returns Form state and handlers
 */
export function useFormState<T extends Record<string, unknown>>(
  initialState: T,
  onSubmit: (data: T) => Promise<{ success: boolean; message?: string }>,
  options?: {
    resetOnSuccess?: boolean;
    successMessage?: string;
    errorMessage?: string;
    validateForm?: (data: T) => { isValid: boolean; errors?: Record<string, string> };
  }
) {
  const [formData, setFormData] = useState<T>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    // Handle checkboxes
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: checkbox.checked
      });
      
      // Clear error for this field if it exists
      if (errors[name]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
      return;
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form if validation function is provided
    if (options?.validateForm) {
      const validation = options.validateForm(formData);
      if (!validation.isValid) {
        setErrors(validation.errors || {});
        return;
      }
    }
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const result = await onSubmit(formData);
      
      if (result.success) {
        if (options?.successMessage || result.message) {
          toast({
            title: 'Success',
            description: result.message || options?.successMessage || 'Operation completed successfully',
            variant: 'default'
          });
        }
        
        if (options?.resetOnSuccess) {
          setFormData(initialState);
        }
      } else {
        toast({
          title: 'Error',
          description: result.message || options?.errorMessage || 'An error occurred',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Error',
        description: options?.errorMessage || 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(initialState);
    setErrors({});
  };

  const setFieldValue = (name: keyof T, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[name as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });
    }
  };

  return {
    formData,
    setFormData,
    handleChange,
    handleSubmit,
    isSubmitting,
    errors,
    setErrors,
    resetForm,
    setFieldValue
  };
}

/**
 * Utility function for validating form fields
 * @param data - Form data to validate
 * @param validationRules - Validation rules for each field
 * @returns Validation result with errors if any
 */
export function validateForm<T extends Record<string, unknown>>(
  data: T,
  validationRules: Record<keyof T, {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: unknown) => boolean;
    message?: string;
  }>
) {
  const errors: Record<string, string> = {};
  
  Object.keys(validationRules).forEach(field => {
    const key = field as keyof T;
    const rules = validationRules[key];
    const value = data[key];
    
    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = rules.message || `${field} is required`;
      return;
    }
    
    if (value !== undefined && value !== null && value !== '') {
      // String validations
      if (typeof value === 'string') {
        // Min length
        if (rules.minLength && value.length < rules.minLength) {
          errors[field] = rules.message || `${field} must be at least ${rules.minLength} characters`;
          return;
        }
        
        // Max length
        if (rules.maxLength && value.length > rules.maxLength) {
          errors[field] = rules.message || `${field} must be no more than ${rules.maxLength} characters`;
          return;
        }
        
        // Pattern
        if (rules.pattern && !rules.pattern.test(value)) {
          errors[field] = rules.message || `${field} has an invalid format`;
          return;
        }
      }
      
      // Custom validation
      if (rules.custom && !rules.custom(value)) {
        errors[field] = rules.message || `${field} is invalid`;
        return;
      }
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
} 