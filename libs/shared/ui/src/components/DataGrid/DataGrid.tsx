import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../Table';
import { Button } from '../Button';
import { Input } from '../Input';
import { cn } from '../../utils';

export interface DataGridColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

export interface DataGridProps<T = any> {
  columns: DataGridColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  searchable?: boolean;
  onSearch?: (value: string) => void;
  className?: string;
}

type SortOrder = 'asc' | 'desc' | null;

export function DataGrid<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  searchable = false,
  onSearch,
  className,
}: DataGridProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [searchValue, setSearchValue] = useState('');

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortOrder(
        sortOrder === 'asc' ? 'desc' : sortOrder === 'desc' ? null : 'asc'
      );
    } else {
      setSortColumn(columnKey);
      setSortOrder('asc');
    }
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortOrder) return data;

    return [...data].sort((a, b) => {
      const column = columns.find((col) => col.key === sortColumn);
      if (!column?.dataIndex) return 0;

      const aValue = a[column.dataIndex];
      const bValue = b[column.dataIndex];

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortOrder, columns]);

  const renderSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return (
        <svg
          className="w-4 h-4 ml-1 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }

    return sortOrder === 'asc' ? (
      <svg
        className="w-4 h-4 ml-1 text-primary-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 ml-1 text-primary-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {searchable && (
        <div className="flex justify-between items-center">
          <Input
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      <div className="border border-neutral-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    column.sortable && 'cursor-pointer hover:bg-neutral-100',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                  style={{ width: column.width }}
                  onClick={
                    column.sortable ? () => handleSort(column.key) : undefined
                  }
                >
                  <div className="flex items-center">
                    {column.title}
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-8"
                >
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-2"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : sortedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-8 text-neutral-500"
                >
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((record, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.render
                        ? column.render(
                            column.dataIndex
                              ? record[column.dataIndex]
                              : undefined,
                            record,
                            index
                          )
                        : column.dataIndex
                          ? record[column.dataIndex]
                          : ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-700">
            Showing {(pagination.current - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(
              pagination.current * pagination.pageSize,
              pagination.total
            )}{' '}
            of {pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.current === 1}
              onClick={() =>
                pagination.onChange(pagination.current - 1, pagination.pageSize)
              }
            >
              Previous
            </Button>
            <span className="text-sm text-neutral-700">
              Page {pagination.current} of{' '}
              {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={
                pagination.current >=
                Math.ceil(pagination.total / pagination.pageSize)
              }
              onClick={() =>
                pagination.onChange(pagination.current + 1, pagination.pageSize)
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
