"use client";

import React, { useMemo, useRef, useState } from "react";
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const totalPages = rowsPerPage > 0 ? Math.ceil(rows.length / rowsPerPage) : 0;
  const maxPage = Math.max(totalPages - 1, 0);
  const safePage = Math.min(page, maxPage);

  const pagedRows = useMemo(() => {
    if (!rows.length) {
      return rows;
    }
    const start = safePage * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, rowsPerPage, safePage]);

  const scrollToTop = (behavior: ScrollBehavior = "auto") => {
    if (typeof window === "undefined") {
      return;
    }
    const startNode = rootRef.current;
    let el: HTMLElement | null = startNode;
    while (el) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      const isScrollable =
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") && el.scrollHeight > el.clientHeight;
      if (isScrollable) {
        el.scrollTo({ top: 0, behavior });
        return;
      }
      el = el.parentElement;
    }
    const mainEl = document.querySelector("main");
    if (mainEl instanceof HTMLElement) {
      mainEl.scrollTo({ top: 0, behavior });
      return;
    }
    window.scrollTo({ top: 0, behavior });
  };

  const blurActiveElement = () => {
    if (typeof document === "undefined") {
      return;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
  };

  const scheduleScrollToTop = () => {
    if (typeof window === "undefined") {
      return;
    }
    const run = () => scrollToTop("auto");
    window.requestAnimationFrame(run);
    window.requestAnimationFrame(run);
  };

  const handleChangePage = (_event: unknown, nextPage: number) => {
    blurActiveElement();
    setPage(Math.min(nextPage, maxPage));
    scheduleScrollToTop();
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    blurActiveElement();
    setRowsPerPage(Number(event.target.value));
    setPage(0);
    scheduleScrollToTop();
  };

  return (
    <div className="flex flex-col gap-2" ref={rootRef}>
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
          page={safePage}
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
