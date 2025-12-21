"use client";

import { useMemo, useState } from "react";
import ToolBar, { FilterDefinition, FilterRow } from "@/components/ToolBar";
import SummaryCards, { SummaryCard } from "@/components/SummaryCards";
import ClientMasterTableView from "@/features/client-master/ClientMasterTableView";
import DeleteClientDialog from "@/features/client-master/DeleteClientDialog";
import EditClientModal from "@/features/client-master/EditClientModal";
import NewClientModal from "@/features/client-master/NewClientModal";
import { ClientRow, clientRows } from "@/mock/clientMasterData";

const statusLabels: Record<string, string> = {
  active: "有効",
  inactive: "無効",
};

export default function ClientMasterView() {
  const [rows, setRows] = useState<ClientRow[]>(clientRows);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ClientRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<ClientRow | null>(null);

  const filterDefinitions = useMemo<FilterDefinition[]>(() => {
    const uniqueValues = (values: string[]) => Array.from(new Set(values));

    const categoryOptions = uniqueValues(rows.map((row) => row.category)).map((value) => ({
      value,
      label: value,
    }));
    const regionOptions = uniqueValues(rows.map((row) => row.region)).map((value) => ({
      value,
      label: value,
    }));
    const currencyOptions = uniqueValues(rows.map((row) => row.currency)).map((value) => ({
      value,
      label: value,
    }));
    const statusOptions = [
      { value: "active", label: statusLabels.active },
      { value: "inactive", label: statusLabels.inactive },
    ];

    return [
      { key: "category", label: "区分", type: "select", options: categoryOptions },
      { key: "region", label: "地域", type: "select", options: regionOptions },
      { key: "currency", label: "通貨", type: "select", options: currencyOptions },
      { key: "status", label: "ステータス", type: "select", options: statusOptions },
      { key: "name", label: "仕入先", type: "text" },
    ];
  }, [rows]);

  const filterDefinitionMap = useMemo(() => {
    const map = new Map<string, FilterDefinition>();
    filterDefinitions.forEach((definition) => map.set(definition.key, definition));
    return map;
  }, [filterDefinitions]);

  const getOptions = (key: string) => filterDefinitionMap.get(key)?.options ?? [];

  const filteredRows = useMemo(() => {
    const groupedFilters = filters.reduce<Record<string, string[]>>((acc, filter) => {
      if (!filter.value) {
        return acc;
      }
      if (!acc[filter.key]) {
        acc[filter.key] = [];
      }
      acc[filter.key].push(filter.value);
      return acc;
    }, {});

    return rows.filter((row) =>
      Object.entries(groupedFilters).every(([key, values]) => {
        if (!values.length) {
          return true;
        }
        switch (key) {
          case "category":
            return values.includes(row.category);
          case "region":
            return values.includes(row.region);
          case "currency":
            return values.includes(row.currency);
          case "status":
            return values.includes(row.status);
          case "name":
            return values.some((value) => row.name.toLowerCase().includes(value.toLowerCase()));
          default:
            return true;
        }
      })
    );
  }, [filters, rows]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const totalCount = rows.length;
    const activeCount = rows.filter((row) => row.status === "active").length;
    const inactiveCount = rows.filter((row) => row.status === "inactive").length;
    return [
      { label: "登録件数", value: totalCount, tone: "primary" },
      { label: "有効", value: activeCount, tone: "success" },
      { label: "無効", value: inactiveCount, tone: "muted" },
    ];
  }, [rows]);

  const handleCreate = () => {
    setIsCreateOpen(true);
  };

  const handleCreateClose = () => {
    setIsCreateOpen(false);
  };

  const handleCreateSave = (client: Omit<ClientRow, "id">) => {
    const nextId = rows.length ? Math.max(...rows.map((row) => row.id)) + 1 : 1;
    setRows((prev) => [...prev, { ...client, id: nextId }]);
    setIsCreateOpen(false);
  };

  const handleRowClick = (row: ClientRow) => {
    setEditingRow(row);
  };

  const handleEditClose = () => {
    setEditingRow(null);
  };

  const handleEditSave = (client: ClientRow) => {
    setRows((prev) => prev.map((row) => (row.id === client.id ? client : row)));
    setEditingRow(null);
  };

  const handleEditDelete = (client: ClientRow) => {
    setEditingRow(null);
    setDeletingRow(client);
  };

  const handleDeleteClick = (row: ClientRow) => {
    setDeletingRow(row);
  };

  const handleDeleteClose = () => {
    setDeletingRow(null);
  };

  const handleDeleteConfirm = (row: ClientRow) => {
    setRows((prev) => prev.filter((item) => item.id !== row.id));
    setDeletingRow(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards cards={summaryCards} />
      <ToolBar filterDefinitions={filterDefinitions} filters={filters} onFiltersChange={setFilters} onCreate={handleCreate} />
      <ClientMasterTableView
        rows={filteredRows}
        onRowClick={handleRowClick}
        onDelete={handleDeleteClick}
      />
      <NewClientModal
        open={isCreateOpen}
        onClose={handleCreateClose}
        onSave={handleCreateSave}
        categoryOptions={getOptions("category")}
        regionOptions={getOptions("region")}
        currencyOptions={getOptions("currency")}
        statusOptions={getOptions("status")}
      />
      <EditClientModal
        open={Boolean(editingRow)}
        client={editingRow}
        onClose={handleEditClose}
        onSave={handleEditSave}
        onDelete={handleEditDelete}
        categoryOptions={getOptions("category")}
        regionOptions={getOptions("region")}
        currencyOptions={getOptions("currency")}
        statusOptions={getOptions("status")}
      />
      <DeleteClientDialog
        open={Boolean(deletingRow)}
        client={deletingRow}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
