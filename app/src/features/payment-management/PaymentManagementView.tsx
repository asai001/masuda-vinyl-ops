"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@mui/material";
import { CheckCircle, Clock, DollarSign, Plus } from "lucide-react";
import ToolBar, { FilterDefinition, FilterRow } from "@/components/ToolBar";
import SummaryCards, { SummaryCard } from "@/components/SummaryCards";
import LoadingModal from "@/components/LoadingModal";
import useMasterCrud from "@/hooks/useMasterCrud";
import DeletePaymentManagementDialog from "@/features/payment-management/DeletePaymentManagementDialog";
import EditPaymentManagementModal from "@/features/payment-management/EditPaymentManagementModal";
import MonthPicker from "@/features/payment-management/MonthPicker";
import NewPaymentManagementModal from "@/features/payment-management/NewPaymentManagementModal";
import PaymentManagementTableView from "@/features/payment-management/PaymentManagementTableView";
import {
  createPayment,
  deletePayment,
  fetchPaymentManagementRows,
  generatePayments,
  updatePayment,
} from "@/features/payment-management/api/client";
import { fetchPaymentRows as fetchPaymentDefinitionRows } from "@/features/payment-master/api/client";
import {
  paymentStatusOptions,
  type NewPaymentManagementInput,
  type PaymentManagementRow,
} from "@/features/payment-management/types";
import type { PaymentRow as PaymentDefinitionRow } from "@/features/payment-master/types";
import { CURRENCY_OPTION_ITEMS } from "@/constants/currency";

const defaultPaymentMethods = ["銀行振込", "口座振替", "現金", "クレジットカード"];
const fixedCostOptions = [
  { value: "fixed", label: "固定費" },
  { value: "variable", label: "変動費" },
];

export default function PaymentManagementView() {
  const defaultTargetMonth = new Date().toISOString().slice(0, 7);
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
  } = useMasterCrud<PaymentManagementRow>([], (item, nextId) => ({ ...item, id: nextId }));
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [targetMonth, setTargetMonth] = useState(defaultTargetMonth);
  const [paymentDefinitionRows, setPaymentDefinitionRows] = useState<PaymentDefinitionRow[]>([]);
  const [mutating, setMutating] = useState(false);
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [mutatingAction, setMutatingAction] = useState<"create" | "edit" | "delete" | "generate" | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [optionError, setOptionError] = useState<string | null>(null);

  const reload = async (month: string) => {
    if (!month) {
      replaceRows([]);
      return;
    }
    const fetched = await fetchPaymentManagementRows(month);
    replaceRows(fetched);
  };

  const reloadPaymentDefinitions = async () => {
    try {
      setOptionError(null);
      const fetched = await fetchPaymentDefinitionRows();
      setPaymentDefinitionRows(fetched);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to load payment definitions";
      setOptionError(msg);
    }
  };

  const handleCreate = (input: NewPaymentManagementInput) => {
    (async () => {
      try {
        setMutating(true);
        setMutatingAction("create");
        setMutateError(null);
        closeCreate();

        await createPayment(input);
        await reload(targetMonth);
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to create payment";
        setMutateError(msg);
        closeCreate();
      } finally {
        setMutating(false);
        setMutatingAction(null);
      }
    })();
  };

  const handleEdit = (next: PaymentManagementRow) => {
    (async () => {
      try {
        setMutating(true);
        setMutatingAction("edit");
        setMutateError(null);
        closeEdit();

        await updatePayment(next);
        await reload(targetMonth);
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to update payment";
        setMutateError(msg);
        closeEdit();
      } finally {
        setMutating(false);
        setMutatingAction(null);
      }
    })();
  };

  const handleDelete = (row: PaymentManagementRow) => {
    (async () => {
      try {
        setMutating(true);
        setMutatingAction("delete");
        setMutateError(null);
        closeDelete();

        await deletePayment(row.paymentId, row.yearMonth);
        await reload(targetMonth);
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to delete payment";
        setMutateError(msg);
        closeDelete();
      } finally {
        setMutating(false);
        setMutatingAction(null);
      }
    })();
  };

  useEffect(() => {
    let cancelled = false;
    if (!targetMonth) {
      replaceRows([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const fetched = await fetchPaymentManagementRows(targetMonth);
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
  }, [replaceRows, targetMonth]);

  useEffect(() => {
    reloadPaymentDefinitions();
  }, []);

  useEffect(() => {
    if (isCreateOpen || Boolean(editingRow)) {
      reloadPaymentDefinitions();
    }
  }, [isCreateOpen, editingRow]);

  const categoryOptions = useMemo(() => {
    const uniqueValues = Array.from(
      new Set([...rows.map((row) => row.category), ...paymentDefinitionRows.map((row) => row.category)]),
    ).filter((value) => value);
    return uniqueValues.map((value) => ({ value, label: value }));
  }, [paymentDefinitionRows, rows]);

  const paymentMethodOptions = useMemo(() => {
    const uniqueValues = Array.from(
      new Set([
        ...rows.map((row) => row.paymentMethod),
        ...paymentDefinitionRows.map((row) => row.paymentMethod),
        ...defaultPaymentMethods,
      ]),
    ).filter((value) => value);
    return uniqueValues.map((value) => ({ value, label: value }));
  }, [paymentDefinitionRows, rows]);

  const currencyOptions = CURRENCY_OPTION_ITEMS;

  const statusOptions = useMemo(
    () => paymentStatusOptions.map((option) => ({ value: option.key, label: option.label })),
    [],
  );

  const filterDefinitions = useMemo<FilterDefinition[]>(
    () => [
      { key: "category", label: "カテゴリ", type: "select", options: categoryOptions },
      { key: "content", label: "内容", type: "text" },
      { key: "fixedCost", label: "固定費区分", type: "select", options: fixedCostOptions },
      { key: "amount", label: "金額", type: "range" },
      { key: "currency", label: "通貨", type: "select", options: currencyOptions },
      { key: "paymentMethod", label: "支払方法", type: "select", options: paymentMethodOptions },
      { key: "paymentDate", label: "支払日", type: "date-range" },
      { key: "status", label: "ステータス", type: "select", options: statusOptions },
    ],
    [categoryOptions, currencyOptions, paymentMethodOptions, statusOptions],
  );

  const monthRows = useMemo(() => {
    if (!targetMonth) {
      return rows;
    }
    const prefix = `${targetMonth}-`;
    return rows.filter((row) => row.paymentDate.startsWith(prefix));
  }, [rows, targetMonth]);

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

    const matchesNumberRange = (rowValue: number, filter: FilterRow) => {
      const minValue = filter.value ? Number(filter.value) : Number.NEGATIVE_INFINITY;
      const maxValue = filter.valueTo ? Number(filter.valueTo) : Number.POSITIVE_INFINITY;
      if (Number.isNaN(minValue) || Number.isNaN(maxValue)) {
        return false;
      }
      return rowValue >= minValue && rowValue <= maxValue;
    };

    const matchesDateRange = (rowValue: string, filter: FilterRow) => {
      const rowTime = Date.parse(rowValue);
      if (Number.isNaN(rowTime)) {
        return false;
      }
      const minTime = filter.value ? Date.parse(filter.value) : Number.NEGATIVE_INFINITY;
      const maxTime = filter.valueTo ? Date.parse(filter.valueTo) : Number.POSITIVE_INFINITY;
      if (Number.isNaN(minTime) || Number.isNaN(maxTime)) {
        return false;
      }
      return rowTime >= minTime && rowTime <= maxTime;
    };

    return monthRows.filter((row) =>
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
          case "amount":
            return values.some((value) => matchesNumberRange(row.amount, value));
          case "currency":
            return values.some((value) => value.value === row.currency);
          case "paymentMethod":
            return values.some((value) => value.value === row.paymentMethod);
          case "paymentDate":
            return values.some((value) => matchesDateRange(row.paymentDate, value));
          case "status":
            return values.some((value) => value.value === row.status);
          default:
            return true;
        }
      }),
    );
  }, [filters, monthRows]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const totalCount = monthRows.length;
    const paidCount = monthRows.filter((row) => row.status === "paid").length;
    const unpaidCount = monthRows.filter((row) => row.status === "unpaid").length;
    return [
      { label: "支払件数", value: totalCount, tone: "primary", icon: <DollarSign size={22} /> },
      { label: "支払済み", value: paidCount, tone: "success", icon: <CheckCircle size={22} /> },
      { label: "未払い", value: unpaidCount, tone: "warning", icon: <Clock size={22} /> },
    ];
  }, [monthRows]);

  const handleEditDelete = (row: PaymentManagementRow) => {
    closeEdit();
    openDelete(row);
  };

  const savingMessage =
    mutatingAction === "delete" ? "削除中" : mutatingAction === "generate" ? "生成中" : "保存中";

  const handleGenerate = () => {
    if (!targetMonth) {
      return;
    }
    (async () => {
      try {
        setMutating(true);
        setMutatingAction("generate");
        setMutateError(null);

        await generatePayments(targetMonth);
        await reload(targetMonth);
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to generate payments";
        setMutateError(msg);
      } finally {
        setMutating(false);
        setMutatingAction(null);
      }
    })();
  };

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards cards={summaryCards} />
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-700">対象年月</div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <MonthPicker value={targetMonth} onChange={setTargetMonth} />
          <Button
            variant="contained"
            color="success"
            startIcon={<Plus size={16} />}
            onClick={handleGenerate}
            className="whitespace-nowrap"
          >
            支払データ生成
          </Button>
        </div>
      </div>
      <ToolBar
        filterDefinitions={filterDefinitions}
        filters={filters}
        onFiltersChange={setFilters}
        onCreate={openCreate}
        createLabel="新規支払"
      />
      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          支払い管理の取得に失敗しました。（{loadError}）
        </div>
      )}
      {optionError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          支払いマスタの取得に失敗しました。（{optionError}）
        </div>
      )}
      {mutateError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          操作に失敗しました。（{mutateError}）
        </div>
      )}
      {loading && <div className="text-sm text-gray-500">読み込み中...</div>}
      <PaymentManagementTableView rows={filteredRows} onRowClick={openEdit} onDelete={openDelete} />
      <NewPaymentManagementModal
        open={isCreateOpen}
        onClose={closeCreate}
        onSave={handleCreate}
        categoryOptions={categoryOptions}
        paymentMethodOptions={paymentMethodOptions}
        statusOptions={statusOptions}
      />
      <EditPaymentManagementModal
        key={editingRow?.id ?? "payment-management-edit"}
        open={Boolean(editingRow)}
        payment={editingRow}
        onClose={closeEdit}
        onSave={handleEdit}
        onDelete={handleEditDelete}
        categoryOptions={categoryOptions}
        paymentMethodOptions={paymentMethodOptions}
        statusOptions={statusOptions}
      />
      <DeletePaymentManagementDialog
        open={Boolean(deletingRow)}
        payment={deletingRow}
        onClose={closeDelete}
        onConfirm={handleDelete}
      />
      <LoadingModal open={mutating} message={savingMessage} />
    </div>
  );
}
