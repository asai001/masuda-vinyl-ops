"use client";

import { useMemo, useState } from "react";
import { Box, CheckCircle, Clock } from "lucide-react";
import ToolBar, { FilterDefinition, FilterRow } from "@/components/ToolBar";
import SummaryCards, { SummaryCard } from "@/components/SummaryCards";
import useMasterCrud from "@/hooks/useMasterCrud";
import DeleteMaterialDialog from "@/features/material-master/DeleteMaterialDialog";
import EditMaterialModal from "@/features/material-master/EditMaterialModal";
import MaterialMasterTableView from "@/features/material-master/MaterialMasterTableView";
import NewMaterialModal from "@/features/material-master/NewMaterialModal";
import { MaterialRow, materialRows } from "@/mock/materialMasterData";

const statusLabels: Record<string, string> = {
  active: "有効",
  inactive: "無効",
};

export default function MaterialMasterView() {
  const {
    rows,
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
  } = useMasterCrud<MaterialRow>(materialRows, (item, nextId) => ({ ...item, id: nextId }));
  const [filters, setFilters] = useState<FilterRow[]>([]);

  const filterDefinitions = useMemo<FilterDefinition[]>(() => {
    const uniqueValues = (values: string[]) => Array.from(new Set(values));

    const categoryOptions = uniqueValues(rows.map((row) => row.category)).map((value) => ({
      value,
      label: value,
    }));
    const supplierOptions = uniqueValues(rows.map((row) => row.supplier)).map((value) => ({
      value,
      label: value,
    }));
    const unitOptions = uniqueValues(rows.map((row) => row.unit)).map((value) => ({
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
      { key: "category", label: "カテゴリ", type: "select", options: categoryOptions },
      { key: "supplier", label: "仕入先", type: "select", options: supplierOptions },
      { key: "unit", label: "単位", type: "select", options: unitOptions },
      { key: "currency", label: "通貨", type: "select", options: currencyOptions },
      { key: "status", label: "ステータス", type: "select", options: statusOptions },
      { key: "code", label: "品番", type: "text" },
      { key: "name", label: "品目名", type: "text" },
      { key: "unitPrice", label: "標準単価", type: "range" },
    ];
  }, [rows]);

  const filterDefinitionMap = useMemo(() => {
    const map = new Map<string, FilterDefinition>();
    filterDefinitions.forEach((definition) => map.set(definition.key, definition));
    return map;
  }, [filterDefinitions]);

  const getOptions = (key: string) => filterDefinitionMap.get(key)?.options ?? [];

  const filteredRows = useMemo(() => {
    const groupedFilters = filters.reduce<Record<string, FilterRow[]>>((acc, filter) => {
      if (!filter.value && !filter.valueTo) {
        return acc;
      }
      if (!acc[filter.key]) {
        acc[filter.key] = [];
      }
      acc[filter.key].push(filter);
      return acc;
    }, {});

    // 数値範囲用の比較関数
    const matchesUnitPrice = (rowValue: number, filter: FilterRow) => {
      const minValue = filter.value ? Number(filter.value) : Number.NEGATIVE_INFINITY;
      const maxValue = filter.valueTo ? Number(filter.valueTo) : Number.POSITIVE_INFINITY;
      if (Number.isNaN(minValue) || Number.isNaN(maxValue)) {
        return false;
      }
      return rowValue >= minValue && rowValue <= maxValue;
    };

    // every で AND フィルター, some で OR フィルター
    return rows.filter((row) =>
      Object.entries(groupedFilters).every(([key, values]) => {
        if (!values.length) {
          return true;
        }
        switch (key) {
          case "category":
            return values.some((value) => value.value === row.category);
          case "supplier":
            return values.some((value) => value.value === row.supplier);
          case "unit":
            return values.some((value) => value.value === row.unit);
          case "currency":
            return values.some((value) => value.value === row.currency);
          case "status":
            return values.some((value) => value.value === row.status);
          case "code":
            return values.some((value) => row.code.toLowerCase().includes(value.value.toLowerCase()));
          case "name":
            return values.some((value) => row.name.toLowerCase().includes(value.value.toLowerCase()));
          case "unitPrice":
            return values.some((value) => matchesUnitPrice(row.unitPrice, value));
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
      { label: "登録製品数", value: totalCount, tone: "primary", icon: <Box size={22} /> },
      { label: "有効", value: activeCount, tone: "success", icon: <CheckCircle size={22} /> },
      { label: "無効", value: inactiveCount, tone: "muted", icon: <Clock size={22} /> },
    ];
  }, [rows]);

  const handleEditDelete = (material: MaterialRow) => {
    closeEdit();
    openDelete(material);
  };

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards cards={summaryCards} />
      <ToolBar
        filterDefinitions={filterDefinitions}
        filters={filters}
        onFiltersChange={setFilters}
        onCreate={openCreate}
        createLabel="新規材料"
      />
      <MaterialMasterTableView rows={filteredRows} onRowClick={openEdit} onDelete={openDelete} />
      <NewMaterialModal
        open={isCreateOpen}
        onClose={closeCreate}
        onSave={saveCreate}
        categoryOptions={getOptions("category")}
        supplierOptions={getOptions("supplier")}
        unitOptions={getOptions("unit")}
        currencyOptions={getOptions("currency")}
        statusOptions={getOptions("status")}
      />
      <EditMaterialModal
        key={editingRow?.id ?? "material-edit"}
        open={Boolean(editingRow)}
        material={editingRow}
        onClose={closeEdit}
        onSave={saveEdit}
        onDelete={handleEditDelete}
        categoryOptions={getOptions("category")}
        supplierOptions={getOptions("supplier")}
        unitOptions={getOptions("unit")}
        currencyOptions={getOptions("currency")}
        statusOptions={getOptions("status")}
      />
      <DeleteMaterialDialog open={Boolean(deletingRow)} material={deletingRow} onClose={closeDelete} onConfirm={confirmDelete} />
    </div>
  );
}
