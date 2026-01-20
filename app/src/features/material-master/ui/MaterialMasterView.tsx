"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, CheckCircle, Clock } from "lucide-react";
import ToolBar, { FilterDefinition, FilterRow } from "@/components/ToolBar";
import SummaryCards, { SummaryCard } from "@/components/SummaryCards";
import useMasterCrud from "@/hooks/useMasterCrud";
import DeleteMaterialDialog from "@/features/material-master/ui/DeleteMaterialDialog";
import EditMaterialModal from "@/features/material-master/ui/EditMaterialModal";
import MaterialMasterTableView from "@/features/material-master/ui/MaterialMasterTableView";
import NewMaterialModal from "@/features/material-master/ui/NewMaterialModal";
import type { NewMaterialInput, MaterialRow } from "../types";
import { createMaterial, deleteMaterial, fetchMaterialRows, updateMaterial } from "../api/client";
import { fetchClientRows } from "@/features/client-master/api/client";
import { CURRENCY_OPTIONS, CURRENCY_OPTION_ITEMS } from "@/constants/currency";

const statusLabels: Record<string, string> = {
  active: "有効",
  inactive: "無効",
};

export default function MaterialMasterView() {
  const {
    rows,
    replaceRows,
    isCreateOpen,
    editingRow,
    deletingRow,
    openCreate,
    closeCreate,
    openEdit,
    closeEdit,
    openDelete,
    closeDelete,
  } = useMasterCrud<MaterialRow>([], (item, nextId) => ({
    ...item,
    id: nextId,
    materialId: item.materialId ?? `local_${nextId}`,
  }));
  const [filters, setFilters] = useState<FilterRow[]>([]);

  const [mutating, setMutating] = useState(false);
  const [mutateError, setMutateError] = useState<string | null>(null);

  const reload = async () => {
    const fetched = await fetchMaterialRows();
    replaceRows(fetched);
  };

  type Option = { value: string; label: string };

  const [supplierOptionsFromClients, setSupplierOptionsFromClients] = useState<Option[]>([]);
  const [supplierCurrencyMap, setSupplierCurrencyMap] = useState<Record<string, string>>({});

  const reloadSupplierOptions = async () => {
    try {
      const clients = await fetchClientRows();

      const names = Array.from(new Set(clients.map((c) => c.name.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "ja"),
      );
      setSupplierOptionsFromClients(names.map((name) => ({ value: name, label: name })));

      // ✅ 追加：取引先名 -> 通貨 の辞書を作る
      const map: Record<string, string> = {};
      for (const c of clients) {
        const name = c.name?.trim();
        const currency = c.currency?.trim().toUpperCase();
        if (!name || !currency) {
          continue;
        }
        if (!CURRENCY_OPTIONS.includes(currency as (typeof CURRENCY_OPTIONS)[number])) {
          continue;
        }
        // 同名が複数ある場合は先勝ち（必要ならここは方針変更可能）
        if (!map[name]) {
          map[name] = currency;
        }
      }
      setSupplierCurrencyMap(map);
    } catch (e) {
      console.error(e);
    }
  };

  // 初回に仕入先候補（clients）取得
  useEffect(() => {
    reloadSupplierOptions();
  }, []);

  // 新規/編集モーダルを開くたびに候補を最新化（取引先が増えても反映される）
  useEffect(() => {
    if (isCreateOpen || Boolean(editingRow)) {
      reloadSupplierOptions();
    }
  }, [isCreateOpen, editingRow]);

  const handleCreate = (input: NewMaterialInput) => {
    (async () => {
      try {
        setMutating(true);
        setMutateError(null);

        await createMaterial(input);
        await reload();

        closeCreate();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to create material";
        setMutateError(msg);
      } finally {
        setMutating(false);
      }
    })();
  };

  const handleEdit = (next: MaterialRow) => {
    (async () => {
      try {
        setMutating(true);
        setMutateError(null);

        await updateMaterial(next);

        await reload();
        closeEdit();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to update material";
        setMutateError(msg);
      } finally {
        setMutating(false);
      }
    })();
  };

  const handleDelete = (row: MaterialRow) => {
    (async () => {
      try {
        setMutating(true);
        setMutateError(null);

        await deleteMaterial(row.materialId);

        await reload();
        closeDelete();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to delete material";
        setMutateError(msg);
      } finally {
        setMutating(false);
      }
    })();
  };

  // DynamoDB から材料を取得
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const fetched = await fetchMaterialRows();
        if (!cancelled) {
          replaceRows(fetched);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to load";
          setLoadError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [replaceRows]);

  const filterDefinitions = useMemo<FilterDefinition[]>(() => {
    const uniqueValues = (values: string[]) => Array.from(new Set(values));

    const categoryOptions = uniqueValues(rows.map((row) => row.category)).map((value) => ({ value, label: value }));
    const supplierOptions = uniqueValues(rows.map((row) => row.supplier)).map((value) => ({ value, label: value }));
    const unitOptions = uniqueValues(rows.map((row) => row.unit)).map((value) => ({ value, label: value }));
    const currencyOptions = CURRENCY_OPTION_ITEMS;
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

    const matchesUnitPrice = (rowValue: number, filter: FilterRow) => {
      const minValue = filter.value ? Number(filter.value) : Number.NEGATIVE_INFINITY;
      const maxValue = filter.valueTo ? Number(filter.valueTo) : Number.POSITIVE_INFINITY;
      if (Number.isNaN(minValue) || Number.isNaN(maxValue)) {
        return false;
      }
      return rowValue >= minValue && rowValue <= maxValue;
    };

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
      }),
    );
  }, [filters, rows]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const totalCount = rows.length;
    const activeCount = rows.filter((row) => row.status === "active").length;
    const inactiveCount = rows.filter((row) => row.status === "inactive").length;
    return [
      { label: "登録材料数", value: totalCount, tone: "primary", icon: <Box size={22} /> },
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

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          材料マスタの取得に失敗しました。（{loadError}）
        </div>
      )}
      {mutateError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          操作に失敗しました。（{mutateError}）
        </div>
      )}
      {mutating && <div className="text-sm text-gray-500">保存中...</div>}
      {loading && <div className="text-sm text-gray-500">読み込み中...</div>}

      <MaterialMasterTableView rows={filteredRows} onRowClick={openEdit} onDelete={openDelete} />

      <NewMaterialModal
        open={isCreateOpen}
        onClose={closeCreate}
        onSave={handleCreate}
        existingMaterials={rows}
        categoryOptions={getOptions("category")}
        supplierOptions={supplierOptionsFromClients}
        unitOptions={getOptions("unit")}
        statusOptions={getOptions("status")}
        supplierCurrencyMap={supplierCurrencyMap}
      />

      <EditMaterialModal
        key={editingRow?.materialId ?? "edit-material-modal"}
        open={Boolean(editingRow)}
        material={editingRow}
        onClose={closeEdit}
        onSave={handleEdit}
        onDelete={handleEditDelete}
        existingMaterials={rows}
        categoryOptions={getOptions("category")}
        supplierOptions={supplierOptionsFromClients}
        unitOptions={getOptions("unit")}
        statusOptions={getOptions("status")}
        supplierCurrencyMap={supplierCurrencyMap}
      />

      <DeleteMaterialDialog
        open={Boolean(deletingRow)}
        material={deletingRow}
        onClose={closeDelete}
        onConfirm={handleDelete}
      />
    </div>
  );
}
