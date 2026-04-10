import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';
import { DataTable } from './data-table';
import type { ColumnDef } from '@tanstack/react-table';

afterEach(cleanup);

interface TestRow {
  id: number;
  name: string;
  status: string;
}

const testData: TestRow[] = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  name: `Member ${i + 1}`,
  status: i % 2 === 0 ? 'Active' : 'Inactive',
}));

const columns: ColumnDef<TestRow, unknown>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
];

describe('DataTable', () => {
  it('renders data rows', () => {
    render(<DataTable data={testData} columns={columns} />);
    expect(screen.getByText('Member 1')).toBeInTheDocument();
    expect(screen.getByText('Member 5')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<DataTable data={testData} columns={columns} />);
    const thead = screen.getAllByRole('row')[0]!;
    expect(within(thead).getByText('ID')).toBeInTheDocument();
    expect(within(thead).getByText('Name')).toBeInTheDocument();
    expect(within(thead).getByText('Status')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<DataTable data={[]} columns={columns} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('sorts columns when header is clicked', async () => {
    const user = userEvent.setup();
    render(<DataTable data={testData} columns={columns} enableSorting />);

    const sortBtn = screen.getByRole('button', { name: /sort by name/i });
    await user.click(sortBtn);

    const rows = screen.getAllByRole('row');
    // Header row + 5 data rows
    expect(rows).toHaveLength(6);
  });

  it('renders selection checkboxes when enabled', () => {
    render(<DataTable data={testData} columns={columns} enableSelection />);
    const checkboxes = screen.getAllByRole('checkbox');
    // 1 header checkbox + 5 row checkboxes
    expect(checkboxes).toHaveLength(6);
  });

  it('paginates data', () => {
    const largeData = Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      name: `Member ${i + 1}`,
      status: 'Active',
    }));

    render(<DataTable data={largeData} columns={columns} pageSize={10} />);
    expect(screen.getByText('Page 1 of 6')).toBeInTheDocument();
  });

  it('navigates between pages', async () => {
    const user = userEvent.setup();
    const largeData = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Member ${i + 1}`,
      status: 'Active',
    }));

    render(<DataTable data={largeData} columns={columns} pageSize={10} />);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Next page'));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Previous page'));
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('has accessible sort buttons', () => {
    render(<DataTable data={testData} columns={columns} enableSorting />);
    const sortButtons = screen.getAllByRole('button', { name: /sort by/i });
    expect(sortButtons.length).toBeGreaterThan(0);
  });
});
