import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('should render with default props', () => {
    render(<Input placeholder="Enter text" />);

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('block', 'w-full', 'rounded-md');
  });

  it('should render with label', () => {
    render(<Input label="Username" placeholder="Enter username" />);

    const label = screen.getByText('Username');
    const input = screen.getByPlaceholderText('Enter username');

    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', input.id);
  });

  it('should display error message', () => {
    render(<Input error="This field is required" />);

    const errorMessage = screen.getByText('This field is required');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveClass('text-error-600');

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-error-300');
  });

  it('should display helper text when no error', () => {
    render(<Input helperText="Enter your username" />);

    const helperText = screen.getByText('Enter your username');
    expect(helperText).toBeInTheDocument();
    expect(helperText).toHaveClass('text-neutral-500');
  });

  it('should prioritize error over helper text', () => {
    render(
      <Input error="This field is required" helperText="Enter your username" />
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.queryByText('Enter your username')).not.toBeInTheDocument();
  });

  it('should render with left icon', () => {
    const LeftIcon = () => <span data-testid="left-icon">🔍</span>;
    render(<Input leftIcon={<LeftIcon />} />);

    const input = screen.getByRole('textbox');
    const icon = screen.getByTestId('left-icon');

    expect(icon).toBeInTheDocument();
    expect(input).toHaveClass('pl-10'); // Padding for left icon
  });

  it('should render with right icon', () => {
    const RightIcon = () => <span data-testid="right-icon">👁️</span>;
    render(<Input rightIcon={<RightIcon />} />);

    const input = screen.getByRole('textbox');
    const icon = screen.getByTestId('right-icon');

    expect(icon).toBeInTheDocument();
    expect(input).toHaveClass('pr-10'); // Padding for right icon
  });

  it('should handle value changes', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: 'test value' }),
      })
    );
  });

  it('should handle disabled state', () => {
    render(<Input disabled />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:bg-neutral-50');
  });

  it('should accept custom className', () => {
    render(<Input className="custom-input" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-input');
  });

  it('should forward ref correctly', () => {
    const ref = jest.fn();
    render(<Input ref={ref} />);

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it('should generate unique id when not provided', () => {
    render(
      <div>
        <Input label="First" />
        <Input label="Second" />
      </div>
    );

    const inputs = screen.getAllByRole('textbox');
    expect(inputs[0].id).not.toBe(inputs[1].id);
    expect(inputs[0].id).toBeTruthy();
    expect(inputs[1].id).toBeTruthy();
  });
});
