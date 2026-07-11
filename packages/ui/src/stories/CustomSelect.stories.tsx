import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CustomSelect } from '../components/custom-select';
import { Label } from '../components/label';

const meta: Meta<typeof CustomSelect> = {
  title: 'Form Controls/CustomSelect',
  component: CustomSelect,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CustomSelect>;

const branches = [
  { value: 'london', label: 'London' },
  { value: 'manchester', label: 'Manchester' },
  { value: 'birmingham', label: 'Birmingham' },
  { value: 'leeds', label: 'Leeds', disabled: true },
];

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="space-y-2 max-w-sm">
        <Label htmlFor="branch">Branch</Label>
        <CustomSelect
          id="branch"
          value={value}
          onValueChange={setValue}
          options={branches}
          placeholder="Choose a branch"
        />
      </div>
    );
  },
};

export const Preselected: Story = {
  render: () => {
    const [value, setValue] = useState('manchester');
    return (
      <div className="space-y-2 max-w-sm">
        <Label htmlFor="branch2">Branch</Label>
        <CustomSelect
          id="branch2"
          value={value}
          onValueChange={setValue}
          options={branches}
        />
      </div>
    );
  },
};

export const Small: Story = {
  render: () => {
    const [value, setValue] = useState('london');
    return (
      <div className="max-w-xs">
        <CustomSelect
          value={value}
          onValueChange={setValue}
          options={branches}
          size="sm"
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-2 max-w-sm">
      <Label htmlFor="branch3">Branch (locked)</Label>
      <CustomSelect
        id="branch3"
        value="london"
        onValueChange={() => {}}
        options={branches}
        disabled
      />
    </div>
  ),
};
