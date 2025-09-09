import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FormInput from '../FormInput';

describe('FormInput', () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnBlur.mockClear();
  });

  it('renders text input with label', () => {
    render(
      <FormInput
        label="Test Label"
        name="test"
        value=""
        onChange={mockOnChange}
      />
    );
    
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(
      <FormInput
        label="Required Field"
        name="required"
        value=""
        onChange={mockOnChange}
        required={true}
      />
    );
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays error message when error and touched', () => {
    render(
      <FormInput
        label="Test Field"
        name="test"
        value=""
        onChange={mockOnChange}
        error="This field is required"
        touched={true}
      />
    );
    
    const errorMessage = screen.getByText('This field is required');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveAttribute('role', 'alert');
  });

  it('does not display error when not touched', () => {
    render(
      <FormInput
        label="Test Field"
        name="test"
        value=""
        onChange={mockOnChange}
        error="This field is required"
        touched={false}
      />
    );
    
    expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
  });

  it('displays help text when no error', () => {
    render(
      <FormInput
        label="Test Field"
        name="test"
        value=""
        onChange={mockOnChange}
        helpText="This is help text"
      />
    );
    
    expect(screen.getByText('This is help text')).toBeInTheDocument();
  });

  it('hides help text when error is present', () => {
    render(
      <FormInput
        label="Test Field"
        name="test"
        value=""
        onChange={mockOnChange}
        error="Error message"
        touched={true}
        helpText="This is help text"
      />
    );
    
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.queryByText('This is help text')).not.toBeInTheDocument();
  });

  it('renders select input with options', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' }
    ];
    
    render(
      <FormInput
        label="Select Field"
        name="select"
        type="select"
        value=""
        onChange={mockOnChange}
        options={options}
        placeholder="Choose an option"
      />
    );
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Choose an option')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('renders textarea input', () => {
    render(
      <FormInput
        label="Textarea Field"
        name="textarea"
        type="textarea"
        value=""
        onChange={mockOnChange}
        rows={5}
      />
    );
    
    const textarea = screen.getByRole('textbox');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('handles input changes and sanitizes text', () => {
    render(
      <FormInput
        label="Text Field"
        name="text"
        type="text"
        value=""
        onChange={mockOnChange}
      />
    );
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '<script>alert("xss")</script>Hello' } });
    
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('calls onBlur when input loses focus', () => {
    render(
      <FormInput
        label="Text Field"
        name="text"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    );
    
    const input = screen.getByRole('textbox');
    fireEvent.blur(input);
    
    expect(mockOnBlur).toHaveBeenCalledTimes(1);
  });

  it('disables input when disabled prop is true', () => {
    render(
      <FormInput
        label="Disabled Field"
        name="disabled"
        value=""
        onChange={mockOnChange}
        disabled={true}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('disables input when loading prop is true', () => {
    render(
      <FormInput
        label="Loading Field"
        name="loading"
        value=""
        onChange={mockOnChange}
        loading={true}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('shows loading spinner when loading', () => {
    render(
      <FormInput
        label="Loading Field"
        name="loading"
        value=""
        onChange={mockOnChange}
        loading={true}
      />
    );
    
    // Check for loading spinner (div with animate-spin class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('applies correct error styling', () => {
    render(
      <FormInput
        label="Error Field"
        name="error"
        value=""
        onChange={mockOnChange}
        error="Error message"
        touched={true}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-300');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets up accessibility attributes correctly', () => {
    render(
      <FormInput
        label="Accessible Field"
        name="accessible"
        value=""
        onChange={mockOnChange}
        error="Error message"
        touched={true}
        helpText="Help text"
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'accessible-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('handles number input attributes', () => {
    render(
      <FormInput
        label="Number Field"
        name="number"
        type="number"
        value={0}
        onChange={mockOnChange}
        min={0}
        max={100}
        step={1}
      />
    );
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
    expect(input).toHaveAttribute('step', '1');
  });

  it('handles maxLength attribute', () => {
    render(
      <FormInput
        label="Limited Field"
        name="limited"
        value=""
        onChange={mockOnChange}
        maxLength={50}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxLength', '50');
  });
});