"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow } from "@mui/material";
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
  defaultRowsPerPage?: number;
  rowsPerPageOptions?: number[];
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
  defaultRowsPerPage = 10,
  rowsPerPageOptions = [10, 25, 50],
}: TableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= rows.length) {
      setPage(0);
    }
  }, [page, rows.length, rowsPerPage]);

  const pagedRows = useMemo(() => {
    if (!rows.length) {
      return rows;
    }
    const start = page * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [page, rows, rowsPerPage]);

  const handleChangePage = (_event: unknown, nextPage: number) => {
    setPage(nextPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-2">
      <TableContainer
        component={Paper}
        elevation={0}
        className={`border border-gray-200 rounded-xl w-full ${containerClassName}`}
        sx={{
          overflowX: "auto",
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
              : { width: "100%" }
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
                    whiteSpace: "nowrap",
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
            {pagedRows.map((row) => (
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
      {rows.length > 0 ? (
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          labelRowsPerPage="表示件数"
        />
      ) : null}
    </div>
  );
}
