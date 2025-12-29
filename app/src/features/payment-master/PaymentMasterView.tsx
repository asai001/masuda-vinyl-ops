"use client";

import { useMemo, useState } from "react";
import { CheckCircle, Clock, DollarSign } from "lucide-react";
import ToolBar, { FilterDefinition, FilterRow } from "@/components/ToolBar";
import SummaryCards, { SummaryCard } from "@/components/SummaryCards";
import useMasterCrud from "@/hooks/useMasterCrud";
import DeletePaymentDialog from "@/features/payment-master/DeletePaymentDialog";
import EditPaymentModal from "@/features/payment-master/EditPaymentModal";
import NewPaymentModal from "@/features/payment-master/NewPaymentModal";
import PaymentMasterTableView from "@/features/payment-master/PaymentMasterTableView";
import { PaymentRow, paymentRows } from "@/mock/paymentMasterData";

const defaultPaymentMethods = ["銀行振込", "口座振替", "現金", "クレジットカード"];
const defaultCurrencies = ["JPY", "USD", "VND"];
const fixedCostOptions = [
  { value: "fixed", label: "固定費" },
  { value: "variable", label: "変動費" },
];

export default function PaymentMasterView() {
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
  } = useMasterCrud<PaymentRow>(paymentRows, (item, nextId) => ({ ...item, id: nextId }));
  const [filters, setFilters] = useState<FilterRow[]>([]);

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

  const currencyOptions = useMemo(() => {
    const uniqueValues = Array.from(new Set([...rows.map((row) => row.currency), ...defaultCurrencies])).filter(
      (value) => value
    );
    return uniqueValues.map((value) => ({ value, label: value }));
  }, [rows]);

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
      <PaymentMasterTableView rows={filteredRows} onRowClick={openEdit} onDelete={openDelete} />
      <NewPaymentModal
        open={isCreateOpen}
        onClose={closeCreate}
        onSave={saveCreate}
        categoryOptions={categoryOptions}
        currencyOptions={currencyOptions}
        paymentMethodOptions={paymentMethodOptions}
      />
      <EditPaymentModal
        key={editingRow?.id ?? "payment-edit"}
        open={Boolean(editingRow)}
        payment={editingRow}
        onClose={closeEdit}
        onSave={saveEdit}
        onDelete={handleEditDelete}
        categoryOptions={categoryOptions}
        currencyOptions={currencyOptions}
        paymentMethodOptions={paymentMethodOptions}
      />
      <DeletePaymentDialog
        open={Boolean(deletingRow)}
        payment={deletingRow}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
