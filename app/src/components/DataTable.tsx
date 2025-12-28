"use client";

import React from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { ChevronDown, ChevronUp } from "lucide-react";

type Align = "left" | "center" | "right";

export type TableColumn<T> = {
  key: string;
  header: React.ReactNode;
  align?: Align;
  width?: number | string;
  sortKey?: string;
  render?: (row: T) => React.ReactNode;
};

type TableProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string | number;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  enableHorizontalScroll?: boolean;
  containerClassName?: string;
};

export default function DataTable<T>({
  columns,
  rows,
  getRowId,
  sortKey,
  sortDirection = "asc",
  onSort,
  onRowClick,
  enableHorizontalScroll = false,
  containerClassName = "",
}: TableProps<T>) {
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      className={`border border-gray-200 rounded-xl w-full ${containerClassName}`}
      sx={{
        overflowX: enableHorizontalScroll ? "auto" : "visible",
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <Table
        sx={
          enableHorizontalScroll
            ? {
                width: "100%",
                minWidth: "max-content",
              }
            : undefined
        }
      >
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                align={column.align}
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "text.secondary",
                  width: column.width,
                  whiteSpace: enableHorizontalScroll ? "nowrap" : "normal",
                }}
              >
                {column.sortKey && onSort ? (
                  <button
                    type="button"
                    onClick={() => onSort(column.sortKey ?? "")}
                    className="inline-flex items-center gap-2 text-left text-gray-700 hover:text-gray-900"
                  >
                    <span>{column.header}</span>
                    <span className="flex flex-col leading-none">
                      <ChevronUp
                        size={14}
                        className={
                          sortKey === column.sortKey && sortDirection === "asc" ? "text-gray-700" : "text-gray-300"
                        }
                      />
                      <ChevronDown
                        size={14}
                        className={
                          sortKey === column.sortKey && sortDirection === "desc" ? "text-gray-700" : "text-gray-300"
                        }
                      />
                    </span>
                  </button>
                ) : (
                  column.header
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={getRowId(row)}
              hover
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? "cursor-pointer" : ""}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align}
                  sx={{ py: 2, whiteSpace: enableHorizontalScroll ? "nowrap" : "normal" }}
                >
                  {column.render ? column.render(row) : null}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
