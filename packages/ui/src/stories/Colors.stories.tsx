import type { Meta, StoryObj } from '@storybook/react';

interface SwatchProps {
  name: string;
  value: string;
  contrast?: 'light' | 'dark';
}

function Swatch({ name, value, contrast = 'light' }: SwatchProps) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-16 w-full rounded-lg shadow-ambient"
        style={{ backgroundColor: value }}
      >
        <div
          className={`p-2 text-xs font-medium ${contrast === 'light' ? 'text-white' : 'text-[#1c1c1c]'}`}
        >
          {value}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">{name}</div>
    </div>
  );
}

function Ladder({
  title,
  colors,
  darkAt = 400,
}: {
  title: string;
  colors: Record<string, string>;
  darkAt?: number;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-11">
        {Object.entries(colors).map(([shade, hex]) => (
          <Swatch
            key={shade}
            name={`${title.toLowerCase()}-${shade}`}
            value={hex}
            contrast={Number(shade) < darkAt ? 'dark' : 'light'}
          />
        ))}
      </div>
    </section>
  );
}

const primary = {
  '50':  '#f3f1fd',
  '100': '#e7e3fb',
  '200': '#cfc6f7',
  '300': '#aea0f0',
  '400': '#8970e6',
  '500': '#6f51da',
  '600': '#5d3fd3',
  '700': '#4d33b6',
  '800': '#3f2b96',
  '900': '#342677',
  '950': '#1f1750',
};

const accent = {
  '50':  '#fefbed',
  '100': '#fdf3c7',
  '200': '#fce18a',
  '300': '#facb52',
  '400': '#f8b537',
  '500': '#ed9d18',
  '600': '#d18012',
  '700': '#ad6313',
  '800': '#8c4f15',
  '900': '#744116',
  '950': '#432308',
};

const success = {
  '50':  '#ecfdf5',
  '100': '#d1fae5',
  '200': '#a7f3d0',
  '300': '#6ee7b7',
  '400': '#34d399',
  '500': '#10b981',
  '600': '#059669',
  '700': '#047857',
  '800': '#065f46',
  '900': '#064e3b',
};

const error = {
  '50':  '#fff1f2',
  '100': '#ffe4e6',
  '200': '#fecdd3',
  '300': '#fda4af',
  '400': '#fb7185',
  '500': '#f43f5e',
  '600': '#e11d48',
  '700': '#be123c',
  '800': '#9f1239',
  '900': '#881337',
};

const meta: Meta = {
  title: 'Design System/Colors',
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj;

export const Palette: Story = {
  render: () => (
    <div className="space-y-8 max-w-6xl">
      <Ladder title="Primary" colors={primary} darkAt={400} />
      <Ladder title="Accent" colors={accent} darkAt={500} />
      <Ladder title="Success" colors={success} darkAt={500} />
      <Ladder title="Error" colors={error} darkAt={400} />
    </div>
  ),
};

export const Semantic: Story = {
  render: () => (
    <div className="space-y-8 max-w-4xl">
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Semantic (CSS variables)</h3>
        <p className="text-sm text-muted-foreground">
          These render live via the current theme. Toggle light/dark in the toolbar.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SemanticSwatch name="background" className="bg-background text-foreground" />
          <SemanticSwatch name="card" className="bg-card text-card-foreground shadow-ambient" />
          <SemanticSwatch name="muted" className="bg-muted text-muted-foreground" />
          <SemanticSwatch name="secondary" className="bg-secondary text-secondary-foreground" />
          <SemanticSwatch name="primary" className="bg-primary text-primary-foreground" />
          <SemanticSwatch name="accent" className="bg-accent text-accent-foreground" />
          <SemanticSwatch name="destructive" className="bg-destructive text-destructive-foreground" />
          <SemanticSwatch name="success" className="bg-success text-success-foreground" />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Primary gradient</h3>
        <div className="h-24 w-full rounded-lg bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] p-4 text-white font-medium shadow-ambient">
          from-[#451ebb] to-[#5d3fd3]
        </div>
      </section>
    </div>
  ),
};

function SemanticSwatch({ name, className }: { name: string; className: string }) {
  return (
    <div className={`flex h-20 items-center justify-center rounded-lg border border-border ${className}`}>
      <span className="text-sm font-medium">{name}</span>
    </div>
  );
}
