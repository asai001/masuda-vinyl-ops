"use client";

import { useMemo, useState } from "react";
import { CheckCircle, Clock, ShoppingCart } from "lucide-react";
import ToolBar, { FilterDefinition, FilterRow } from "@/components/ToolBar";
import SummaryCards, { SummaryCard } from "@/components/SummaryCards";
import useMasterCrud from "@/hooks/useMasterCrud";
import DeleteOrderDialog from "@/features/order-management/DeleteOrderDialog";
import EditOrderModal from "@/features/order-management/EditOrderModal";
import OrderIssueModal from "@/features/order-management/OrderIssueModal";
import NewOrderModal from "@/features/order-management/NewOrderModal";
import OrderManagementTableView from "@/features/order-management/OrderManagementTableView";
import { clientRows } from "@/mock/clientMasterData";
import { materialRows } from "@/mock/materialMasterData";
import {
  documentStatusOptions,
  orderRows,
  orderStatusOptions,
  DocumentStatusKey,
  OrderRow,
  OrderStatusKey,
} from "@/mock/orderManagementData";

export default function OrderManagementView() {
  const calculateOrderAmount = (items: OrderRow["items"]) =>
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

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
  } = useMasterCrud<OrderRow>(orderRows, (item, nextId) => ({
    ...item,
    id: nextId,
    amount: calculateOrderAmount(item.items),
  }));
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [issuingRow, setIssuingRow] = useState<OrderRow | null>(null);

  const filterDefinitions = useMemo<FilterDefinition[]>(() => {
    const uniqueValues = (values: string[]) => Array.from(new Set(values));
    const supplierOptions = uniqueValues(rows.map((row) => row.supplier)).map((value) => ({
      value,
      label: value,
    }));
    const statusFilterOptions = orderStatusOptions.map((status) => ({
      value: status.key,
      label: status.label,
    }));
    const documentFilterOptions = documentStatusOptions.map((status) => ({
      value: status.key,
      label: status.label,
    }));

    return [
      { key: "supplier", label: "仕入先", type: "select", options: supplierOptions },
      { key: "itemCode", label: "品番", type: "text" },
      { key: "itemName", label: "品目", type: "text" },
      { key: "orderDate", label: "発注日", type: "date-range" },
      { key: "deliveryDate", label: "納品予定日", type: "date-range" },
      { key: "status", label: "ステータス", type: "select", options: statusFilterOptions },
      { key: "documentStatus", label: "書類状況", type: "select", options: documentFilterOptions },
    ];
  }, [rows]);

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

    const matchesDateRange = (rowValue: string, filter: FilterRow) => {
      const rowTime = Date.parse(rowValue);
      if (Number.isNaN(rowTime)) {
        return false;
      }
      // 日付は両端を含む期間指定で判定する
      const minTime = filter.value ? Date.parse(filter.value) : Number.NEGATIVE_INFINITY;
      const maxTime = filter.valueTo ? Date.parse(filter.valueTo) : Number.POSITIVE_INFINITY;
      if (Number.isNaN(minTime) || Number.isNaN(maxTime)) {
        return false;
      }
      return rowTime >= minTime && rowTime <= maxTime;
    };

    return rows.filter((row) =>
      Object.entries(groupedFilters).every(([key, values]) => {
        if (!values.length) {
          return true;
        }
        switch (key) {
          case "supplier":
            return values.some((value) => value.value === row.supplier);
          case "itemCode":
            return values.some((value) =>
              row.items.some((item) => item.itemCode.toLowerCase().includes(value.value.toLowerCase()))
            );
          case "itemName":
            return values.some((value) =>
              row.items.some((item) => item.itemName.toLowerCase().includes(value.value.toLowerCase()))
            );
          case "orderDate":
            return values.some((value) => matchesDateRange(row.orderDate, value));
          case "deliveryDate":
            return values.some((value) => matchesDateRange(row.deliveryDate, value));
          case "status":
            return values.some((value) => row.status[value.value as OrderStatusKey]);
          case "documentStatus":
            return values.some((value) => row.documentStatus[value.value as DocumentStatusKey]);
          default:
            return true;
        }
      })
    );
  }, [filters, rows]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const totalCount = rows.length;
    const orderedCount = rows.filter((row) => row.status.ordered).length;
    const deliveredCount = rows.filter((row) => row.status.delivered).length;
    return [
      { label: "発注件数", value: totalCount, tone: "primary", icon: <ShoppingCart size={22} /> },
      { label: "発注済み", value: orderedCount, tone: "warning", icon: <Clock size={22} /> },
      { label: "納品済み", value: deliveredCount, tone: "success", icon: <CheckCircle size={22} /> },
    ];
  }, [rows]);

  const itemOptions = useMemo(
    () =>
      materialRows.map((row) => ({
        value: row.code,
        label: `${row.code} ${row.name}`,
        name: row.name,
        supplier: row.supplier,
        unit: row.unit,
        unitPrice: row.unitPrice,
        currency: row.currency,
      })),
    [materialRows]
  );
  const supplierOptions = useMemo(
    () => clientRows.map((row) => ({ value: row.name, label: row.name })),
    [clientRows]
  );
  const currencyOptions = useMemo(() => {
    const uniqueValues = (values: string[]) => Array.from(new Set(values));
    return uniqueValues(materialRows.map((row) => row.currency)).map((value) => ({
      value,
      label: value,
    }));
  }, [materialRows]);
  const statusOptions = useMemo(
    () => orderStatusOptions.map((status) => ({ value: status.key, label: status.label })),
    [orderStatusOptions]
  );
  const documentOptions = useMemo(
    () => documentStatusOptions.map((status) => ({ value: status.key, label: status.label })),
    [documentStatusOptions]
  );

  const openIssue = (row: OrderRow) => {
    setIssuingRow(row);
  };

  const closeIssue = () => {
    setIssuingRow(null);
  };

  // 編集モーダルを閉じてから削除確認を表示する
  const handleEditDelete = (row: OrderRow) => {
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
        createLabel="新規発注"
      />
      <OrderManagementTableView rows={filteredRows} onRowClick={openEdit} onIssue={openIssue} onDelete={openDelete} />
      <NewOrderModal
        open={isCreateOpen}
        onClose={closeCreate}
        onSave={saveCreate}
        itemOptions={itemOptions}
        supplierOptions={supplierOptions}
        currencyOptions={currencyOptions}
        statusOptions={statusOptions}
        documentOptions={documentOptions}
      />
      <EditOrderModal
        key={editingRow?.id ?? "order-edit"}
        open={Boolean(editingRow)}
        order={editingRow}
        onClose={closeEdit}
        onSave={saveEdit}
        onDelete={handleEditDelete}
        itemOptions={itemOptions}
        supplierOptions={supplierOptions}
        currencyOptions={currencyOptions}
        statusOptions={statusOptions}
        documentOptions={documentOptions}
      />
      <DeleteOrderDialog
        open={Boolean(deletingRow)}
        order={deletingRow}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
      <OrderIssueModal open={Boolean(issuingRow)} order={issuingRow} onClose={closeIssue} />
    </div>
  );
}
