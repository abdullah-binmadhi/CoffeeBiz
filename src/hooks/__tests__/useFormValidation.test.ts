import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '../useFormValidation';

describe('useFormValidation', () => {
  const initialValues = {
    email: '',
    password: '',
    age: 0,
    name: ''
  };

  const validationRules = {
    email: { required: true, email: true },
    password: { required: true, minLength: 8 },
    age: { required: true, number: { min: 18, max: 100 } },
    name: { required: true, minLength: 2, maxLength: 50 }
  };

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    expect(result.current.formState.email.value).toBe('');
    expect(result.current.formState.email.error).toBeNull();
    expect(result.current.formState.email.touched).toBe(false);
    expect(result.current.isValid).toBe(true);
    expect(result.current.hasErrors).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it('validates required fields', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setValue('email', '');
    });

    expect(result.current.formState.email.error).toBe('This field is required');
    expect(result.current.formState.email.touched).toBe(true);
    expect(result.current.isValid).toBe(false);
    expect(result.current.hasErrors).toBe(true);
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

  it('validates minimum length', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setValue('password', '123');
    });

    expect(result.current.formState.password.error).toBe('Must be at least 8 characters');

    act(() => {
      result.current.setValue('password', '12345678');
    });

    expect(result.current.formState.password.error).toBeNull();
  });

  it('validates maximum length', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setValue('name', 'a'.repeat(51));
    });

    expect(result.current.formState.name.error).toBe('Must be no more than 50 characters');

    act(() => {
      result.current.setValue('name', 'Valid Name');
    });

    expect(result.current.formState.name.error).toBeNull();
  });

  it('validates number ranges', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setValue('age', 15);
    });

    expect(result.current.formState.age.error).toBe('Value must be at least 18');

    act(() => {
      result.current.setValue('age', 150);
    });

    expect(result.current.formState.age.error).toBe('Value must be at most 100');

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

    expect(result.current.formState.name.value).toBe('alert(xss)John');
  });

  it('validates entire form', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    let isValid;
    act(() => {
      isValid = result.current.validateForm();
    });

    expect(isValid).toBe(false);
    expect(result.current.formState.email.touched).toBe(true);
    expect(result.current.formState.password.touched).toBe(true);
    expect(result.current.formState.age.touched).toBe(true);
    expect(result.current.formState.name.touched).toBe(true);

    // Fill in valid values
    act(() => {
      result.current.setValue('email', 'test@example.com');
      result.current.setValue('password', 'password123');
      result.current.setValue('age', 25);
      result.current.setValue('name', 'John Doe');
    });

    act(() => {
      isValid = result.current.validateForm();
    });

    expect(isValid).toBe(true);
  });

  it('resets form to initial state', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    // Make changes
    act(() => {
      result.current.setValue('email', 'test@example.com');
      result.current.setValue('name', 'John');
    });

    expect(result.current.formState.email.value).toBe('test@example.com');
    expect(result.current.formState.email.touched).toBe(true);

    // Reset
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formState.email.value).toBe('');
    expect(result.current.formState.email.touched).toBe(false);
    expect(result.current.formState.email.error).toBeNull();
  });

  it('touches field without validation', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.touchField('email');
    });

    expect(result.current.formState.email.touched).toBe(true);
    expect(result.current.formState.email.error).toBeNull(); // No validation on touch alone
  });

  it('sets custom error', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setError('email', 'Custom error message');
    });

    expect(result.current.formState.email.error).toBe('Custom error message');
  });

  it('provides field props for form inputs', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    const emailProps = result.current.getFieldProps('email');

    expect(emailProps.value).toBe('');
    expect(emailProps.error).toBeNull();
    expect(emailProps.touched).toBe(false);
    expect(typeof emailProps.onChange).toBe('function');
    expect(typeof emailProps.onBlur).toBe('function');
  });

  it('handles custom validation rules', () => {
    const customRules = {
      username: {
        required: true,
        custom: (value: string) => {
          if (value && value.includes(' ')) {
            return 'Username cannot contain spaces';
          }
          return null;
        }
      }
    };

    const { result } = renderHook(() => 
      useFormValidation({ username: '' }, customRules)
    );

    act(() => {
      result.current.setValue('username', 'user name');
    });

    expect(result.current.formState.username.error).toBe('Username cannot contain spaces');

    act(() => {
      result.current.setValue('username', 'username');
    });

    expect(result.current.formState.username.error).toBeNull();
  });

  it('skips validation for empty non-required fields', () => {
    const optionalRules = {
      optional: { minLength: 5 } // Not required, but has min length
    };

    const { result } = renderHook(() => 
      useFormValidation({ optional: '' }, optionalRules)
    );

    act(() => {
      result.current.setValue('optional', '');
    });

    expect(result.current.formState.optional.error).toBeNull();

    act(() => {
      result.current.setValue('optional', 'abc'); // Less than min length
    });

    expect(result.current.formState.optional.error).toBe('Must be at least 5 characters');
  });
});