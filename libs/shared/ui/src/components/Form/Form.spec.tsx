import { render, screen, fireEvent } from '@testing-library/react';
import { Form, FormField, FormLabel, FormError, FormHelperText } from './Form';

describe('Form', () => {
  it('should render form with children', () => {
    render(
      <Form>
        <input type="text" />
        <button type="submit">Submit</button>
      </Form>
    );

    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle form submission', () => {
    const handleSubmit = jest.fn((e) => e.preventDefault());
    render(
      <Form onSubmit={handleSubmit}>
        <button type="submit">Submit</button>
      </Form>
    );

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('should accept custom className', () => {
    render(<Form className="custom-form">Form content</Form>);

    const form = screen.getByRole('form');
    expect(form).toHaveClass('custom-form');
  });

  it('should forward ref correctly', () => {
    const ref = jest.fn();
    render(<Form ref={ref}>Form content</Form>);

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLFormElement));
  });
});

describe('FormField', () => {
  it('should render field with children', () => {
    render(
      <FormField>
        <input type="text" />
      </FormField>
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should display error when provided', () => {
    render(
      <FormField error="This field is required">
        <input type="text" />
      </FormField>
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByText('This field is required')).toHaveClass(
      'text-error-600'
    );
  });

  it('should not display error when not provided', () => {
    render(
      <FormField>
        <input type="text" />
      </FormField>
    );

    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('should accept custom className', () => {
    render(
      <FormField className="custom-field">
        <input type="text" />
      </FormField>
    );

    const field = screen.getByRole('textbox').parentElement;
    expect(field).toHaveClass('custom-field');
  });
});

describe('FormLabel', () => {
  it('should render label text', () => {
    render(<FormLabel>Username</FormLabel>);

    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('should show required indicator when required is true', () => {
    render(<FormLabel required>Username</FormLabel>);

    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveClass('text-error-500');
  });

  it('should not show required indicator when required is false', () => {
    render(<FormLabel required={false}>Username</FormLabel>);

    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('should accept custom className', () => {
    render(<FormLabel className="custom-label">Username</FormLabel>);

    expect(screen.getByText('Username')).toHaveClass('custom-label');
  });

  it('should forward ref correctly', () => {
    const ref = jest.fn();
    render(<FormLabel ref={ref}>Username</FormLabel>);

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLLabelElement));
  });
});

describe('FormError', () => {
  it('should render error message', () => {
    render(<FormError>This field is required</FormError>);

    const error = screen.getByText('This field is required');
    expect(error).toBeInTheDocument();
    expect(error).toHaveClass('text-error-600');
  });

  it('should accept custom className', () => {
    render(<FormError className="custom-error">Error message</FormError>);

    expect(screen.getByText('Error message')).toHaveClass('custom-error');
  });

  it('should forward ref correctly', () => {
    const ref = jest.fn();
    render(<FormError ref={ref}>Error message</FormError>);

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLParagraphElement));
  });
});

describe('FormHelperText', () => {
  it('should render helper text', () => {
    render(<FormHelperText>Enter your username</FormHelperText>);

    const helperText = screen.getByText('Enter your username');
    expect(helperText).toBeInTheDocument();
    expect(helperText).toHaveClass('text-neutral-500');
  });

  it('should accept custom className', () => {
    render(
      <FormHelperText className="custom-helper">Helper text</FormHelperText>
    );

    expect(screen.getByText('Helper text')).toHaveClass('custom-helper');
  });

  it('should forward ref correctly', () => {
    const ref = jest.fn();
    render(<FormHelperText ref={ref}>Helper text</FormHelperText>);

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLParagraphElement));
  });
});
