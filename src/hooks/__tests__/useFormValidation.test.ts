import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '../useFormValidation';

describe('useFormValidation', () => {
  const initialValues = {
    name: '',
    email: '',
    age: 0
  };

  const validationRules = {
    name: { required: true, minLength: 2 },
    email: { required: true, email: true },
    age: { number: { min: 0, max: 120 } }
  };

  it('initializes with default values', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    expect(result.current.formState.name.value).toBe('');
    expect(result.current.formState.email.value).toBe('');
    expect(result.current.formState.age.value).toBe(0);
    expect(result.current.isValid).toBe(true); // No validation errors initially
  });

  it('validates required fields', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setValue('name', '');
    });

    expect(result.current.formState.name.error).toBe('This field is required');
    expect(result.current.isValid).toBe(false);
  });

  it('validates minimum length', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setValue('name', 'A');
    });

    expect(result.current.formState.name.error).toBe('Must be at least 2 characters');
  });

  it('validates email format', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setValue('email', 'invalid-email');
    });

    expect(result.current.formState.email.error).toBe('Please enter a valid email address');

    act(() => {
      result.current.setValue('email', 'valid@example.com');
    });

    expect(result.current.formState.email.error).toBeNull();
  });

  it('validates number ranges', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setValue('age', -5);
    });

    expect(result.current.formState.age.error).toBe('Value must be at least 0');

    act(() => {
      result.current.setValue('age', 150);
    });

    expect(result.current.formState.age.error).toBe('Value must be at most 120');

    act(() => {
      result.current.setValue('age', 25);
    });

    expect(result.current.formState.age.error).toBeNull();
  });

  it('sanitizes string inputs', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setValue('name', '<script>alert("xss")</script>John');
    });

    expect(result.current.formState.name.value).toBe('John');
  });

  it('validates entire form', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setValue('name', '');
      result.current.setValue('email', 'invalid');
    });

    let isValid;
    act(() => {
      isValid = result.current.validateForm();
    });

    expect(isValid).toBe(false);
    expect(result.current.formState.name.error).toBe('This field is required');
    expect(result.current.formState.email.error).toBe('Please enter a valid email address');
  });

  it('resets form to initial state', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setValue('name', 'John');
      result.current.setValue('email', 'john@example.com');
    });

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formState.name.value).toBe('');
    expect(result.current.formState.email.value).toBe('');
    expect(result.current.formState.name.touched).toBe(false);
    expect(result.current.formState.email.touched).toBe(false);
  });

  it('provides field props for form inputs', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    const nameProps = result.current.getFieldProps('name');

    expect(nameProps.value).toBe('');
    expect(typeof nameProps.onChange).toBe('function');
    expect(typeof nameProps.onBlur).toBe('function');
  });

  it('handles custom validation rules', () => {
    const customRules = {
      password: {
        required: true,
        custom: (value: string) => {
          if (value.length < 8) return 'Password must be at least 8 characters';
          if (!/[A-Z]/.test(value)) return 'Password must contain uppercase letter';
          if (!/[0-9]/.test(value)) return 'Password must contain a number';
          return null;
        }
      }
    };

    const { result } = renderHook(() => 
      useFormValidation({ password: '' }, customRules)
    );

    act(() => {
      result.current.setValue('password', 'weak');
    });

    expect(result.current.formState.password.error).toBe('Password must be at least 8 characters');

    act(() => {
      result.current.setValue('password', 'weakpassword');
    });

    expect(result.current.formState.password.error).toBe('Password must contain uppercase letter');

    act(() => {
      result.current.setValue('password', 'WeakPassword');
    });

    expect(result.current.formState.password.error).toBe('Password must contain a number');

    act(() => {
      result.current.setValue('password', 'StrongPassword123');
    });

    expect(result.current.formState.password.error).toBeNull();
  });

  it('tracks form state correctly', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    expect(result.current.isDirty).toBe(false);
    expect(result.current.hasErrors).toBe(false);

    act(() => {
      result.current.setValue('name', 'John');
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.hasErrors).toBe(false);

    act(() => {
      result.current.setValue('email', 'invalid');
    });

    expect(result.current.hasErrors).toBe(true);
  });
});