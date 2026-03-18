import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with given type', () => {
    render(<Input type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
  });

  it('renders with placeholder text', () => {
    render(<Input placeholder="Enter email" />);
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is set', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('merges additional className', () => {
    render(<Input className="extra-class" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('extra-class');
  });

  it('has base styling classes', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('rounded-md');
  });
});
