"use client";

import { useMemo, useState } from "react";
import { Button, TextField } from "@mui/material";
import { CheckCircle, Clock, DollarSign, Plus } from "lucide-react";
import ToolBar, { FilterDefinition, FilterRow } from "@/components/ToolBar";
import SummaryCards, { SummaryCard } from "@/components/SummaryCards";
import useMasterCrud from "@/hooks/useMasterCrud";
import DeletePaymentManagementDialog from "@/features/payment-management/DeletePaymentManagementDialog";
import EditPaymentManagementModal from "@/features/payment-management/EditPaymentManagementModal";
import NewPaymentManagementModal from "@/features/payment-management/NewPaymentManagementModal";
import PaymentManagementTableView from "@/features/payment-management/PaymentManagementTableView";
import { PaymentManagementRow, paymentManagementRows, paymentStatusOptions } from "@/mock/paymentManagementData";
import { paymentRows as paymentMasterRows } from "@/mock/paymentMasterData";

const defaultPaymentMethods = ["銀行振込", "口座振替", "現金", "クレジットカード"];
const defaultCurrencies = ["JPY", "USD", "VND"];

export default function PaymentManagementView() {
  const defaultTargetMonth = paymentManagementRows[0]?.paymentDate?.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
  const {
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
  } = useMasterCrud<PaymentManagementRow>(paymentManagementRows, (item, nextId) => ({ ...item, id: nextId }));
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [targetMonth, setTargetMonth] = useState(defaultTargetMonth);

  const categoryOptions = useMemo(() => {
    const uniqueValues = Array.from(
      new Set([...rows.map((row) => row.category), ...paymentMasterRows.map((row) => row.category)]),
    ).filter((value) => value);
    return uniqueValues.map((value) => ({ value, label: value }));
  }, [rows]);

  const paymentMethodOptions = useMemo(() => {
    const uniqueValues = Array.from(
      new Set([
        ...rows.map((row) => row.paymentMethod),
        ...paymentMasterRows.map((row) => row.paymentMethod),
        ...defaultPaymentMethods,
      ]),
    ).filter((value) => value);
    return uniqueValues.map((value) => ({ value, label: value }));
  }, [rows]);

  const currencyOptions = useMemo(() => {
    const uniqueValues = Array.from(
      new Set([
        ...rows.map((row) => row.currency),
        ...paymentMasterRows.map((row) => row.currency),
        ...defaultCurrencies,
      ]),
    ).filter((value) => value);
    return uniqueValues.map((value) => ({ value, label: value }));
  }, [rows]);

  const statusOptions = useMemo(
    () => paymentStatusOptions.map((option) => ({ value: option.key, label: option.label })),
    [],
  );

  const filterDefinitions = useMemo<FilterDefinition[]>(
    () => [
      { key: "category", label: "カテゴリ", type: "select", options: categoryOptions },
      { key: "content", label: "内容", type: "text" },
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

  const handleGenerate = () => {
    if (!targetMonth) {
      return;
    }

    const prefix = `${targetMonth}-`;

    // 既存（対象月）の重複キー
    const existingKeys = new Set(
      rows
        .filter((row) => row.paymentDate.startsWith(prefix))
        .map((row) => `${row.category}-${row.content}-${row.paymentDate}`),
    );

    // 次のID
    let nextId = rows.length ? Math.max(...rows.map((row) => row.id)) : 0;

    // 生成
    const generated: PaymentManagementRow[] = paymentMasterRows
      .map((row) => {
        const day = String(row.paymentDate).padStart(2, "0");
        const paymentDate = `${targetMonth}-${day}`;
        const key = `${row.category}-${row.content}-${paymentDate}`;

        if (existingKeys.has(key)) {
          return null;
        }

        nextId += 1;
        return {
          id: nextId,
          category: row.category,
          content: row.content,
          amount: row.isFixedCost && row.fixedAmount !== null ? row.fixedAmount : 0,
          currency: row.currency || defaultCurrencies[0],
          paymentMethod: row.paymentMethod || defaultPaymentMethods[0],
          paymentDate,
          status: "unpaid",
          note: "",
          isFixedCost: row.isFixedCost,
        };
      })
      .filter((x): x is PaymentManagementRow => x !== null);

    // 追加が無ければ何もしない
    if (!generated.length) {
      return;
    }

    // ここがポイント：関数じゃなく配列を渡す
    replaceRows([...rows, ...generated]);
  };

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards cards={summaryCards} />
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-700">対象年月</div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <TextField
            size="small"
            type="month"
            value={targetMonth}
            onChange={(event) => setTargetMonth(event.target.value)}
            sx={{ minWidth: { xs: "100%", sm: 180 } }}
          />
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
      <PaymentManagementTableView rows={filteredRows} onRowClick={openEdit} onDelete={openDelete} />
      <NewPaymentManagementModal
        open={isCreateOpen}
        onClose={closeCreate}
        onSave={saveCreate}
        categoryOptions={categoryOptions}
        currencyOptions={currencyOptions}
        paymentMethodOptions={paymentMethodOptions}
        statusOptions={statusOptions}
      />
      <EditPaymentManagementModal
        key={editingRow?.id ?? "payment-management-edit"}
        open={Boolean(editingRow)}
        payment={editingRow}
        onClose={closeEdit}
        onSave={saveEdit}
        onDelete={handleEditDelete}
        categoryOptions={categoryOptions}
        currencyOptions={currencyOptions}
        paymentMethodOptions={paymentMethodOptions}
        statusOptions={statusOptions}
      />
      <DeletePaymentManagementDialog
        open={Boolean(deletingRow)}
        payment={deletingRow}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
