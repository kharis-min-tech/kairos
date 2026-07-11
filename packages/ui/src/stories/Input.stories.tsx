import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../components/input';
import { Label } from '../components/label';

const meta: Meta<typeof Input> = {
  title: 'Form Controls/Input',
  component: Input,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  render: () => (
    <div className="space-y-2 max-w-sm">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="text">Text</Label>
        <Input id="text" placeholder="Any text" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email2">Email</Label>
        <Input id="email2" type="email" placeholder="you@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="••••••••" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="search">Search</Label>
        <Input id="search" type="search" placeholder="Search members…" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tel">Phone</Label>
        <Input id="tel" type="tel" placeholder="+44 …" />
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-2 max-w-sm">
      <Label htmlFor="disabled">Read-only field</Label>
      <Input id="disabled" disabled defaultValue="member@kharis.org" />
    </div>
  ),
};
