import type { Meta, StoryObj } from '@storybook/react';
import { Label } from '../components/label';
import { Input } from '../components/input';

const meta: Meta<typeof Label> = {
  title: 'Form Controls/Label',
  component: Label,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  render: () => (
    <div className="space-y-2 max-w-sm">
      <Label htmlFor="branch">Branch</Label>
      <Input id="branch" placeholder="Choose a branch" />
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="space-y-2 max-w-sm">
      <Label htmlFor="name">
        Full name <span className="text-destructive">*</span>
      </Label>
      <Input id="name" required />
    </div>
  ),
};
