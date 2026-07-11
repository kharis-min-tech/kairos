import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { TimeSelect } from '../components/time-select';
import { Label } from '../components/label';

const meta: Meta<typeof TimeSelect> = {
  title: 'Form Controls/TimeSelect',
  component: TimeSelect,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TimeSelect>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('09:00');
    return (
      <div className="space-y-2 max-w-sm">
        <Label>Meeting time</Label>
        <TimeSelect value={value} onValueChange={setValue} minuteStep={15} />
      </div>
    );
  },
};

export const WithClear: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="space-y-2 max-w-sm">
        <Label>Optional time</Label>
        <TimeSelect value={value} onValueChange={setValue} minuteStep={5} allowEmpty />
      </div>
    );
  },
};
