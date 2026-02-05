"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@mui/material";
import { CheckCircle, Clock, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import ToolBar, { FilterDefinition, FilterRow } from "@/components/ToolBar";
import SummaryCards, { SummaryCard } from "@/components/SummaryCards";
import LoadingModal from "@/components/LoadingModal";
import useMasterCrud from "@/hooks/useMasterCrud";
import DeleteOrderDialog from "@/features/order-management/DeleteOrderDialog";
import EditOrderModal from "@/features/order-management/EditOrderModal";
import OrderIssueModal from "@/features/order-management/OrderIssueModal";
import NewOrderModal from "@/features/order-management/NewOrderModal";
import OrderManagementTableView from "@/features/order-management/OrderManagementTableView";
import {
  createPurchaseOrder,
  deletePurchaseOrder,
  fetchPurchaseOrderRows,
  updatePurchaseOrder,
} from "@/features/order-management/api/client";
import {
  documentStatusOptions,
  orderStatusOptions,
  type DocumentStatusKey,
  type NewPurchaseOrderInput,
  type OrderRow,
  type OrderStatusKey,
} from "@/features/order-management/types";
import { fetchClientRows } from "@/features/client-master/api/client";
import { fetchMaterialRows } from "@/features/material-master/api/client";
import { fetchExchangeRates } from "@/features/settings/api/client";
import type { ClientRow } from "@/features/client-master/types";
import type { MaterialRow } from "@/features/material-master/types";
import type { ExchangeRates } from "@/features/settings/types";
import {
  convertToUsd,
  DEFAULT_EXCHANGE_RATES,
  formatCurrencyValue,
  formatNumberValue,
  getCurrentMonthRange,
  isWithinRange,
  normalizeExchangeRates,
} from "@/features/aggregation/aggregationUtils";

export default function OrderManagementView() {
  const router = useRouter();
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
  } = useMasterCrud<OrderRow>([], (item, nextId) => ({
    ...item,
    id: nextId,
    purchaseOrderId: item.purchaseOrderId ?? `local_${nextId}`,
  }));
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [issuingRow, setIssuingRow] = useState<OrderRow | null>(null);

  const [mutating, setMutating] = useState(false);
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [mutatingAction, setMutatingAction] = useState<"create" | "edit" | "delete" | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [optionError, setOptionError] = useState<string | null>(null);
  const [clientRows, setClientRows] = useState<ClientRow[]>([]);
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);

  const reload = async () => {
    const fetched = await fetchPurchaseOrderRows();
    replaceRows(fetched);
  };

  const reloadMasterOptions = async () => {
    try {
      setOptionError(null);
      const [materials, clients] = await Promise.all([fetchMaterialRows(), fetchClientRows()]);
      setMaterialRows(materials);
      setClientRows(clients);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to load master data";
      setOptionError(msg);
    }
  };

  const handleCreate = (input: NewPurchaseOrderInput) => {
    (async () => {
      try {
        setMutating(true);
        setMutatingAction("create");
        setMutateError(null);
        closeCreate();

        await createPurchaseOrder(input);
        await reload();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to create order";
        setMutateError(msg);
        closeCreate();
      } finally {
        setMutating(false);
        setMutatingAction(null);
      }
    })();
  };

  const handleEdit = async (next: OrderRow) => {
    try {
      setMutating(true);
      setMutatingAction("edit");
      setMutateError(null);
      closeEdit();

      await updatePurchaseOrder(next);
      await reload();
      return true;
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to update order";
      setMutateError(msg);
      closeEdit();
      return false;
    } finally {
      setMutating(false);
      setMutatingAction(null);
    }
  };

  const handleDelete = (row: OrderRow) => {
    (async () => {
      try {
        setMutating(true);
        setMutatingAction("delete");
        setMutateError(null);
        closeDelete();

        await deletePurchaseOrder(row.purchaseOrderId);
        await reload();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to delete order";
        setMutateError(msg);
        closeDelete();
      } finally {
        setMutating(false);
        setMutatingAction(null);
      }
    })();
  };

  // DynamoDB から発注データを取得
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const fetched = await fetchPurchaseOrderRows();
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fetched = await fetchExchangeRates();
        if (!cancelled) {
          setExchangeRates(normalizeExchangeRates(fetched));
        }
      } catch (error) {
        console.error("Failed to load exchange rates", error);
        if (!cancelled) {
          setExchangeRates(normalizeExchangeRates());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 取引先/材料の候補を初回取得
  useEffect(() => {
    reloadMasterOptions();
  }, []);

  // 新規/編集モーダルを開くたびに候補を最新化
  useEffect(() => {
    if (isCreateOpen || Boolean(editingRow)) {
      reloadMasterOptions();
    }
  }, [isCreateOpen, editingRow]);

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

  const monthRange = useMemo(() => getCurrentMonthRange(), []);
  const monthSummary = useMemo(() => {
    let totalUsd = 0;
    let count = 0;
    rows.forEach((row) => {
      if (!row.documentStatus.orderSent) {
        return;
      }
      if (!isWithinRange(row.orderDate, monthRange.startDate, monthRange.endDate)) {
        return;
      }
      count += 1;
      totalUsd += convertToUsd(row.amount, row.currency, exchangeRates);
    });
    return { totalUsd, count };
  }, [exchangeRates, monthRange.endDate, monthRange.startDate, rows]);

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
    [materialRows],
  );

  const supplierOptions = useMemo(() => {
    const names = Array.from(new Set(clientRows.map((row) => row.name.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "ja"),
    );
    return names.map((name) => ({ value: name, label: name }));
  }, [clientRows]);


  const statusOptions = orderStatusOptions.map((status) => ({ value: status.key, label: status.label }));
  const documentOptions = documentStatusOptions.map((status) => ({ value: status.key, label: status.label }));

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

  const monthlyAmountLabel = loading ? "読み込み中..." : formatCurrencyValue("USD", monthSummary.totalUsd);
  const monthlyCountLabel = loading ? "-" : formatNumberValue(monthSummary.count);

  const savingMessage = mutatingAction === "delete" ? "削除中" : "保存中";

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards cards={summaryCards} />
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-700">集計サマリー（今月）</div>
            <div className="text-xs text-gray-500">確定のみ・発注日基準・集計時点レート</div>
          </div>
          <Button variant="contained" size="small" onClick={() => router.push("/order-management/summary")}>
            集計ページへ
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-6">
          <div>
            <div className="text-xs text-gray-500">USD換算合計</div>
            <div className="text-lg font-bold text-gray-900">{monthlyAmountLabel}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">件数</div>
            <div className="text-lg font-bold text-gray-900">{monthlyCountLabel}</div>
          </div>
        </div>
      </div>
      <ToolBar
        filterDefinitions={filterDefinitions}
        filters={filters}
        onFiltersChange={setFilters}
        onCreate={openCreate}
        createLabel="新規発注"
      />
      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          発注管理の取得に失敗しました。（{loadError}）
        </div>
      )}
      {optionError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          取引先・材料マスタの取得に失敗しました。（{optionError}）
        </div>
      )}
      {mutateError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          操作に失敗しました。（{mutateError}）
        </div>
      )}
      {loading && <div className="text-sm text-gray-500">読み込み中...</div>}
      <OrderManagementTableView rows={filteredRows} onRowClick={openEdit} onIssue={openIssue} onDelete={openDelete} />
      <NewOrderModal
        open={isCreateOpen}
        onClose={closeCreate}
        onSave={handleCreate}
        itemOptions={itemOptions}
        supplierOptions={supplierOptions}
        statusOptions={statusOptions}
        documentOptions={documentOptions}
      />
      <EditOrderModal
        key={editingRow?.id ?? "order-edit"}
        open={Boolean(editingRow)}
        order={editingRow}
        onClose={closeEdit}
        onSave={handleEdit}
        onDelete={handleEditDelete}
        onIssue={openIssue}
        isIssuing={Boolean(issuingRow && editingRow && issuingRow.purchaseOrderId === editingRow.purchaseOrderId)}
        itemOptions={itemOptions}
        supplierOptions={supplierOptions}
        statusOptions={statusOptions}
        documentOptions={documentOptions}
      />
      <DeleteOrderDialog
        open={Boolean(deletingRow)}
        order={deletingRow}
        onClose={closeDelete}
        onConfirm={handleDelete}
      />
      <OrderIssueModal open={Boolean(issuingRow)} order={issuingRow} onClose={closeIssue} clients={clientRows} />
      <LoadingModal open={mutating} message={savingMessage} />
    </div>
  );
}
