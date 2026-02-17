"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@mui/material";
import { CheckCircle, Clock, Package, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import ToolBar, { FilterDefinition, FilterRow } from "@/components/ToolBar";
import SummaryCards, { SummaryCard } from "@/components/SummaryCards";
import LoadingModal from "@/components/LoadingModal";
import useMasterCrud from "@/hooks/useMasterCrud";
import DeleteSalesDialog from "@/features/sales-management/ui/DeleteSalesDialog";
import EditSalesModal from "@/features/sales-management/ui/EditSalesModal";
import {
  InvoicePackingPayload,
  type InvoicePackingTemplate,
} from "@/features/sales-management/invoicePackingList";
import NewSalesModal from "@/features/sales-management/ui/NewSalesModal";
import RemainingOrderSummaryModal from "@/features/sales-management/ui/RemainingOrderSummaryModal";
import SalesManagementTableView from "@/features/sales-management/ui/SalesManagementTableView";
import InvoicePackingTemplateDialog from "@/features/sales-management/ui/InvoicePackingTemplateDialog";
import InvoicePackingPreviewModal from "@/features/sales-management/ui/InvoicePackingPreviewModal";
import { calculateSalesMetrics } from "@/features/sales-management/salesManagementUtils";
import {
  createSalesOrder,
  deleteSalesOrder,
  fetchSalesOrderRows,
  updateSalesOrder,
} from "@/features/sales-management/api/client";
import {
  salesDocumentStatusOptions,
  salesStatusOptions,
  type NewSalesOrderInput,
  type SalesDocumentStatusKey,
  type SalesRow,
  type SalesStatusKey,
} from "@/features/sales-management/types";
import { fetchClientRows } from "@/features/client-master/api/client";
import { fetchMaterialRows } from "@/features/material-master/api/client";
import { fetchProductRows } from "@/features/product-master/api/client";
import { fetchExchangeRates } from "@/features/settings/api/client";
import type { ClientRow } from "@/features/client-master/types";
import type { MaterialRow } from "@/features/material-master/types";
import type { ProductRow } from "@/features/product-master/types";
import type { ExchangeRates } from "@/features/settings/types";
import { CURRENCY_OPTION_ITEMS } from "@/constants/currency";
import {
  convertToUsd,
  DEFAULT_EXCHANGE_RATES,
  formatCurrencyValue,
  formatNumberValue,
  getCurrentMonthRange,
  isWithinRange,
  normalizeExchangeRates,
} from "@/features/aggregation/aggregationUtils";

export default function SalesManagementView() {
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
  } = useMasterCrud<SalesRow>([], (item, nextId) => ({
    ...item,
    id: nextId,
    salesOrderId: item.salesOrderId ?? `local_${nextId}`,
  }));
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryKey, setSummaryKey] = useState(0);
  const [issuingRowId, setIssuingRowId] = useState<number | null>(null);
  const [issueTarget, setIssueTarget] = useState<SalesRow | null>(null);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [issueDialogKey, setIssueDialogKey] = useState(0);
  const [isIssuePreviewOpen, setIsIssuePreviewOpen] = useState(false);
  const [issuePreviewPayload, setIssuePreviewPayload] = useState<InvoicePackingPayload | null>(null);
  const [issuePreviewRow, setIssuePreviewRow] = useState<SalesRow | null>(null);
  const [isIssuePreviewLoading, setIsIssuePreviewLoading] = useState(false);

  const [mutating, setMutating] = useState(false);
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [mutatingAction, setMutatingAction] = useState<"create" | "edit" | "delete" | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [optionError, setOptionError] = useState<string | null>(null);
  const [clientRows, setClientRows] = useState<ClientRow[]>([]);
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);

  const reload = async () => {
    const fetched = await fetchSalesOrderRows();
    replaceRows(fetched);
  };

  const reloadMasterOptions = async () => {
    try {
      setOptionError(null);
      const [clients, materials, products] = await Promise.all([
        fetchClientRows(),
        fetchMaterialRows(),
        fetchProductRows(),
      ]);
      setClientRows(clients);
      setMaterialRows(materials);
      setProductRows(products);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to load master data";
      setOptionError(msg);
    }
  };

  const handleCreate = (input: NewSalesOrderInput) => {
    (async () => {
      try {
        setMutating(true);
        setMutatingAction("create");
        setMutateError(null);
        closeCreate();

        await createSalesOrder(input);
        await reload();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to create sales order";
        setMutateError(msg);
        closeCreate();
      } finally {
        setMutating(false);
        setMutatingAction(null);
      }
    })();
  };

  const handleEdit = async (next: SalesRow) => {
    try {
      setMutating(true);
      setMutatingAction("edit");
      setMutateError(null);
      closeEdit();

      await updateSalesOrder(next);
      await reload();
      return true;
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to update sales order";
      setMutateError(msg);
      closeEdit();
      return false;
    } finally {
      setMutating(false);
      setMutatingAction(null);
    }
  };

  const handleDelete = (row: SalesRow) => {
    (async () => {
      try {
        setMutating(true);
        setMutatingAction("delete");
        setMutateError(null);
        closeDelete();

        await deleteSalesOrder(row.salesOrderId);
        await reload();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Failed to delete sales order";
        setMutateError(msg);
        closeDelete();
      } finally {
        setMutating(false);
        setMutatingAction(null);
      }
    })();
  };

  // DynamoDB から受注データを取得
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const fetched = await fetchSalesOrderRows();
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

  // 取引先/材料/製品の候補を初回取得
  useEffect(() => {
    reloadMasterOptions();
  }, []);

  // 新規/編集モーダルを開くたびに候補を最新化
  useEffect(() => {
    if (isCreateOpen || Boolean(editingRow)) {
      reloadMasterOptions();
    }
  }, [isCreateOpen, editingRow]);

  const currencyOptions = CURRENCY_OPTION_ITEMS;

  const filterDefinitions = useMemo<FilterDefinition[]>(() => {
    const uniqueValues = (values: string[]) => Array.from(new Set(values));
    const customerOptions = uniqueValues(rows.map((row) => row.customerName)).map((value) => ({
      value,
      label: value,
    }));
    const materialOptions = uniqueValues(rows.flatMap((row) => row.items.flatMap((item) => item.materials))).map(
      (value) => ({
        value,
        label: value,
      }),
    );
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
      { key: "currency", label: "通貨", type: "select", options: currencyOptions },
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
  }, [currencyOptions, rows]);

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
          case "currency":
            return values.some((value) => value.value === row.currency);
          case "productCode":
            return values.some((value) =>
              row.items.some((item) => item.productCode.toLowerCase().includes(value.value.toLowerCase())),
            );
          case "productName":
            return values.some((value) =>
              row.items.some((item) => item.productName.toLowerCase().includes(value.value.toLowerCase())),
            );
          case "material":
            return values.some((value) => row.items.some((item) => item.materials.includes(value.value)));
          case "stockQuantity":
            return values.some((value) => row.items.some((item) => matchesNumberRange(item.stockQuantity, value)));
          case "orderQuantity":
            return values.some((value) => matchesNumberRange(metrics.orderQuantity, value));
          case "shippedQuantity":
            return values.some((value) => matchesNumberRange(metrics.shippedQuantity, value));
          case "remainingQuantity":
            return values.some((value) => matchesNumberRange(metrics.remainingQuantity, value));
          case "unitPrice":
            return values.some((value) => row.items.some((item) => matchesNumberRange(item.unitPrice, value)));
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

  const monthRange = useMemo(() => getCurrentMonthRange(), []);
  const monthSummary = useMemo(() => {
    let totalUsd = 0;
    let count = 0;
    rows.forEach((row) => {
      if (!row.documentStatus.orderReceived) {
        return;
      }
      if (!isWithinRange(row.orderDate, monthRange.startDate, monthRange.endDate)) {
        return;
      }
      const metrics = calculateSalesMetrics(row.items);
      count += 1;
      totalUsd += convertToUsd(metrics.amount, row.currency, exchangeRates);
    });
    return { totalUsd, count };
  }, [exchangeRates, monthRange.endDate, monthRange.startDate, rows]);

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
  }, [materialRows, productRows]);

  const customerOptions = useMemo(
    () =>
      clientRows
        .filter((row) => row.status !== "inactive" && row.name.trim() !== "")
        .sort((a, b) => a.name.localeCompare(b.name, "ja"))
        .map((row) => ({
          value: row.name,
          label: row.name,
          region: row.region,
          currency: row.currency,
        })),
    [clientRows],
  );

  const statusOptions = useMemo(
    () => salesStatusOptions.map((status) => ({ value: status.key, label: status.label })),
    [],
  );
  const documentOptions = useMemo(
    () => salesDocumentStatusOptions.map((status) => ({ value: status.key, label: status.label })),
    [],
  );

  const handleEditDelete = (row: SalesRow) => {
    closeEdit();
    openDelete(row);
  };

  const countryLabelMap: Record<string, string> = {
    日本: "JAPAN",
    ベトナム: "VIETNAM",
    タイ: "THAILAND",
    インドネシア: "INDONESIA",
  };

  const formatInvoiceDate = () => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const sanitizeFileName = (value: string) => {
    const trimmed = value.trim();
    const sanitized = trimmed.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "");
    return sanitized || "invoice";
  };

  const isAbortError = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

  type SaveFilePickerHandle = {
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  };

  const pickSaveFileHandle = async (fileName: string): Promise<SaveFilePickerHandle | "cancelled" | null> => {
    const picker = (
      window as Window & {
        showSaveFilePicker?: (options?: {
          suggestedName?: string;
          types?: Array<{
            description?: string;
            accept: Record<string, string[]>;
          }>;
          excludeAcceptAllOption?: boolean;
        }) => Promise<SaveFilePickerHandle>;
      }
    ).showSaveFilePicker;
    if (!picker) {
      return null;
    }
    try {
      return await picker({
        suggestedName: fileName,
        types: [
          {
            description: "Excel (.xlsx)",
            accept: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            },
          },
        ],
      });
    } catch (error) {
      if (isAbortError(error)) {
        return "cancelled";
      }
      throw error;
    }
  };

  const saveBlobToPickedFile = async (
    blob: Blob,
    handle: SaveFilePickerHandle,
  ): Promise<"saved" | "cancelled"> => {
    try {
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "saved";
    } catch (error) {
      if (isAbortError(error)) {
        return "cancelled";
      }
      throw error;
    }
  };

  const openIssueDialog = (row: SalesRow) => {
    if (issuingRowId !== null) {
      return;
    }
    setIssueError(null);
    setIssueTarget(row);
    setIsIssueDialogOpen(true);
    setIssueDialogKey((prev) => prev + 1);
  };

  const closeIssueDialog = () => {
    setIsIssueDialogOpen(false);
    setIssueTarget(null);
  };

  const buildInvoicePackingPayload = async (
    row: SalesRow,
    templateType: InvoicePackingTemplate,
  ): Promise<InvoicePackingPayload> => {
    const customerInfo = clientRows.find((item) => item.name === row.customerName);
    const region = customerInfo?.region ?? row.customerRegion ?? "";
    const destinationCountry = countryLabelMap[region] ?? region;
    let rateSnapshot = DEFAULT_EXCHANGE_RATES;
    try {
      rateSnapshot = await fetchExchangeRates();
    } catch (error) {
      console.error("Failed to load exchange rates", error);
    }
    const safeRates = normalizeExchangeRates(rateSnapshot);
    const currency = row.currency?.toUpperCase();
    const usdRate = currency === "JPY" ? 1 / safeRates.jpyPerUsd : currency === "VND" ? 1 / safeRates.vndPerUsd : 1;
    const safeUsdRate = Number.isFinite(usdRate) && usdRate > 0 ? usdRate : 1;
    const items = row.items.map((item) => {
      const product = productRows.find((productRow) => productRow.code === item.productCode);
      return {
        partNo: item.productCode,
        partName: item.productName,
        poNo: row.orderNo,
        unit: product?.unit ?? "",
        quantity: item.orderQuantity,
        unitPrice: item.unitPrice * safeUsdRate,
        palletCount: item.palletCount,
        totalWeight: item.totalWeight,
        packaging: product?.packaging ?? null,
      };
    });
    return {
      orderNo: row.orderNo,
      invoiceDate: formatInvoiceDate(),
      invoiceNo: row.orderNo,
      templateType,
      destinationCountry,
      consigneeName: row.customerName,
      consigneeAddress: customerInfo?.address ?? "",
      consigneeTel: customerInfo?.phone ?? "",
      consigneeTaxId: customerInfo?.taxId ?? "",
      items,
    };
  };

  const downloadInvoicePackingList = async (
    payload: InvoicePackingPayload,
    saveFileHandle: SaveFilePickerHandle | null,
  ): Promise<"saved" | "cancelled"> => {
    const response = await fetch("/api/invoice-packing-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Excelファイルの発行に失敗しました (${response.status})`);
    }
    const blob = await response.blob();
    const fileName = `インボイス-パッキングリスト-${sanitizeFileName(payload.orderNo)}.xlsx`;
    if (saveFileHandle) {
      return saveBlobToPickedFile(blob, saveFileHandle);
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return "saved";
  };

  const openIssuePreview = async (row: SalesRow, templateType: InvoicePackingTemplate) => {
    setIssueError(null);
    setIssuePreviewRow(row);
    setIssuePreviewPayload(null);
    setIsIssuePreviewOpen(true);
    setIsIssuePreviewLoading(true);
    try {
      const payload = await buildInvoicePackingPayload(row, templateType);
      setIssuePreviewPayload(payload);
    } catch (error) {
      console.error("Failed to build invoice preview", error);
      setIssueError("プレビューの生成に失敗しました。");
      setIsIssuePreviewOpen(false);
      setIssuePreviewRow(null);
      setIssuePreviewPayload(null);
    } finally {
      setIsIssuePreviewLoading(false);
    }
  };

  const closeIssuePreview = () => {
    setIsIssuePreviewOpen(false);
    setIssuePreviewPayload(null);
    setIssuePreviewRow(null);
    setIsIssuePreviewLoading(false);
  };

  const handleIssuePreview = async () => {
    if (!issuePreviewRow || !issuePreviewPayload || issuingRowId !== null) {
      return;
    }
    const fileName = `インボイス-パッキングリスト-${sanitizeFileName(issuePreviewPayload.orderNo)}.xlsx`;
    let saveFileHandle: SaveFilePickerHandle | null = null;
    try {
      const picked = await pickSaveFileHandle(fileName);
      if (picked === "cancelled") {
        return;
      }
      saveFileHandle = picked;
    } catch (error) {
      console.error("Failed to open save dialog", error);
      const msg = "保存先の選択に失敗しました";
      setIssueError(msg);
      return;
    }
    setIssuingRowId(issuePreviewRow.id);
    setIssueError(null);
    try {
      const result = await downloadInvoicePackingList(issuePreviewPayload, saveFileHandle);
      if (result === "saved") {
        closeIssuePreview();
      }
    } catch (error) {
      console.error("Failed to download invoice packing list", error);
      const msg = "Excelファイルの発行に失敗しました";
      setIssueError(msg);
    } finally {
      setIssuingRowId(null);
    }
  };

  const handleIssueRequest = (row: SalesRow) => {
    openIssueDialog(row);
  };

  const handleIssueTemplateSelect = (templateType: InvoicePackingTemplate) => {
    const target = issueTarget;
    closeIssueDialog();
    if (target) {
      void openIssuePreview(target, templateType);
    }
  };

  const openSummary = () => {
    setSummaryKey((prev) => prev + 1);
    setIsSummaryOpen(true);
  };

  const closeSummary = () => {
    setIsSummaryOpen(false);
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
            <div className="text-xs text-gray-500">確定のみ・受注日基準・集計時点レート</div>
          </div>
          <Button variant="contained" size="small" onClick={() => router.push("/sales-management/summary")}>
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
      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          受注管理の取得に失敗しました。（{loadError}）
        </div>
      )}
      {optionError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          取引先・材料・製品マスタの取得に失敗しました。（{optionError}）
        </div>
      )}
      {mutateError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          操作に失敗しました。（{mutateError}）
        </div>
      )}
      {issueError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{issueError}</div>
      )}
      {loading && <div className="text-sm text-gray-500">読み込み中...</div>}
      <SalesManagementTableView
        rows={filteredRows}
        onRowClick={openEdit}
        onDelete={openDelete}
        onIssue={handleIssueRequest}
        issuingRowId={issuingRowId}
      />
      <NewSalesModal
        open={isCreateOpen}
        onClose={closeCreate}
        onSave={handleCreate}
        productOptions={productOptions}
        customerOptions={customerOptions}
        currencyOptions={currencyOptions}
        statusOptions={statusOptions}
        documentOptions={documentOptions}
      />
      <EditSalesModal
        key={`sales-edit-${editingRow?.id ?? "default"}`}
        open={Boolean(editingRow)}
        sales={editingRow}
        onClose={closeEdit}
        onSave={handleEdit}
        onDelete={handleEditDelete}
        onIssue={handleIssueRequest}
        isIssuing={Boolean(editingRow && issuingRowId === editingRow.id)}
        productOptions={productOptions}
        customerOptions={customerOptions}
        currencyOptions={currencyOptions}
        statusOptions={statusOptions}
        documentOptions={documentOptions}
      />
      <InvoicePackingTemplateDialog
        key={`issue-dialog-${issueDialogKey}`}
        open={isIssueDialogOpen}
        sales={issueTarget}
        onClose={closeIssueDialog}
        onSelect={handleIssueTemplateSelect}
      />
      <InvoicePackingPreviewModal
        open={isIssuePreviewOpen}
        payload={issuePreviewPayload}
        loading={isIssuePreviewLoading}
        issuing={Boolean(issuePreviewRow && issuingRowId === issuePreviewRow.id)}
        onClose={closeIssuePreview}
        onIssue={handleIssuePreview}
      />
      <DeleteSalesDialog
        open={Boolean(deletingRow)}
        sales={deletingRow}
        onClose={closeDelete}
        onConfirm={handleDelete}
      />
      <RemainingOrderSummaryModal
        key={`summary-${summaryKey}`}
        open={isSummaryOpen}
        rows={rows}
        onClose={closeSummary}
      />
      <LoadingModal open={mutating} message={savingMessage} />
    </div>
  );
}
