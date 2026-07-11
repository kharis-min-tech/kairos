import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Layout/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('overview');
    return (
      <Tabs value={value} onValueChange={setValue} className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <p className="text-sm text-muted-foreground">Overview panel content.</p>
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <p className="text-sm text-muted-foreground">Members panel content.</p>
        </TabsContent>
        <TabsContent value="meetings" className="mt-4">
          <p className="text-sm text-muted-foreground">Meetings panel content.</p>
        </TabsContent>
      </Tabs>
    );
  },
};
