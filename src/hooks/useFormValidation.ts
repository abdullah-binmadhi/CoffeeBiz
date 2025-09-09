import { useState, useCallback } from 'react';
import { InputValidator } from '../utils/errorHandler';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  email?: boolean;
  number?: { min?: number; max?: number };
  dateRange?: boolean;
}

export interface FormField {
  value: any;
  error: string | null;
  touched: boolean;
  rules?: ValidationRule;
}

export interface FormState {
  [key: string]: FormField;
}

export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, ValidationRule>> = {}
) => {
  const [formState, setFormState] = useState<FormState>(() => {
    const state: FormState = {};
    Object.keys(initialValues).forEach(key => {
      state[key] = {
        value: initialValues[key],
        error: null,
        touched: false,
        rules: validationRules[key]
      };
    });
    return state;
  });

  const validateField = useCallback((name: string, value: any, rules?: ValidationRule): string | null => {
    if (!rules) return null;

    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return 'This field is required';
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    // String validations
    if (typeof value === 'string') {
      // Min length
      if (rules.minLength && value.length < rules.minLength) {
        return `Must be at least ${rules.minLength} characters`;
      }

      // Max length
      if (rules.maxLength && value.length > rules.maxLength) {
        return `Must be no more than ${rules.maxLength} characters`;
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        return 'Invalid format';
      }

      // Email validation
      if (rules.email) {
        const emailValidation = InputValidator.validateEmail(value);
        if (!emailValidation.isValid) {
          return emailValidation.error || 'Invalid email format';
        }
      }
    }

    // Number validation
    if (rules.number) {
      const numberValidation = InputValidator.validateNumber(value, rules.number.min, rules.number.max);
      if (!numberValidation.isValid) {
        return numberValidation.error || 'Invalid number';
      }
    }

    // Date range validation (for date inputs)
    if (rules.dateRange && value instanceof Date) {
      // This would need additional context for end date
      // Implementation depends on specific use case
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        return customError;
      }
    }

    return null;
  }, []);

  const setValue = useCallback((name: string, value: any) => {
    setFormState(prev => {
      const field = prev[name];
      const error = validateField(name, value, field?.rules);
      
      return {
        ...prev,
        [name]: {
          ...field,
          value: typeof value === 'string' ? InputValidator.sanitizeString(value) : value,
          error,
          touched: true
        }
      };
    });
  }, [validateField]);

  const setError = useCallback((name: string, error: string | null) => {
    setFormState(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        error
      }
    }));
  }, []);

  const touchField = useCallback((name: string) => {
    setFormState(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        touched: true
      }
    }));
  }, []);

  const validateForm = useCallback((): boolean => {
    let isValid = true;
    const newState = { ...formState };

    Object.keys(formState).forEach(name => {
      const field = formState[name];
      const error = validateField(name, field.value, field.rules);
      
      newState[name] = {
        ...field,
        error,
        touched: true
      };

      if (error) {
        isValid = false;
      }
    });

    setFormState(newState);
    return isValid;
  }, [formState, validateField]);

  const resetForm = useCallback(() => {
    const state: FormState = {};
    Object.keys(initialValues).forEach(key => {
      state[key] = {
        value: initialValues[key],
        error: null,
        touched: false,
        rules: validationRules[key]
      };
    });
    setFormState(state);
  }, [initialValues, validationRules]);

  const getFieldProps = useCallback((name: string) => ({
    value: formState[name]?.value || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValue(name, e.target.value);
    },
    onBlur: () => touchField(name),
    error: formState[name]?.error,
    touched: formState[name]?.touched
  }), [formState, setValue, touchField]);

  const isValid = Object.values(formState).every(field => !field.error);
  const hasErrors = Object.values(formState).some(field => field.error);
  const isDirty = Object.values(formState).some(field => field.touched);

  return {
    formState,
    setValue,
    setError,
    touchField,
    validateForm,
    resetForm,
    getFieldProps,
    isValid,
    hasErrors,
    isDirty
  };
};