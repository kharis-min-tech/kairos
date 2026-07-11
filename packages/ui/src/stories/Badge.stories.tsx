import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../components/badge';

const meta: Meta<typeof Badge> = {
  title: 'Buttons & Actions/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { children: 'Active' } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge>Active</Badge>
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="destructive">Expired</Badge>
      <Badge variant="outline">Pending</Badge>
    </div>
  ),
};

export const StatusChips: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Verified</Badge>
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="outline">New believer</Badge>
      <Badge variant="destructive">Overdue</Badge>
    </div>
  ),
};
