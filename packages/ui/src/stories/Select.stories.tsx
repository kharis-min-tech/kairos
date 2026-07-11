import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Select } from '../components/select';
import { Label } from '../components/label';

const meta: Meta<typeof Select> = {
  title: 'Form Controls/Select',
  component: Select,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('member');
    return (
      <div className="space-y-2 max-w-sm">
        <Label htmlFor="role">Role</Label>
        <Select id="role" value={value} onValueChange={setValue}>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="visitor">Visitor</option>
        </Select>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-2 max-w-sm">
      <Label htmlFor="role-ro">Role (locked)</Label>
      <Select id="role-ro" value="admin" disabled>
        <option value="admin">Admin</option>
      </Select>
    </div>
  ),
};
