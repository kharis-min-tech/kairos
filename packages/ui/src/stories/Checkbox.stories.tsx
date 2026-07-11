import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Checkbox } from '../components/checkbox';
import { Label } from '../components/label';

const meta: Meta<typeof Checkbox> = {
  title: 'Form Controls/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Unchecked: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="c1" />
      <Label htmlFor="c1">Send me weekly digest emails</Label>
    </div>
  ),
};

export const Checked: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="c2" defaultChecked />
      <Label htmlFor="c2">I agree to the terms</Label>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Checkbox id="c3" disabled />
        <Label htmlFor="c3">Disabled and unchecked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="c4" disabled defaultChecked />
        <Label htmlFor="c4">Disabled and checked</Label>
      </div>
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id="c5"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <Label htmlFor="c5">{checked ? 'Checked' : 'Unchecked'}</Label>
      </div>
    );
  },
};
