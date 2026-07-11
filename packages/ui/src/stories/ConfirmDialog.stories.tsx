import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ConfirmDialog, useConfirm } from '../components/confirm-dialog';
import { Button } from '../components/button';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Composites/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Delete fellowship</Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete fellowship?"
          description="This action can be undone within 30 days."
          variant="destructive"
          confirmLabel="Delete"
          onConfirm={() => setOpen(false)}
        />
      </>
    );
  },
};

export const NonDestructive: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>Archive</Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Archive this program?"
          description="You can restore archived programs from the Admin panel."
          confirmLabel="Archive"
          onConfirm={() => setOpen(false)}
        />
      </>
    );
  },
};

export const Pending: Story = {
  render: () => (
    <ConfirmDialog
      open={true}
      onOpenChange={() => {}}
      title="Deleting…"
      description="Please wait while we remove this record."
      variant="destructive"
      confirmLabel="Delete"
      isPending
      onConfirm={() => {}}
    />
  ),
};

export const WithUseConfirm: Story = {
  render: () => {
    const { confirm, dialog } = useConfirm();
    const [result, setResult] = useState<string>('');
    const handleClick = async () => {
      const ok = await confirm({
        title: 'Delete member?',
        description: 'This can be reversed within 30 days.',
        variant: 'destructive',
        confirmLabel: 'Delete',
      });
      setResult(ok ? 'Confirmed' : 'Cancelled');
    };
    return (
      <div className="space-y-3">
        <Button variant="destructive" onClick={handleClick}>Delete member</Button>
        {result && <div className="text-sm text-muted-foreground">Result: {result}</div>}
        {dialog}
      </div>
    );
  },
};
