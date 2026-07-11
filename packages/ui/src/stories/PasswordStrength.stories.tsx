import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { PasswordStrength } from '../components/password-strength';
import { Input } from '../components/input';
import { Label } from '../components/label';

const meta: Meta<typeof PasswordStrength> = {
  title: 'Composites/PasswordStrength',
  component: PasswordStrength,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PasswordStrength>;

export const Empty: Story = {
  render: () => (
    <div className="space-y-2 max-w-sm">
      <PasswordStrength password="" />
    </div>
  ),
};

export const Weak: Story = {
  render: () => (
    <div className="space-y-2 max-w-sm">
      <PasswordStrength password="abc" />
    </div>
  ),
};

export const Medium: Story = {
  render: () => (
    <div className="space-y-2 max-w-sm">
      <PasswordStrength password="Abcdef1" />
    </div>
  ),
};

export const Strong: Story = {
  render: () => (
    <div className="space-y-2 max-w-sm">
      <PasswordStrength password="Abcdef1!" />
    </div>
  ),
};

export const InteractiveForm: Story = {
  render: () => {
    const [password, setPassword] = useState('');
    return (
      <div className="space-y-3 max-w-sm">
        <Label htmlFor="pw">New password</Label>
        <Input
          id="pw"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordStrength password={password} />
      </div>
    );
  },
};
