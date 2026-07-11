import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { NumberStepper } from '../components/number-stepper';
import { Label } from '../components/label';

const meta: Meta<typeof NumberStepper> = {
  title: 'Form Controls/NumberStepper',
  component: NumberStepper,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NumberStepper>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState(28);
    return (
      <div className="space-y-2 max-w-xs">
        <Label>Probation days</Label>
        <NumberStepper value={value} onValueChange={setValue} min={7} max={90} step={7} suffix="d" />
      </div>
    );
  },
};

export const NoSuffix: Story = {
  render: () => {
    const [value, setValue] = useState(3);
    return (
      <div className="space-y-2 max-w-xs">
        <Label>Sessions per week</Label>
        <NumberStepper value={value} onValueChange={setValue} min={1} max={7} />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-2 max-w-xs">
      <Label>Locked value</Label>
      <NumberStepper value={28} onValueChange={() => {}} disabled suffix="d" />
    </div>
  ),
};
