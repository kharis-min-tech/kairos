import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DateSelect } from './date-select';

describe('DateSelect', () => {
  it('shows selected dates in UK day/month/year order', () => {
    render(<DateSelect value="2026-05-21" onChange={() => {}} />);

    expect(screen.getByRole('button', { name: /21\/05\/2026/i })).toBeInTheDocument();
  });
});
