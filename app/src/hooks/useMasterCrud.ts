"use client";

import { useCallback, useState } from "react";

type IdRow = {
  id: number;
};

export default function useMasterCrud<T extends IdRow>(
  initialRows: T[],
  createRow: (item: Omit<T, "id">, nextId: number) => T,
) {
  const [rows, setRows] = useState<T[]>(initialRows);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<T | null>(null);
  const [deletingRow, setDeletingRow] = useState<T | null>(null);

  /** API 取得後などで一覧を差し替えたいときに使う */
  const replaceRows = useCallback((nextRows: T[]) => setRows(nextRows), []);

  const openCreate = () => setIsCreateOpen(true);
  const closeCreate = () => setIsCreateOpen(false);

  const saveCreate = (item: Omit<T, "id">) => {
    const nextId = rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
    const newRow = createRow(item, nextId);
    setRows((prev) => [...prev, newRow]);
    closeCreate();
  };

  const openEdit = (row: T) => setEditingRow(row);
  const closeEdit = () => setEditingRow(null);

  const saveEdit = (next: T) => {
    setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)));
    closeEdit();
  };

  const openDelete = (row: T) => setDeletingRow(row);
  const closeDelete = () => setDeletingRow(null);

  const confirmDelete = (row: T) => {
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    closeDelete();
  };

  return {
    rows,
    replaceRows,
    isCreateOpen,
    editingRow,
    deletingRow,
    openCreate,
    closeCreate,
    saveCreate,
    openEdit,
    closeEdit,
    saveEdit,
    openDelete,
    closeDelete,
    confirmDelete,
  };
}
