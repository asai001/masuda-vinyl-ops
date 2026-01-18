"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, CheckCircle, Clock } from "lucide-react";
import ToolBar, { FilterDefinition, FilterRow } from "@/components/ToolBar";
import SummaryCards, { SummaryCard } from "@/components/SummaryCards";
import useMasterCrud from "@/hooks/useMasterCrud";
import DeleteProductDialog from "@/features/product-master/DeleteProductDialog";
import EditProductModal from "@/features/product-master/EditProductModal";
import NewProductModal from "@/features/product-master/NewProductModal";
import ProductMasterTableView from "@/features/product-master/ProductMasterTableView";
import {
  createProduct,
  deleteProduct,
  fetchProductRows,
  updateProduct,
} from "@/features/product-master/api/client";
import type { NewProductInput, ProductRow } from "@/features/product-master/types";
import { fetchMaterialRows } from "@/features/material-master/api/client";
import type { MaterialRow } from "@/features/material-master/types";

const statusLabels: Record<string, string> = {
  active: "有効",
  inactive: "無効",
};

type Option = { value: string; label: string };

export default function ProductMasterView() {
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
  } = useMasterCrud<ProductRow>([], (item, nextId) => ({
    ...item,
    id: nextId,
    productId: item.productId ?? `local_${nextId}`,
  }));
  const [filters, setFilters] = useState<FilterRow[]>([]);

  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);
  const [optionError, setOptionError] = useState<string | null>(null);

  const [mutating, setMutating] = useState(false);
  const [mutateError, setMutateError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = async () => {
    const fetched = await fetchProductRows();
    replaceRows(fetched);
  };

  const reloadMaterialOptions = async () => {
    try {
      setOptionError(null);
      const fetched = await fetchMaterialRows();
      setMaterialRows(fetched);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to load materials";
      setOptionError(msg);
    }
  };

  const handleCreate = (input: NewProductInput) => {
    (async () => {
      try {
        setMutating(true);
        setMutateError(null);

        await createProduct(input);
        await reload();

        closeCreate();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to create product";
        setMutateError(msg);
      } finally {
        setMutating(false);
      }
    })();
  };

  const handleEdit = (next: ProductRow) => {
    (async () => {
      try {
        setMutating(true);
        setMutateError(null);

        await updateProduct(next);
        await reload();

        closeEdit();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to update product";
        setMutateError(msg);
      } finally {
        setMutating(false);
      }
    })();
  };

  const handleDelete = (row: ProductRow) => {
    (async () => {
      try {
        setMutating(true);
        setMutateError(null);

        await deleteProduct(row.productId);
        await reload();

        closeDelete();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to delete product";
        setMutateError(msg);
      } finally {
        setMutating(false);
      }
    })();
  };

  // DynamoDB から製品を取得
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const fetched = await fetchProductRows();
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

  // 初回に材料マスタを取得
  useEffect(() => {
    reloadMaterialOptions();
  }, []);

  // 新規/編集モーダルを開くたびに材料候補を最新化
  useEffect(() => {
    if (isCreateOpen || Boolean(editingRow)) {
      reloadMaterialOptions();
    }
  }, [isCreateOpen, editingRow]);

  const materialOptions = useMemo<Option[]>(
    () =>
      materialRows.map((row) => ({
        value: row.code,
        label: `${row.code} - ${row.name}`,
      })),
    [materialRows],
  );

  const filterDefinitions = useMemo<FilterDefinition[]>(() => {
    const uniqueValues = (values: string[]) => Array.from(new Set(values));

    const categoryOptions = uniqueValues(rows.map((row) => row.category)).map((value) => ({
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
    const materialLabelMap = new Map(materialOptions.map((option) => [option.value, option.label]));
    const materialFilterOptions = uniqueValues(rows.flatMap((row) => row.materials)).map((value) => ({
      value,
      label: materialLabelMap.get(value) ?? value,
    }));
    const statusOptions = [
      { value: "active", label: statusLabels.active },
      { value: "inactive", label: statusLabels.inactive },
    ];

    return [
      { key: "category", label: "カテゴリ", type: "select", options: categoryOptions },
      { key: "unit", label: "単位", type: "select", options: unitOptions },
      { key: "currency", label: "通貨", type: "select", options: currencyOptions },
      { key: "materials", label: "使用材料", type: "select", options: materialFilterOptions },
      { key: "status", label: "ステータス", type: "select", options: statusOptions },
      { key: "code", label: "品番", type: "text" },
      { key: "name", label: "品目名", type: "text" },
      { key: "unitPrice", label: "標準単価", type: "range" },
      { key: "weight", label: "重量", type: "range" },
      { key: "length", label: "長さ", type: "range" },
      { key: "speed", label: "分速", type: "range" },
    ];
  }, [materialOptions, rows]);

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

    const matchesNumberRange = (rowValue: number | null, filter: FilterRow) => {
      if (rowValue === null) {
        return false;
      }
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
          case "unit":
            return values.some((value) => value.value === row.unit);
          case "currency":
            return values.some((value) => value.value === row.currency);
          case "materials":
            return values.some((value) => row.materials.includes(value.value));
          case "status":
            return values.some((value) => value.value === row.status);
          case "code":
            return values.some((value) => row.code.toLowerCase().includes(value.value.toLowerCase()));
          case "name":
            return values.some((value) => row.name.toLowerCase().includes(value.value.toLowerCase()));
          case "unitPrice":
            return values.some((value) => matchesNumberRange(row.unitPrice, value));
          case "weight":
            return values.some((value) => matchesNumberRange(row.weight, value));
          case "length":
            return values.some((value) => matchesNumberRange(row.length, value));
          case "speed":
            return values.some((value) => matchesNumberRange(row.speed, value));
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
      { label: "登録製品数", value: totalCount, tone: "primary", icon: <Box size={22} /> },
      { label: statusLabels.active, value: activeCount, tone: "success", icon: <CheckCircle size={22} /> },
      { label: statusLabels.inactive, value: inactiveCount, tone: "muted", icon: <Clock size={22} /> },
    ];
  }, [rows]);

  const handleEditDelete = (product: ProductRow) => {
    closeEdit();
    openDelete(product);
  };

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards cards={summaryCards} />
      <ToolBar
        filterDefinitions={filterDefinitions}
        filters={filters}
        onFiltersChange={setFilters}
        onCreate={openCreate}
        createLabel="新規製品"
      />
      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          製品マスタの取得に失敗しました。（{loadError}）
        </div>
      )}
      {optionError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          材料マスタの取得に失敗しました。（{optionError}）
        </div>
      )}
      {mutateError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          操作に失敗しました。（{mutateError}）
        </div>
      )}
      {mutating && <div className="text-sm text-gray-500">保存中...</div>}
      {loading && <div className="text-sm text-gray-500">読み込み中...</div>}
      <ProductMasterTableView rows={filteredRows} onRowClick={openEdit} onDelete={openDelete} />
      <NewProductModal
        open={isCreateOpen}
        onClose={closeCreate}
        onSave={handleCreate}
        categoryOptions={filterDefinitions.find((definition) => definition.key === "category")?.options ?? []}
        unitOptions={filterDefinitions.find((definition) => definition.key === "unit")?.options ?? []}
        currencyOptions={filterDefinitions.find((definition) => definition.key === "currency")?.options ?? []}
        statusOptions={filterDefinitions.find((definition) => definition.key === "status")?.options ?? []}
        materialOptions={materialOptions}
        existingProducts={rows}
      />
      <EditProductModal
        key={editingRow?.productId ?? "product-edit"}
        open={Boolean(editingRow)}
        product={editingRow}
        onClose={closeEdit}
        onSave={handleEdit}
        onDelete={handleEditDelete}
        categoryOptions={filterDefinitions.find((definition) => definition.key === "category")?.options ?? []}
        unitOptions={filterDefinitions.find((definition) => definition.key === "unit")?.options ?? []}
        currencyOptions={filterDefinitions.find((definition) => definition.key === "currency")?.options ?? []}
        statusOptions={filterDefinitions.find((definition) => definition.key === "status")?.options ?? []}
        materialOptions={materialOptions}
        existingProducts={rows}
      />
      <DeleteProductDialog
        open={Boolean(deletingRow)}
        product={deletingRow}
        onClose={closeDelete}
        onConfirm={handleDelete}
      />
    </div>
  );
}
