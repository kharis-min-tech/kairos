import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DateSelect } from '../components/date-select';
import { Label } from '../components/label';

const meta: Meta<typeof DateSelect> = {
  title: 'Composites/DateSelect',
  component: DateSelect,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DateSelect>;

export const Input: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="space-y-2 max-w-sm">
        <Label htmlFor="date">Date of birth</Label>
        <DateSelect id="date" value={value} onChange={setValue} />
      </div>
    );
  },
};

export const Pill: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Filter by date:</span>
        <DateSelect variant="pill" value={value} onChange={setValue} placeholder="Any date" />
      </div>
    );
  },
};

export const WithMinMax: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="space-y-2 max-w-sm">
        <Label>Range: 2026-01-01 → 2026-12-31</Label>
        <DateSelect value={value} onChange={setValue} minDate="2026-01-01" maxDate="2026-12-31" />
      </div>
    );
  },
};

export const Preselected: Story = {
  render: () => {
    const [value, setValue] = useState('2026-05-21');
    return (
      <div className="space-y-2 max-w-sm">
        <Label>Meeting date</Label>
        <DateSelect value={value} onChange={setValue} />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-2 max-w-sm">
      <Label>Locked</Label>
      <DateSelect value="2026-05-21" onChange={() => {}} disabled />
    </div>
  ),
};
