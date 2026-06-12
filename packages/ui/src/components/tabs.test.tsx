import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

// Controlled-only test harness. Mirrors the dashboard/reports callers, which
// always own the value via useState.
function Harness({
  initial = 'a',
  onValueChangeSpy,
}: {
  initial?: string;
  onValueChangeSpy?: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Tabs
      value={value}
      onValueChange={(v) => {
        onValueChangeSpy?.(v);
        setValue(v);
      }}
    >
      <TabsList aria-label="Test tabs">
        <TabsTrigger value="a">A label</TabsTrigger>
        <TabsTrigger value="b">B label</TabsTrigger>
        <TabsTrigger value="c">C label</TabsTrigger>
      </TabsList>
      <TabsContent value="a">A panel content</TabsContent>
      <TabsContent value="b">B panel content</TabsContent>
      <TabsContent value="c">C panel content</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('renders all triggers and only the active panel', () => {
    render(<Harness initial="a" />);
    expect(screen.getByRole('tab', { name: 'A label' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'B label' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'C label' })).toBeInTheDocument();
    expect(screen.getByText('A panel content')).toBeInTheDocument();
    expect(screen.queryByText('B panel content')).not.toBeInTheDocument();
    expect(screen.queryByText('C panel content')).not.toBeInTheDocument();
  });

  it('clicking a trigger calls onValueChange and switches panel', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness initial="a" onValueChangeSpy={spy} />);
    await user.click(screen.getByRole('tab', { name: 'B label' }));
    expect(spy).toHaveBeenCalledWith('b');
    expect(screen.getByText('B panel content')).toBeInTheDocument();
    expect(screen.queryByText('A panel content')).not.toBeInTheDocument();
  });

  it('sets correct ARIA roles on list, triggers, and panel', () => {
    render(<Harness initial="a" />);
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Test tabs');
    const a = screen.getByRole('tab', { name: 'A label' });
    const b = screen.getByRole('tab', { name: 'B label' });
    expect(a).toHaveAttribute('aria-selected', 'true');
    expect(b).toHaveAttribute('aria-selected', 'false');
    // aria-pressed mirrors aria-selected for backward compatibility with the
    // toggle-button-style ARIA the prior inline implementations exposed.
    expect(a).toHaveAttribute('aria-pressed', 'true');
    expect(b).toHaveAttribute('aria-pressed', 'false');
    expect(a).toHaveAttribute('tabindex', '0');
    expect(b).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('wires aria-labelledby on each panel to its trigger id', async () => {
    const user = userEvent.setup();
    render(<Harness initial="a" />);
    const aTrigger = screen.getByRole('tab', { name: 'A label' });
    const aPanel = screen.getByRole('tabpanel');
    expect(aPanel.getAttribute('aria-labelledby')).toBe(aTrigger.id);

    await user.click(screen.getByRole('tab', { name: 'C label' }));
    const cTrigger = screen.getByRole('tab', { name: 'C label' });
    const cPanel = screen.getByRole('tabpanel');
    expect(cPanel.getAttribute('aria-labelledby')).toBe(cTrigger.id);
  });

  it('ArrowRight moves focus and activates the next trigger', async () => {
    const user = userEvent.setup();
    render(<Harness initial="a" />);
    const a = screen.getByRole('tab', { name: 'A label' });
    act(() => a.focus());
    await user.keyboard('{ArrowRight}');
    const b = screen.getByRole('tab', { name: 'B label' });
    expect(b).toHaveAttribute('aria-selected', 'true');
    expect(b).toHaveFocus();
  });

  it('ArrowLeft moves focus to the previous trigger (wrapping)', async () => {
    const user = userEvent.setup();
    render(<Harness initial="a" />);
    const a = screen.getByRole('tab', { name: 'A label' });
    act(() => a.focus());
    await user.keyboard('{ArrowLeft}');
    const c = screen.getByRole('tab', { name: 'C label' });
    expect(c).toHaveAttribute('aria-selected', 'true');
    expect(c).toHaveFocus();
  });

  it('Home jumps to the first trigger, End jumps to the last', async () => {
    const user = userEvent.setup();
    render(<Harness initial="b" />);
    const b = screen.getByRole('tab', { name: 'B label' });
    act(() => b.focus());

    await user.keyboard('{End}');
    const c = screen.getByRole('tab', { name: 'C label' });
    expect(c).toHaveAttribute('aria-selected', 'true');
    expect(c).toHaveFocus();

    await user.keyboard('{Home}');
    const a = screen.getByRole('tab', { name: 'A label' });
    expect(a).toHaveAttribute('aria-selected', 'true');
    expect(a).toHaveFocus();
  });

  it('throws a helpful error when sub-components are used outside Tabs', () => {
    // Silence the expected React error boundary log for this assertion path.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TabsTrigger value="x">x</TabsTrigger>)).toThrow(
      /must be rendered inside <Tabs>/,
    );
    spy.mockRestore();
  });

  it('applies active styling to the active trigger', () => {
    render(<Harness initial="b" />);
    const b = screen.getByRole('tab', { name: 'B label' });
    expect(b.className).toContain('bg-[#5D3FD3]');
    expect(b.className).toContain('text-white');
    const a = screen.getByRole('tab', { name: 'A label' });
    expect(a.className).toContain('text-muted-foreground');
  });

  it('passes className through on all sub-components', () => {
    render(
      <Tabs value="a" onValueChange={() => {}} className="root-cls">
        <TabsList className="list-cls" aria-label="x">
          <TabsTrigger value="a" className="trig-cls">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a" className="panel-cls">panel</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tablist').className).toContain('list-cls');
    expect(screen.getByRole('tab', { name: 'A' }).className).toContain('trig-cls');
    expect(screen.getByRole('tabpanel').className).toContain('panel-cls');
  });
});
