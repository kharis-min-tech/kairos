import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders the message on its own, with no heading', () => {
    // The common case: inside a section whose header already named it, so a
    // heading here would say the same thing twice.
    render(<EmptyState message="Nobody added yet." />);
    expect(screen.getByText('Nobody added yet.')).toBeDefined();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('renders a title when one is given', () => {
    render(<EmptyState title="No submissions" message="Forms you fill in appear here." />);
    expect(screen.getByText('No submissions')).toBeDefined();
    expect(screen.getByText('Forms you fill in appear here.')).toBeDefined();
  });

  it('shows the action on the screen variant', () => {
    render(
      <EmptyState
        variant="screen"
        title="Add your children"
        message="They get a record of their own."
        action={<button type="button">Add a child</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add a child' })).toBeDefined();
  });

  it('ignores an action on the section variant, where the header owns it', () => {
    // A section's add button lives in its header beside the title. Rendering
    // a second one underneath would give the same section two.
    render(
      <EmptyState
        message="Nobody added yet."
        action={<button type="button">Add a child</button>}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers no way to pass an icon', () => {
    // The tinted icon circle is the thing this component exists to remove. If
    // an `icon` prop ever appears, this fails and whoever added it has to
    // explain why in a diff rather than reintroducing it one screen at a time.
    const props = Object.keys(
      EmptyState as unknown as Record<string, unknown>,
    );
    expect(props).not.toContain('icon');
    const rendered = render(<EmptyState message="Nothing here." />);
    expect(rendered.container.querySelector('svg')).toBeNull();
    expect(rendered.container.querySelector('.rounded-full')).toBeNull();
  });
});
