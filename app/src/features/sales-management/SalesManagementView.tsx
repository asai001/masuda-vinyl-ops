"use client";

import { useMemo, useState } from "react";
import { Button } from "@mui/material";
import { CheckCircle, Clock, Package, TrendingUp } from "lucide-react";
import ToolBar, { FilterDefinition, FilterRow } from "@/components/ToolBar";
import SummaryCards, { SummaryCard } from "@/components/SummaryCards";
import useMasterCrud from "@/hooks/useMasterCrud";
import DeleteSalesDialog from "@/features/sales-management/DeleteSalesDialog";
import EditSalesModal from "@/features/sales-management/EditSalesModal";
import NewSalesModal from "@/features/sales-management/NewSalesModal";
import RemainingOrderSummaryModal from "@/features/sales-management/RemainingOrderSummaryModal";
import SalesManagementTableView from "@/features/sales-management/SalesManagementTableView";
import { calculateSalesMetrics } from "@/features/sales-management/salesManagementUtils";
import { clientRows } from "@/mock/clientMasterData";
import { materialRows } from "@/mock/materialMasterData";
import { productRows } from "@/mock/productMasterData";
import {
  salesDocumentStatusOptions,
  salesRows,
  salesStatusOptions,
  SalesDocumentStatusKey,
  SalesRow,
  SalesStatusKey,
} from "@/mock/salesManagementData";

export default function SalesManagementView() {
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
  } = useMasterCrud<SalesRow>(salesRows, (item, nextId) => ({ ...item, id: nextId }));
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryKey, setSummaryKey] = useState(0);

  const filterDefinitions = useMemo<FilterDefinition[]>(() => {
    const uniqueValues = (values: string[]) => Array.from(new Set(values));
    const customerOptions = uniqueValues(rows.map((row) => row.customerName)).map((value) => ({
      value,
      label: value,
    }));
    const materialOptions = uniqueValues(
      rows.flatMap((row) => row.items.flatMap((item) => item.materials))
    ).map((value) => ({
      value,
      label: value,
    }));
    const statusFilterOptions = salesStatusOptions.map((status) => ({
      value: status.key,
      label: status.label,
    }));
    const documentFilterOptions = salesDocumentStatusOptions.map((status) => ({
      value: status.key,
      label: status.label,
    }));

    return [
      { key: "orderNo", label: "PO NO.", type: "text" },
      { key: "orderDate", label: "受注日", type: "date-range" },
      { key: "customer", label: "顧客名", type: "select", options: customerOptions },
      { key: "productCode", label: "品番", type: "text" },
      { key: "productName", label: "品目", type: "text" },
      { key: "material", label: "使用材料", type: "select", options: materialOptions },
      { key: "stockQuantity", label: "在庫数", type: "range" },
      { key: "orderQuantity", label: "注数", type: "range" },
      { key: "shippedQuantity", label: "出荷数", type: "range" },
      { key: "remainingQuantity", label: "残注数", type: "range" },
      { key: "unitPrice", label: "単価", type: "range" },
      { key: "amount", label: "金額", type: "range" },
      { key: "requiredMaterial", label: "必要材料量", type: "range" },
      { key: "moldingTime", label: "成形時間", type: "range" },
      { key: "deliveryDate", label: "納品予定日", type: "date-range" },
      { key: "status", label: "ステータス", type: "select", options: statusFilterOptions },
      { key: "documentStatus", label: "請求状況", type: "select", options: documentFilterOptions },
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
      const minTime = filter.value ? Date.parse(filter.value) : Number.NEGATIVE_INFINITY;
      const maxTime = filter.valueTo ? Date.parse(filter.valueTo) : Number.POSITIVE_INFINITY;
      if (Number.isNaN(minTime) || Number.isNaN(maxTime)) {
        return false;
      }
      return rowTime >= minTime && rowTime <= maxTime;
    };

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

    return rows.filter((row) => {
      const metrics = calculateSalesMetrics(row.items);
      return Object.entries(groupedFilters).every(([key, values]) => {
        if (!values.length) {
          return true;
        }
        switch (key) {
          case "orderNo":
            return values.some((value) => row.orderNo.toLowerCase().includes(value.value.toLowerCase()));
          case "orderDate":
            return values.some((value) => matchesDateRange(row.orderDate, value));
          case "customer":
            return values.some((value) => value.value === row.customerName);
          case "productCode":
            return values.some((value) =>
              row.items.some((item) => item.productCode.toLowerCase().includes(value.value.toLowerCase()))
            );
          case "productName":
            return values.some((value) =>
              row.items.some((item) => item.productName.toLowerCase().includes(value.value.toLowerCase()))
            );
          case "material":
            return values.some((value) =>
              row.items.some((item) => item.materials.includes(value.value))
            );
          case "stockQuantity":
            return values.some((value) =>
              row.items.some((item) => matchesNumberRange(item.stockQuantity, value))
            );
          case "orderQuantity":
            return values.some((value) => matchesNumberRange(metrics.orderQuantity, value));
          case "shippedQuantity":
            return values.some((value) => matchesNumberRange(metrics.shippedQuantity, value));
          case "remainingQuantity":
            return values.some((value) => matchesNumberRange(metrics.remainingQuantity, value));
          case "unitPrice":
            return values.some((value) =>
              row.items.some((item) => matchesNumberRange(item.unitPrice, value))
            );
          case "amount":
            return values.some((value) => matchesNumberRange(metrics.amount, value));
          case "requiredMaterial":
            return values.some((value) => matchesNumberRange(metrics.requiredMaterial, value));
          case "moldingTime":
            return values.some((value) => matchesNumberRange(metrics.moldingTime, value));
          case "deliveryDate":
            return values.some((value) => matchesDateRange(row.deliveryDate, value));
          case "status":
            return values.some((value) => row.status[value.value as SalesStatusKey]);
          case "documentStatus":
            return values.some((value) => row.documentStatus[value.value as SalesDocumentStatusKey]);
          default:
            return true;
        }
      });
    });
  }, [filters, rows]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const totalCount = rows.length;
    const shippedCount = rows.filter((row) => row.status.shipped).length;
    const deliveredCount = rows.filter((row) => row.status.delivered).length;
    const paidCount = rows.filter((row) => row.status.paid).length;
    return [
      { label: "受注件数", value: totalCount, tone: "primary", icon: <TrendingUp size={22} /> },
      { label: "出荷済み", value: shippedCount, tone: "warning", icon: <Clock size={22} /> },
      { label: "納品済み", value: deliveredCount, tone: "muted", icon: <Package size={22} /> },
      { label: "入金済み", value: paidCount, tone: "success", icon: <CheckCircle size={22} /> },
    ];
  }, [rows]);

  const productOptions = useMemo(() => {
    const materialLabelMap = new Map(materialRows.map((row) => [row.code, row.name]));
    return productRows.map((row) => ({
      value: row.code,
      label: `${row.code} ${row.name}`,
      name: row.name,
      materials: row.materials.map((material) => materialLabelMap.get(material) ?? material),
      unitPrice: row.unitPrice,
      currency: row.currency,
      weight: row.weight,
      length: row.length,
      speed: row.speed,
    }));
  }, []);

  const customerOptions = useMemo(
    () =>
      clientRows
        .filter((row) => row.category === "顧客" && row.status === "active")
        .map((row) => ({
          value: row.name,
          label: row.name,
          region: row.region,
          currency: row.currency,
        })),
    []
  );

  const currencyOptions = useMemo(() => {
    const uniqueValues = (values: string[]) => Array.from(new Set(values));
    return uniqueValues([...clientRows.map((row) => row.currency), ...productRows.map((row) => row.currency)]).map(
      (value) => ({
        value,
        label: value,
      })
    );
  }, []);

  const statusOptions = useMemo(
    () => salesStatusOptions.map((status) => ({ value: status.key, label: status.label })),
    []
  );
  const documentOptions = useMemo(
    () => salesDocumentStatusOptions.map((status) => ({ value: status.key, label: status.label })),
    []
  );

  const handleEditDelete = (row: SalesRow) => {
    closeEdit();
    openDelete(row);
  };

  const openSummary = () => {
    setSummaryKey((prev) => prev + 1);
    setIsSummaryOpen(true);
  };

  const closeSummary = () => {
    setIsSummaryOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards cards={summaryCards} />
      <ToolBar
        filterDefinitions={filterDefinitions}
        filters={filters}
        onFiltersChange={setFilters}
        onCreate={openCreate}
        createLabel="新規受注"
        rightActions={
          <Button
            variant="outlined"
            color="warning"
            startIcon={<Package size={16} />}
            onClick={openSummary}
            className="whitespace-nowrap"
          >
            残注数確認
          </Button>
        }
      />
      <SalesManagementTableView rows={filteredRows} onRowClick={openEdit} onDelete={openDelete} />
      <NewSalesModal
        open={isCreateOpen}
        onClose={closeCreate}
        onSave={saveCreate}
        productOptions={productOptions}
        customerOptions={customerOptions}
        currencyOptions={currencyOptions}
        statusOptions={statusOptions}
        documentOptions={documentOptions}
      />
      <EditSalesModal
        key={editingRow?.id ?? "sales-edit"}
        open={Boolean(editingRow)}
        sales={editingRow}
        onClose={closeEdit}
        onSave={saveEdit}
        onDelete={handleEditDelete}
        productOptions={productOptions}
        customerOptions={customerOptions}
        currencyOptions={currencyOptions}
        statusOptions={statusOptions}
        documentOptions={documentOptions}
      />
      <DeleteSalesDialog
        open={Boolean(deletingRow)}
        sales={deletingRow}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
      <RemainingOrderSummaryModal key={summaryKey} open={isSummaryOpen} rows={rows} onClose={closeSummary} />
    </div>
  );
}
