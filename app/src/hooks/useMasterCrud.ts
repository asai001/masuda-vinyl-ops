"use client";

import { useState } from "react";

type IdRow = {
  id: number;
};

export default function useMasterCrud<T extends IdRow>(initialRows: T[], createRow: (item: Omit<T, "id">, nextId: number) => T) {
  const [rows, setRows] = useState<T[]>(initialRows);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<T | null>(null);
  const [deletingRow, setDeletingRow] = useState<T | null>(null);

  const openCreate = () => setIsCreateOpen(true);
  const closeCreate = () => setIsCreateOpen(false);

  const saveCreate = (item: Omit<T, "id">) => {
    // state のセット関数に関数を渡すと、引数（prev）として現在の値（rows）が扱える
    setRows((prev) => {
      const nextId = prev.length ? Math.max(...prev.map((row) => row.id)) + 1 : 1;
      return [...prev, createRow(item, nextId)]; // return したものが rows にセットされる
    });
    setIsCreateOpen(false);
  };

  const openEdit = (row: T) => setEditingRow(row);
  const closeEdit = () => setEditingRow(null);

  const saveEdit = (row: T) => {
    setRows((prev) => prev.map((item) => (item.id === row.id ? row : item)));
    setEditingRow(null);
  };

  const openDelete = (row: T) => setDeletingRow(row);
  const closeDelete = () => setDeletingRow(null);

  const confirmDelete = (row: T) => {
    setRows((prev) => prev.filter((item) => item.id !== row.id));
    setDeletingRow(null);
  };

  return {
    rows,
    setRows,
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
