import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/card';
import { Button } from '../components/button';
import { Badge } from '../components/badge';

const meta: Meta<typeof Card> = {
  title: 'Layout/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Simple: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Fellowship overview</CardTitle>
        <CardDescription>Central London Sunday Group</CardDescription>
      </CardHeader>
      <CardContent>
        A short paragraph of card body content sits here.
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Delete fellowship?</CardTitle>
        <CardDescription>This can be undone within 30 days.</CardDescription>
      </CardHeader>
      <CardContent>
        All members will lose access to internal fellowship channels.
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="ghost">Cancel</Button>
        <Button variant="destructive">Delete</Button>
      </CardFooter>
    </Card>
  ),
};

export const StatCard: Story = {
  render: () => (
    <Card className="max-w-xs">
      <CardHeader className="pb-2">
        <CardDescription>Active members</CardDescription>
        <CardTitle className="text-3xl">128</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary">+12% MoM</Badge>
      </CardContent>
    </Card>
  ),
};
