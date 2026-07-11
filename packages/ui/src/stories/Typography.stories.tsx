import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Design System/Typography',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Scale: Story = {
  render: () => (
    <div className="space-y-6 max-w-3xl">
      <Row label="text-3xl / semibold" cls="text-3xl font-semibold tracking-tight">Dashboard headline number</Row>
      <Row label="text-2xl / semibold" cls="text-2xl font-semibold">Card title</Row>
      <Row label="text-xl / semibold" cls="text-xl font-semibold">Section heading</Row>
      <Row label="text-lg / medium" cls="text-lg font-medium">Sub-section heading</Row>
      <Row label="text-base / normal" cls="text-base">Body copy. Kairos leans on tight, readable body text at 16px.</Row>
      <Row label="text-sm / medium" cls="text-sm font-medium">Labels, table cells, small controls.</Row>
      <Row label="text-xs / semibold" cls="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Captions, chips, meta</Row>
    </div>
  ),
};

function Row({ label, cls, children }: { label: string; cls: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-6 items-baseline border-b border-border pb-4">
      <div className="text-xs font-mono text-muted-foreground">{label}</div>
      <div className={cls}>{children}</div>
    </div>
  );
}
