// Sync-only wrapper: bypasses the .storybook/preview decorator bundle
// (`@storybook/addon-themes` isn't covered by the converter's stubs).
// The Modern Sanctuary DS's light theme has no class marker (dark uses the
// `dark` class on an ancestor), so an identity wrapper renders every
// component in its default light theme — exactly what the compare oracle
// captures for the reference side.
import * as React from 'react';

export function PreviewWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
