"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@mui/material";
import { CreditCard, Package, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import ToolBar, { type FilterDefinition, type FilterRow } from "@/components/ToolBar";
import SummaryCards, { type SummaryCard } from "@/components/SummaryCards";
import LoadingModal from "@/components/LoadingModal";
import useMasterCrud from "@/hooks/useMasterCrud";
import type { ClientRow } from "@/features/client-master/types";
import { fetchClientRows } from "@/features/client-master/api/client";
import type { ProductRow } from "@/features/product-master/types";
import { fetchProductRows } from "@/features/product-master/api/client";
import {
  DEFAULT_EXCHANGE_RATES,
  formatCurrencyValue,
  formatNumberValue,
  normalizeExchangeRates,
} from "@/features/aggregation/aggregationUtils";
import {
  InvoicePackingPayload,
  type InvoicePackingTemplate,
} from "@/features/sales-management/invoicePackingList";
import InvoicePackingPreviewModal from "@/features/sales-management/ui/InvoicePackingPreviewModal";
import { fetchSalesOrderRows } from "@/features/sales-management/api/client";
import type { SalesRow } from "@/features/sales-management/types";
import { fetchExchangeRates } from "@/features/settings/api/client";
import type { ExchangeRates } from "@/features/settings/types";
import {
  createShipment,
  deleteShipment,
  fetchShipmentRows,
  updateShipment,
} from "@/features/shipment-management/api/client";
import {
  getShipmentOrderNos,
  getShipmentTotalAmount,
  getShipmentTotalQuantity,
  resolveShipmentAllocations,
} from "@/features/shipment-management/shipmentUtils";
import type { NewShipmentInput, ShipmentRow, UpdateShipmentInput } from "@/features/shipment-management/types";
import DeleteShipmentDialog from "@/features/shipment-management/ui/DeleteShipmentDialog";
import ShipmentFormModal from "@/features/shipment-management/ui/ShipmentFormModal";
import ShipmentInvoiceTemplateDialog from "@/features/shipment-management/ui/ShipmentInvoiceTemplateDialog";
import ShipmentManagementTableView from "@/features/shipment-management/ui/ShipmentManagementTableView";

const countryLabelMap: Record<string, string> = {
  日本: "JAPAN",
  ベトナム: "VIETNAM",
  タイ: "THAILAND",
  インドネシア: "INDONESIA",
};

const sanitizeFileName = (value: string) => {
  const trimmed = value.trim();
  const sanitized = trimmed.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "");
  return sanitized || "shipment";
};

const getInvoicePackingPreviewPoNo = (payload: InvoicePackingPayload) =>
  payload.invoiceNo?.trim() || payload.items.find((item) => item.poNo.trim())?.poNo || payload.orderNo;

const formatInvoiceDate = () => {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

type SaveFilePickerHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

export default function ShipmentManagementView() {
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
  } = useMasterCrud<ShipmentRow>([], (item, nextId) => ({ ...item, id: nextId }));

  const [salesRows, setSalesRows] = useState<SalesRow[]>([]);
  const [clientRows, setClientRows] = useState<ClientRow[]>([]);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [optionError, setOptionError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [mutatingAction, setMutatingAction] = useState<"create" | "edit" | "delete" | null>(null);
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issuingShipmentId, setIssuingShipmentId] = useState<string | null>(null);
  const [issueTarget, setIssueTarget] = useState<ShipmentRow | null>(null);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [issueDialogKey, setIssueDialogKey] = useState(0);
  const [isIssuePreviewOpen, setIsIssuePreviewOpen] = useState(false);
  const [issuePreviewPayload, setIssuePreviewPayload] = useState<InvoicePackingPayload | null>(null);
  const [issuePreviewShipment, setIssuePreviewShipment] = useState<ShipmentRow | null>(null);
  const [isIssuePreviewLoading, setIsIssuePreviewLoading] = useState(false);

  const reload = async () => {
    const shipmentRows = await fetchShipmentRows();
    const nextSalesRows = await fetchSalesOrderRows({ shipmentRows });
    replaceRows(shipmentRows);
    setSalesRows(nextSalesRows);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const shipmentRows = await fetchShipmentRows();
        const nextSalesRows = await fetchSalesOrderRows({ shipmentRows });
        if (!cancelled) {
          replaceRows(shipmentRows);
          setSalesRows(nextSalesRows);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load");
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
        setOptionError(null);
        const [clients, products, rates] = await Promise.all([
          fetchClientRows(),
          fetchProductRows(),
          fetchExchangeRates().catch(() => DEFAULT_EXCHANGE_RATES),
        ]);
        if (!cancelled) {
          setClientRows(clients);
          setProductRows(products);
          setExchangeRates(normalizeExchangeRates(rates));
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setOptionError(error instanceof Error ? error.message : "Failed to load options");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (input: NewShipmentInput | UpdateShipmentInput) => {
    try {
      setMutating(true);
      setMutatingAction("create");
      setMutateError(null);
      await createShipment(input as NewShipmentInput);
      await reload();
      return true;
    } catch (error) {
      console.error(error);
      setMutateError(error instanceof Error ? error.message : "Failed to create shipment");
      return false;
    } finally {
      setMutating(false);
      setMutatingAction(null);
    }
  };

  const handleEdit = async (input: NewShipmentInput | UpdateShipmentInput) => {
    try {
      setMutating(true);
      setMutatingAction("edit");
      setMutateError(null);
      await updateShipment(input as UpdateShipmentInput);
      await reload();
      return true;
    } catch (error) {
      console.error(error);
      setMutateError(error instanceof Error ? error.message : "Failed to update shipment");
      return false;
    } finally {
      setMutating(false);
      setMutatingAction(null);
    }
  };

  const handleDelete = (row: ShipmentRow) => {
    void (async () => {
      try {
        setMutating(true);
        setMutatingAction("delete");
        setMutateError(null);
        closeDelete();
        await deleteShipment(row.shipmentId);
        await reload();
      } catch (error) {
        console.error(error);
        setMutateError(error instanceof Error ? error.message : "Failed to delete shipment");
      } finally {
        setMutating(false);
        setMutatingAction(null);
      }
    })();
  };

  const filterDefinitions = useMemo<FilterDefinition[]>(
    () => [
      { key: "shipmentNo", label: "出荷No.", type: "text" },
      { key: "deliveryDate", label: "出荷日", type: "date-range" },
      {
        key: "customerName",
        label: "顧客名",
        type: "select",
        options: Array.from(new Set(rows.map((row) => row.customerName)))
          .filter(Boolean)
          .map((value) => ({ value, label: value })),
      },
      {
        key: "currency",
        label: "通貨",
        type: "select",
        options: Array.from(new Set(rows.map((row) => row.currency)))
          .filter(Boolean)
          .map((value) => ({ value, label: value })),
      },
      { key: "orderNo", label: "PO No.", type: "text" },
    ],
    [rows],
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

    const matchesDateRange = (rowValue: string, filter: FilterRow) => {
      const rowTime = Date.parse(rowValue);
      if (Number.isNaN(rowTime)) {
        return false;
      }
      const minTime = filter.value ? Date.parse(filter.value) : Number.NEGATIVE_INFINITY;
      const maxTime = filter.valueTo ? Date.parse(filter.valueTo) : Number.POSITIVE_INFINITY;
      return rowTime >= minTime && rowTime <= maxTime;
    };

    return rows.filter((row) =>
      Object.entries(groupedFilters).every(([key, values]) => {
        if (!values.length) {
          return true;
        }
        switch (key) {
          case "shipmentNo":
            return values.some((value) => row.shipmentNo.toLowerCase().includes(value.value.toLowerCase()));
          case "deliveryDate":
            return values.some((value) => matchesDateRange(row.deliveryDate, value));
          case "customerName":
            return values.some((value) => row.customerName === value.value);
          case "currency":
            return values.some((value) => row.currency === value.value);
          case "orderNo": {
            const orderNos = getShipmentOrderNos(row, salesRows);
            return values.some((value) =>
              orderNos.some((orderNo) => orderNo.toLowerCase().includes(value.value.toLowerCase())),
            );
          }
          default:
            return true;
        }
      }),
    );
  }, [filters, rows, salesRows]);

  const summaryAmountUsd = rows.reduce((sum, row) => {
    const shipmentAmount = getShipmentTotalAmount(row, salesRows);
    const currency = row.currency?.toUpperCase();
    const safeRates = normalizeExchangeRates(exchangeRates);
    if (currency === "JPY") {
      return sum + shipmentAmount / safeRates.jpyPerUsd;
    }
    if (currency === "VND") {
      return sum + shipmentAmount / safeRates.vndPerUsd;
    }
    return sum + shipmentAmount;
  }, 0);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const paidAmountUsd = rows.reduce((sum, row) => {
      const currency = row.currency?.toUpperCase();
      const safeRates = normalizeExchangeRates(exchangeRates);
      if (currency === "JPY") {
        return sum + row.paidAmount / safeRates.jpyPerUsd;
      }
      if (currency === "VND") {
        return sum + row.paidAmount / safeRates.vndPerUsd;
      }
      return sum + row.paidAmount;
    }, 0);

    return [
      { label: "出荷件数", value: rows.length, tone: "primary", icon: <Package size={22} /> },
      {
        label: "出荷数合計",
        value: formatNumberValue(rows.reduce((sum, row) => sum + getShipmentTotalQuantity(row), 0)),
        tone: "warning",
        icon: <ReceiptText size={22} />,
      },
      {
        label: "出荷金額合計",
        value: formatCurrencyValue("USD", summaryAmountUsd),
        tone: "muted",
        icon: <ReceiptText size={22} />,
      },
      {
        label: "入金額合計",
        value: formatCurrencyValue("USD", paidAmountUsd),
        tone: "success",
        icon: <CreditCard size={22} />,
      },
    ];
  }, [exchangeRates, rows, summaryAmountUsd]);

  const openIssueDialog = (row: ShipmentRow) => {
    if (issuingShipmentId) {
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

  const pickSaveFileHandle = async (fileName: string): Promise<SaveFilePickerHandle | "cancelled" | null> => {
    const picker = (
      window as Window & {
        showSaveFilePicker?: (options?: {
          suggestedName?: string;
          types?: Array<{
            description?: string;
            accept: Record<string, string[]>;
          }>;
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

  const saveBlobToPickedFile = async (blob: Blob, handle: SaveFilePickerHandle): Promise<"saved" | "cancelled"> => {
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

  const buildInvoicePackingPayload = async (
    shipment: ShipmentRow,
    templateType: InvoicePackingTemplate,
  ): Promise<InvoicePackingPayload> => {
    const customerInfo = clientRows.find((row) => row.name === shipment.customerName);
    const region = customerInfo?.region ?? shipment.customerRegion ?? "";
    const destinationCountry = templateType === "hq" ? "JAPAN" : (countryLabelMap[region] ?? region);
    const safeRates = normalizeExchangeRates(exchangeRates);
    const currency = shipment.currency?.toUpperCase();
    const usdRate =
      currency === "JPY" ? 1 / safeRates.jpyPerUsd : currency === "VND" ? 1 / safeRates.vndPerUsd : 1;
    const safeUsdRate = Number.isFinite(usdRate) && usdRate > 0 ? usdRate : 1;

    const allocations = resolveShipmentAllocations(shipment, salesRows);
    const defaultInvoiceNo =
      shipment.invoiceNo.trim() || allocations.find((allocation) => allocation.orderNo.trim())?.orderNo || shipment.shipmentNo;

    const items = allocations.map((allocation) => {
      const product = productRows.find((row) => row.code === allocation.productCode);
      const weight =
        (typeof allocation.weight === "number" && Number.isFinite(allocation.weight) ? allocation.weight : null) ??
        (typeof product?.weight === "number" && Number.isFinite(product.weight) ? product.weight : null);
      const ratio = allocation.orderQuantity > 0 ? allocation.shippedQuantity / allocation.orderQuantity : 0;
      const palletCount = ratio > 0 ? allocation.palletCount * ratio : 0;
      const totalWeight =
        weight !== null ? weight * allocation.shippedQuantity : ratio > 0 ? allocation.totalWeight * ratio : 0;

      return {
        partNo: allocation.productCode,
        partName: allocation.productName,
        poNo: allocation.orderNo,
        unit: product?.unit ?? "",
        quantity: allocation.shippedQuantity,
        unitPrice: allocation.unitPrice * safeUsdRate,
        weight,
        palletCount,
        totalWeight,
        packaging: product?.packaging ?? null,
      };
    });

    return {
      orderNo: shipment.shipmentNo,
      invoiceDate: formatInvoiceDate(),
      invoiceNo: defaultInvoiceNo,
      templateType,
      currency: shipment.currency,
      destinationCountry,
      remark: shipment.note ?? "",
      consigneeName: shipment.customerName,
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
    const fileName = `インボイス-パッキングリスト-${sanitizeFileName(getInvoicePackingPreviewPoNo(payload))}.xlsx`;
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

  const openIssuePreview = async (shipment: ShipmentRow, templateType: InvoicePackingTemplate) => {
    setIssueError(null);
    setIssuePreviewShipment(shipment);
    setIssuePreviewPayload(null);
    setIsIssuePreviewOpen(true);
    setIsIssuePreviewLoading(true);
    try {
      const payload = await buildInvoicePackingPayload(shipment, templateType);
      setIssuePreviewPayload(payload);
    } catch (error) {
      console.error("Failed to build invoice preview", error);
      setIssueError("プレビューの生成に失敗しました。");
      setIsIssuePreviewOpen(false);
      setIssuePreviewShipment(null);
      setIssuePreviewPayload(null);
    } finally {
      setIsIssuePreviewLoading(false);
    }
  };

  const closeIssuePreview = () => {
    setIsIssuePreviewOpen(false);
    setIssuePreviewPayload(null);
    setIssuePreviewShipment(null);
    setIsIssuePreviewLoading(false);
  };

  const buildShipmentInvoiceUpdateInput = (shipment: ShipmentRow, invoiceNo: string): UpdateShipmentInput => ({
    shipmentId: shipment.shipmentId,
    deliveryDate: shipment.deliveryDate,
    invoiceNo,
    paidDate: shipment.paidDate,
    paidAmount: shipment.paidAmount,
    note: shipment.note,
    allocations: shipment.allocations,
  });

  const handleIssuePreview = async () => {
    if (!issuePreviewShipment || !issuePreviewPayload || issuingShipmentId) {
      return;
    }

    const fileName = `インボイス-パッキングリスト-${sanitizeFileName(getInvoicePackingPreviewPoNo(issuePreviewPayload))}.xlsx`;
    let saveFileHandle: SaveFilePickerHandle | null = null;
    try {
      const picked = await pickSaveFileHandle(fileName);
      if (picked === "cancelled") {
        return;
      }
      saveFileHandle = picked;
    } catch (error) {
      console.error("Failed to open save dialog", error);
      setIssueError("保存先の選択に失敗しました");
      return;
    }

    setIssuingShipmentId(issuePreviewShipment.shipmentId);
    setIssueError(null);
    try {
      const result = await downloadInvoicePackingList(issuePreviewPayload, saveFileHandle);
      if (result === "saved") {
        await updateShipment(buildShipmentInvoiceUpdateInput(issuePreviewShipment, issuePreviewPayload.invoiceNo ?? ""));
        await reload();
        closeIssuePreview();
      }
    } catch (error) {
      console.error("Failed to issue shipment invoice packing list", error);
      if (error instanceof Error && error.message.startsWith("Failed to update shipment:")) {
        setIssueError("Excelは発行できましたが、Invoice No. の保存に失敗しました");
      } else {
        setIssueError("Excelファイルの発行に失敗しました");
      }
      /* Legacy fallback kept commented out because of existing encoding noise in this file. */
      /*
      setIssueError("Excelファイルの発行に失敗しました");
      */
    } finally {
      setIssuingShipmentId(null);
    }
  };

  const handleIssueTemplateSelect = (templateType: InvoicePackingTemplate) => {
    const target = issueTarget;
    closeIssueDialog();
    if (target) {
      void openIssuePreview(target, templateType);
    }
  };

  const savingMessage = mutatingAction === "delete" ? "削除中" : "保存中";

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards cards={summaryCards} />

      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-700">出荷サマリー</div>
            <div className="text-xs text-gray-500">
              複数受注を束ねた出荷単位でインボイス・パッキングリストを発行します。
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-6">
          <div>
            <div className="text-xs text-gray-500">USD換算出荷金額</div>
            <div className="text-lg font-bold text-gray-900">{formatCurrencyValue("USD", summaryAmountUsd)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">出荷件数</div>
            <div className="text-lg font-bold text-gray-900">{formatNumberValue(rows.length)}</div>
          </div>
        </div>
      </div>

      <ToolBar
        filterDefinitions={filterDefinitions}
        filters={filters}
        onFiltersChange={setFilters}
        onCreate={openCreate}
        createLabel="新規出荷"
        rightActions={
          <Button variant="outlined" onClick={() => router.push("/sales-management")}>
            受注管理へ
          </Button>
        }
      />

      {loadError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          出荷管理の取得に失敗しました。（{loadError}）
        </div>
      ) : null}
      {optionError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          帳票発行用マスタの取得に失敗しました。（{optionError}）
        </div>
      ) : null}
      {mutateError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          操作に失敗しました。（{mutateError}）
        </div>
      ) : null}
      {issueError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{issueError}</div>
      ) : null}
      {loading ? <div className="text-sm text-gray-500">読み込み中...</div> : null}

      <ShipmentManagementTableView
        rows={filteredRows}
        salesRows={salesRows}
        onRowClick={openEdit}
        onDelete={openDelete}
        onIssue={openIssueDialog}
        issuingShipmentId={issuingShipmentId}
      />

      <ShipmentFormModal
        key={`shipment-create-${isCreateOpen ? "open" : "closed"}`}
        open={isCreateOpen}
        shipment={null}
        salesRows={salesRows}
        onClose={closeCreate}
        onSave={handleCreate}
      />
      <ShipmentFormModal
        key={`shipment-edit-${editingRow?.shipmentId ?? "none"}`}
        open={Boolean(editingRow)}
        shipment={editingRow}
        salesRows={salesRows}
        onClose={closeEdit}
        onSave={handleEdit}
        onDelete={(shipment) => {
          closeEdit();
          openDelete(shipment);
        }}
        onIssue={openIssueDialog}
        isIssuing={Boolean(editingRow && issuingShipmentId === editingRow.shipmentId)}
      />
      <ShipmentInvoiceTemplateDialog
        key={`shipment-issue-dialog-${issueDialogKey}`}
        open={isIssueDialogOpen}
        shipment={issueTarget}
        onClose={closeIssueDialog}
        onSelect={handleIssueTemplateSelect}
      />
      <InvoicePackingPreviewModal
        open={isIssuePreviewOpen}
        payload={issuePreviewPayload}
        loading={isIssuePreviewLoading}
        issuing={Boolean(issuePreviewShipment && issuingShipmentId === issuePreviewShipment.shipmentId)}
        onInvoiceNoChange={(invoiceNo) =>
          setIssuePreviewPayload((current) => (current ? { ...current, invoiceNo } : current))
        }
        onClose={closeIssuePreview}
        onIssue={handleIssuePreview}
      />
      <DeleteShipmentDialog
        open={Boolean(deletingRow)}
        shipment={deletingRow}
        onClose={closeDelete}
        onConfirm={handleDelete}
      />
      <LoadingModal open={mutating} message={savingMessage} />
    </div>
  );
}
