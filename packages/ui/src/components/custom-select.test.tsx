import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomSelect } from './custom-select';

const options = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
];

describe('CustomSelect', () => {
  it('renders placeholder when no value is selected', () => {
    render(
      <CustomSelect value="" onValueChange={() => {}} options={options} placeholder="Pick fruit" />,
    );
    expect(screen.getByRole('button', { name: /pick fruit/i })).toBeInTheDocument();
  });

  it('renders selected option label when value matches', () => {
    render(<CustomSelect value="b" onValueChange={() => {}} options={options} />);
    expect(screen.getByRole('button', { name: /banana/i })).toBeInTheDocument();
  });

  it('opens panel and shows options when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<CustomSelect value="" onValueChange={() => {}} options={options} placeholder="Pick" />);
    await user.click(screen.getByRole('button', { name: /pick/i }));
    expect(screen.getByRole('button', { name: 'Apple' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Banana' })).toBeInTheDocument();
  });

  it('calls onValueChange with the selected value and closes the panel', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<CustomSelect value="" onValueChange={onValueChange} options={options} placeholder="Pick" />);
    await user.click(screen.getByRole('button', { name: /pick/i }));
    await user.click(screen.getByRole('button', { name: 'Apple' }));
    expect(onValueChange).toHaveBeenCalledWith('a');
    expect(screen.queryByRole('button', { name: 'Banana' })).not.toBeInTheDocument();
  });

  it('disables option buttons when option.disabled is true', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<CustomSelect value="" onValueChange={onValueChange} options={options} placeholder="Pick" />);
    await user.click(screen.getByRole('button', { name: /pick/i }));
    const cherry = screen.getByRole('button', { name: 'Cherry' });
    expect(cherry).toBeDisabled();
  });

  it('does not open the panel when the component itself is disabled', async () => {
    const user = userEvent.setup();
    render(
      <CustomSelect value="" onValueChange={() => {}} options={options} placeholder="Pick" disabled />,
    );
    const trigger = screen.getByRole('button', { name: /pick/i });
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole('button', { name: 'Apple' })).not.toBeInTheDocument();
  });

  it('closes the panel when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(<CustomSelect value="" onValueChange={() => {}} options={options} placeholder="Pick" />);
    const trigger = screen.getByRole('button', { name: /pick/i });
    await user.click(trigger);
    expect(screen.getByRole('button', { name: 'Apple' })).toBeInTheDocument();
    trigger.focus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Apple' })).not.toBeInTheDocument();
  });

  it('closes the panel when clicking outside the component', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <CustomSelect value="" onValueChange={() => {}} options={options} placeholder="Pick" />
        <button type="button">outside</button>
      </div>,
    );
    await user.click(screen.getByRole('button', { name: /pick/i }));
    expect(screen.getByRole('button', { name: 'Apple' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('button', { name: 'Apple' })).not.toBeInTheDocument();
  });

  // jsdom reports every rect as zero, so the panel's real width cannot be
  // asserted here. What can be asserted is that the default size commits to
  // an explicit width at all. Leaving it to the browser is what broke: the
  // panel is `fixed` with `left` and no width, its options are `w-full`, and
  // Chrome resolves that cycle by handing them the whole viewport -- so the
  // panel spanned the window and sat at its left edge, nowhere near the
  // field. `sm` opts out, because `w-max` genuinely hugs its options.
  it('gives the default panel an explicit width instead of letting it fill', async () => {
    const user = userEvent.setup();
    render(<CustomSelect value="" onValueChange={() => {}} options={options} placeholder="Pick" />);
    await user.click(screen.getByRole('button', { name: /pick/i }));
    const panel = screen.getByRole('button', { name: 'Apple' }).parentElement!;
    expect(panel.style.width).not.toBe('');
    expect(panel.className).not.toContain('w-max');
  });

  it('lets the sm panel hug its options', async () => {
    const user = userEvent.setup();
    render(
      <CustomSelect value="" onValueChange={() => {}} options={options} placeholder="Pick" size="sm" />,
    );
    await user.click(screen.getByRole('button', { name: /pick/i }));
    const panel = screen.getByRole('button', { name: 'Apple' }).parentElement!;
    expect(panel.className).toContain('w-max');
    expect(panel.style.width).toBe('');
  });

  it('renders the small-size variant', () => {
    render(
      <CustomSelect value="a" onValueChange={() => {}} options={options} size="sm" />,
    );
    // selected label still shows for sm variant
    expect(screen.getByRole('button', { name: /apple/i })).toBeInTheDocument();
  });
});
