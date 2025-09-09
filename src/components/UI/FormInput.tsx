import React, { useCallback } from 'react';
import { InputValidator } from '../../utils/errorHandler';

interface FormInputProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'number' | 'date' | 'select' | 'textarea' | 'password' | 'tel' | 'url';
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  error?: string | null;
  touched?: boolean;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  options?: { value: string; label: string }[]; // For select inputs
  rows?: number; // For textarea
  className?: string;
  helpText?: string;
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  autoComplete?: string;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  placeholder,
  required = false,
  disabled = false,
  loading = false,
  options = [],
  rows = 3,
  className = '',
  helpText,
  min,
  max,
  step,
  maxLength,
  autoComplete
}) => {
  const hasError = touched && error;
  
  const baseInputClasses = `
    block w-full px-3 py-2 border rounded-md shadow-sm transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${hasError 
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 text-gray-900 placeholder-gray-400 hover:border-gray-400'
    }
    ${loading ? 'pr-10' : ''}
  `;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    // Sanitize text inputs to prevent XSS
    if ((type === 'text' || type === 'email' || type === 'tel' || type === 'url') && e.target.value) {
      const sanitized = InputValidator.sanitizeString(e.target.value);
      e.target.value = sanitized;
    }
    onChange(e);
  }, [onChange, type]);

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            onBlur={onBlur}
            disabled={disabled || loading}
            className={baseInputClasses}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={
              hasError ? `${name}-error` : 
              helpText ? `${name}-help` : undefined
            }
          >
            <option value="">{placeholder || 'Select an option'}</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled || loading}
            rows={rows}
            maxLength={maxLength}
            className={baseInputClasses}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={
              hasError ? `${name}-error` : 
              helpText ? `${name}-help` : undefined
            }
          />
        );
      
      default:
        return (
          <div className="relative">
            <input
              type={type}
              id={name}
              name={name}
              value={value}
              onChange={handleChange}
              onBlur={onBlur}
              placeholder={placeholder}
              disabled={disabled || loading}
              className={baseInputClasses}
              min={min}
              max={max}
              step={step}
              maxLength={maxLength}
              autoComplete={autoComplete}
              aria-invalid={hasError ? 'true' : 'false'}
              aria-describedby={
                hasError ? `${name}-error` : 
                helpText ? `${name}-help` : undefined
              }
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-coffee-600 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {renderInput()}
      
      {helpText && !hasError && (
        <p id={`${name}-help`} className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
      
      {hasError && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600 flex items-center" role="alert">
          <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default FormInput;