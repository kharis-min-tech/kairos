'use client';

import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  enableSelection?: boolean;
  enableSorting?: boolean;
  pageSize?: number;
  onRowAction?: (row: T) => void;
  onSelectionChange?: (rows: T[]) => void;
}

function DataTable<T>({
  data,
  columns,
  enableSelection = false,
  enableSorting = true,
  pageSize = 50,
  onSelectionChange,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const allColumns: ColumnDef<T, unknown>[] = enableSelection
    ? [
        {
          id: 'select',
          header: ({ table }) => (
            <input
              type="checkbox"
              checked={table.getIsAllPageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              aria-label="Select all rows"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          ),
          cell: ({ row }) => (
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              aria-label={`Select row ${row.index + 1}`}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          ),
          size: 40,
        },
        ...columns,
      ]
    : columns;

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(next);
      if (onSelectionChange) {
        const selectedRows = Object.keys(next)
          .filter((k) => next[k])
          .map((k) => data[parseInt(k)])
          .filter((row): row is T => row !== undefined);
        onSelectionChange(selectedRows);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    enableRowSelection: enableSelection,
  });

  return (
    <div className="w-full">
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm" role="grid">
          <thead className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
                        onClick={header.column.getToggleSortingHandler()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            header.column.getToggleSortingHandler()?.(e);
                          }
                        }}
                        tabIndex={header.column.getCanSort() ? 0 : undefined}
                        role={header.column.getCanSort() ? 'button' : undefined}
                        aria-label={header.column.getCanSort() ? `Sort by ${flexRender(header.column.columnDef.header, header.getContext())}` : undefined}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-gray-400">
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp size={14} />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronsUpDown size={14} />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={allColumns.length} className="px-4 py-8 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-gray-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm text-gray-500">
          {enableSelection && Object.keys(rowSelection).filter((k) => rowSelection[k]).length > 0 && (
            <span className="mr-4 font-medium">
              {Object.keys(rowSelection).filter((k) => rowSelection[k]).length} selected
            </span>
          )}
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export { DataTable };
export type { DataTableProps };
