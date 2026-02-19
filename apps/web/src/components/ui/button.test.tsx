import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Button } from './button';

afterEach(cleanup);

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await user.click(screen.getByRole('button', { name: 'Click' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Disabled</Button>);
    await user.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies variant styles', () => {
    const { rerender } = render(<Button variant="primary">Btn</Button>);
    expect(screen.getByRole('button', { name: 'Btn' })).toHaveClass('bg-primary');

    rerender(<Button variant="secondary">Btn</Button>);
    expect(screen.getByRole('button', { name: 'Btn' })).toHaveClass('border-primary');

    rerender(<Button variant="danger">Btn</Button>);
    expect(screen.getByRole('button', { name: 'Btn' })).toHaveClass('bg-highlight');

    rerender(<Button variant="ghost">Btn</Button>);
    expect(screen.getByRole('button', { name: 'Btn' })).toHaveClass('bg-transparent');
  });

  it('meets minimum touch target size', () => {
    render(<Button>Tap</Button>);
    const btn = screen.getByRole('button', { name: 'Tap' });
    expect(btn).toHaveClass('min-h-[44px]');
    expect(btn).toHaveClass('min-w-[44px]');
  });

  it('is keyboard accessible', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Press</Button>);
    const btn = screen.getByRole('button', { name: 'Press' });
    btn.focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
  });
});
