import type { Meta, StoryObj } from '@storybook/react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '../components/table';
import { Badge } from '../components/badge';

const meta: Meta<typeof Table> = {
  title: 'Layout/Table',
  component: Table,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Table>;

const rows = [
  { name: 'Alice Ade', role: 'Fellowship Leader', status: 'Active', attendance: '92%' },
  { name: 'Ben Owusu', role: 'Deputy',              status: 'Active', attendance: '88%' },
  { name: 'Chidi Okafor', role: 'Member',           status: 'Draft',  attendance: '—' },
  { name: 'Dara Ade',    role: 'Member',            status: 'Active', attendance: '76%' },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>Fellowship members — Central London</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Attendance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.name}>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell>{r.role}</TableCell>
            <TableCell>
              <Badge variant={r.status === 'Active' ? 'default' : 'secondary'}>{r.status}</Badge>
            </TableCell>
            <TableCell className="text-right">{r.attendance}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
