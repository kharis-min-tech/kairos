import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from '../components/textarea';
import { Label } from '../components/label';

const meta: Meta<typeof Textarea> = {
  title: 'Form Controls/Textarea',
  component: Textarea,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  render: () => (
    <div className="space-y-2 max-w-md">
      <Label htmlFor="notes">Session notes</Label>
      <Textarea id="notes" rows={5} placeholder="What was covered?" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-2 max-w-md">
      <Label htmlFor="notes-ro">Read-only notes</Label>
      <Textarea id="notes-ro" disabled defaultValue="Reviewed session 3." />
    </div>
  ),
};
