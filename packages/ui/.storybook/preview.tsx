import type { Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';
import '../src/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: { disable: true },
    layout: 'padded',
    options: {
      storySort: {
        order: [
          'Design System',
          ['Introduction', 'Colors', 'Typography'],
          'Layout',
          'Buttons & Actions',
          'Form Controls',
          'Composites',
          ['ConfirmDialog', 'DateSelect', 'PasswordStrength'],
        ],
      },
    },
  },
  decorators: [
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],
};

export default preview;
