"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock, DollarSign } from "lucide-react";
import ToolBar, { FilterDefinition, FilterRow } from "@/components/ToolBar";
import SummaryCards, { SummaryCard } from "@/components/SummaryCards";
import useMasterCrud from "@/hooks/useMasterCrud";
import DeletePaymentDialog from "./DeletePaymentDialog";
import EditPaymentModal from "./EditPaymentModal";
import NewPaymentModal from "./NewPaymentModal";
import PaymentMasterTableView from "./PaymentMasterTableView";
import {
  createPaymentDefinition,
  deletePaymentDefinition,
  fetchPaymentRows,
  updatePaymentDefinition,
} from "@/features/payment-master/api/client";
import type { NewPaymentInput, PaymentRow } from "@/features/payment-master/types";
import { CURRENCY_OPTION_ITEMS } from "@/constants/currency";

const defaultPaymentMethods = ["銀行振込", "口座振替", "現金", "クレジットカード"];
const fixedCostOptions = [
  { value: "fixed", label: "固定費" },
  { value: "variable", label: "変動費" },
];

export default function PaymentMasterView() {
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
  } = useMasterCrud<PaymentRow>([], (item, nextId) => ({
    ...item,
    id: nextId,
    paymentDefId: item.paymentDefId ?? `local_${nextId}`,
  }));
  const [filters, setFilters] = useState<FilterRow[]>([]);

  const [mutating, setMutating] = useState(false);
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = async () => {
    const fetched = await fetchPaymentRows();
    replaceRows(fetched);
  };

  const handleCreate = (input: NewPaymentInput) => {
    (async () => {
      try {
        setMutating(true);
        setMutateError(null);

        await createPaymentDefinition(input);
        await reload();

        closeCreate();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to create payment definition";
        setMutateError(msg);
      } finally {
        setMutating(false);
      }
    })();
  };

  const handleEdit = (next: PaymentRow) => {
    (async () => {
      try {
        setMutating(true);
        setMutateError(null);

        await updatePaymentDefinition(next);
        await reload();

        closeEdit();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to update payment definition";
        setMutateError(msg);
      } finally {
        setMutating(false);
      }
    })();
  };

  const handleDelete = (row: PaymentRow) => {
    (async () => {
      try {
        setMutating(true);
        setMutateError(null);

        await deletePaymentDefinition(row.paymentDefId);
        await reload();

        closeDelete();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to delete payment definition";
        setMutateError(msg);
      } finally {
        setMutating(false);
      }
    })();
  };

  const categoryOptions = useMemo(() => {
    const uniqueValues = Array.from(new Set(rows.map((row) => row.category))).filter((value) => value);
    return uniqueValues.map((value) => ({ value, label: value }));
  }, [rows]);

  const paymentMethodOptions = useMemo(() => {
    const uniqueValues = Array.from(new Set([...rows.map((row) => row.paymentMethod), ...defaultPaymentMethods])).filter(
      (value) => value
    );
    return uniqueValues.map((value) => ({ value, label: value }));
  }, [rows]);

  const currencyOptions = CURRENCY_OPTION_ITEMS;

  const filterDefinitions = useMemo<FilterDefinition[]>(
    () => [
      { key: "category", label: "カテゴリ", type: "select", options: categoryOptions },
      { key: "content", label: "内容", type: "text" },
      { key: "fixedCost", label: "固定費区分", type: "select", options: fixedCostOptions },
      { key: "fixedAmount", label: "固定金額", type: "range" },
      { key: "currency", label: "通貨", type: "select", options: currencyOptions },
      { key: "paymentMethod", label: "支払方法", type: "select", options: paymentMethodOptions },
      { key: "paymentDate", label: "支払日", type: "range" },
    ],
    [categoryOptions, currencyOptions, paymentMethodOptions]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const fetched = await fetchPaymentRows();
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
          case "content":
            return values.some((value) => row.content.toLowerCase().includes(value.value.toLowerCase()));
          case "fixedCost":
            return values.some((value) => (value.value === "fixed" ? row.isFixedCost : !row.isFixedCost));
          case "fixedAmount":
            return values.some((value) => matchesNumberRange(row.fixedAmount, value));
          case "currency":
            return values.some((value) => value.value === row.currency);
          case "paymentMethod":
            return values.some((value) => value.value === row.paymentMethod);
          case "paymentDate":
            return values.some((value) => matchesNumberRange(row.paymentDate, value));
          default:
            return true;
        }
      })
    );
  }, [filters, rows]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const totalCount = rows.length;
    const fixedCount = rows.filter((row) => row.isFixedCost).length;
    const variableCount = rows.length - fixedCount;
    return [
      { label: "マスタ件数", value: totalCount, tone: "primary", icon: <DollarSign size={22} /> },
      { label: "固定費", value: fixedCount, tone: "success", icon: <CheckCircle size={22} /> },
      { label: "変動費", value: variableCount, tone: "warning", icon: <Clock size={22} /> },
    ];
  }, [rows]);

  const handleEditDelete = (row: PaymentRow) => {
    closeEdit();
    openDelete(row);
  };

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards cards={summaryCards} />
      <ToolBar
        filterDefinitions={filterDefinitions}
        filters={filters}
        onFiltersChange={setFilters}
        onCreate={openCreate}
        createLabel="新規マスタ登録"
      />
      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          支払いマスタの取得に失敗しました。（{loadError}）
        </div>
      )}
      {mutateError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          操作に失敗しました。（{mutateError}）
        </div>
      )}
      {mutating && <div className="text-sm text-gray-500">保存中...</div>}
      {loading && <div className="text-sm text-gray-500">読み込み中...</div>}
      <PaymentMasterTableView rows={filteredRows} onRowClick={openEdit} onDelete={openDelete} />
      <NewPaymentModal
        open={isCreateOpen}
        onClose={closeCreate}
        onSave={handleCreate}
        categoryOptions={categoryOptions}
        paymentMethodOptions={paymentMethodOptions}
      />
      <EditPaymentModal
        key={editingRow?.paymentDefId ?? "payment-edit"}
        open={Boolean(editingRow)}
        payment={editingRow}
        onClose={closeEdit}
        onSave={handleEdit}
        onDelete={handleEditDelete}
        categoryOptions={categoryOptions}
        paymentMethodOptions={paymentMethodOptions}
      />
      <DeletePaymentDialog
        open={Boolean(deletingRow)}
        payment={deletingRow}
        onClose={closeDelete}
        onConfirm={handleDelete}
      />
    </div>
  );
}
