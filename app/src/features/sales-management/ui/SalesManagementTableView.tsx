"use client";

import { useCallback, useMemo, useState } from "react";
import { Chip, IconButton } from "@mui/material";
import { Trash2 } from "lucide-react";
import DataTable, { TableColumn } from "@/components/DataTable";
import { useLanguage } from "@/lib/i18n/language";
import {
  collectDeliveryDates,
  getPrimaryDeliveryDate,
  getSalesOrderMetrics,
} from "@/features/sales-management/salesManagementUtils";
import { salesDocumentStatusOptions, salesStatusOptions } from "@/features/sales-management/types";
import type { SalesLineItem, SalesRow } from "@/features/sales-management/types";

const amountFormatter = new Intl.NumberFormat("en-US");
const timeFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCurrencyValue = (currency: string, value: number) => {
  const normalizedCurrency = currency?.toUpperCase();
  if (!normalizedCurrency) {
    return amountFormatter.format(value);
  }
  return `${normalizedCurrency} ${amountFormatter.format(value)}`;
};

const getItemSummary = (items: SalesLineItem[]) => {
  if (!items.length) {
    return { code: "-", name: "", extraCount: 0 };
  }
  const [first, ...rest] = items;
  return { code: first.productCode, name: first.productName, extraCount: rest.length };
};

const getMaterials = (items: SalesLineItem[]) => {
  const uniqueMaterials = new Set<string>();
  items.forEach((item) => item.materials.forEach((material) => uniqueMaterials.add(material)));
  return Array.from(uniqueMaterials);
};

const getStockLabel = (items: SalesLineItem[]) => {
  if (!items.length) {
    return "-";
  }
  const values = items.map((item) => item.stockQuantity);
  const uniqueValues = new Set(values);
  if (uniqueValues.size === 1) {
    const value = values[0];
    return value === null ? "-" : amountFormatter.format(value);
  }
  return "複数";
};

const getUnitPriceLabel = (items: SalesLineItem[], currency: string) => {
  if (!items.length) {
    return "-";
  }
  const values = items.map((item) => item.unitPrice);
  const uniqueValues = new Set(values);
  if (uniqueValues.size === 1) {
    return formatCurrencyValue(currency, values[0]);
  }
  return "複数";
};

const getDeliveryDateLabel = (items: SalesLineItem[], fallbackDate: string, useVietnamese: boolean) => {
  const dates = collectDeliveryDates(items, fallbackDate);
  if (!dates.length) {
    return "-";
  }
  if (dates.length === 1) {
    return dates[0];
  }
  return `${dates[0]} ~ ${dates[dates.length - 1]} (${dates.length}${useVietnamese ? " đợt" : "日程"})`;
};

const renderStatusItems = (items: { label: string; active: boolean }[], tx: (text: string) => string) => (
  <div className="flex flex-col gap-1 text-xs text-gray-700">
    {items.map((item) => (
      <div key={item.label} className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${item.active ? "bg-green-500" : "bg-gray-300"}`} />
        <span>{tx(item.label)}</span>
      </div>
    ))}
  </div>
);

type SortKey =
  | "orderNo"
  | "orderDate"
  | "customerName"
  | "productCode"
  | "orderQuantity"
  | "shippedQuantity"
  | "remainingQuantity"
  | "orderBalance"
  | "receivableBalance"
  | "unshippedAmount"
  | "unitPrice"
  | "amount"
  | "deliveryDate";

type SalesManagementTableViewProps = {
  rows: SalesRow[];
  onRowClick?: (row: SalesRow) => void;
  onDelete?: (row: SalesRow) => void;
};

export default function SalesManagementTableView({
  rows,
  onRowClick,
  onDelete,
}: SalesManagementTableViewProps) {
  const { language, tx } = useLanguage();
  const tr = useCallback((ja: string, vi: string) => (language === "vi" ? vi : ja), [language]);
  const [sortKey, setSortKey] = useState<SortKey>("orderDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const columns = useMemo<TableColumn<SalesRow>[]>(
    () => [
      {
        key: "orderNo",
        header: "PO No.",
        sortKey: "orderNo",
        render: (row) => <span className="text-sm font-semibold text-blue-600">{row.orderNo}</span>,
      },
      {
        key: "orderDate",
        header: tr("受注日", "Ngày nhận đơn"),
        sortKey: "orderDate",
        render: (row) => <span className="text-sm">{row.orderDate}</span>,
      },
      {
        key: "customerName",
        header: tr("顧客名", "Tên khách hàng"),
        sortKey: "customerName",
        render: (row) => (
          <div className="flex flex-col text-sm">
            <span className="font-semibold">{row.customerName}</span>
            <span className="text-gray-500">{row.customerRegion}</span>
          </div>
        ),
      },
      {
        key: "product",
        header: tr("品目/品番", "Sản phẩm / Mã hàng"),
        sortKey: "productCode",
        render: (row) => {
          const summary = getItemSummary(row.items);
          return (
            <div className="flex flex-col text-sm">
              <span className="font-semibold">{summary.code}</span>
              <span className="text-gray-600">{summary.name}</span>
              {summary.extraCount ? <span className="text-xs text-gray-500">{tx(`他${summary.extraCount}件`)}</span> : null}
            </div>
          );
        },
      },
      {
        key: "materials",
        header: tr("使用材料", "Nguyên vật liệu sử dụng"),
        render: (row) => {
          const materials = getMaterials(row.items);
          const firstRow = materials.slice(0, 3);
          const secondRow = materials.slice(3, 5);
          const hasOverflow = materials.length > 5;
          return materials.length ? (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-1">
                {firstRow.map((material) => (
                  <Chip
                    key={material}
                    label={material}
                    size="small"
                    sx={{
                      backgroundColor: "#e8f1ff",
                      color: "#2563eb",
                      fontWeight: 600,
                    }}
                  />
                ))}
              </div>
              {secondRow.length ? (
                <div className="flex flex-wrap gap-1">
                  {secondRow.map((material) => (
                    <Chip
                      key={material}
                      label={material}
                      size="small"
                      sx={{
                        backgroundColor: "#e8f1ff",
                        color: "#2563eb",
                        fontWeight: 600,
                      }}
                    />
                  ))}
                  {hasOverflow ? <span className="self-center text-xs text-gray-500">...</span> : null}
                </div>
              ) : null}
            </div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          );
        },
      },
      {
        key: "stockQuantity",
        header: tr("在庫数", "Tồn kho"),
        align: "right",
        render: (row) => <span className="text-sm">{tx(getStockLabel(row.items))}</span>,
      },
      {
        key: "orderQuantity",
        header: tr("注数", "Số lượng đặt"),
        sortKey: "orderQuantity",
        align: "right",
        render: (row) => {
          const metrics = getSalesOrderMetrics(row);
          return <span className="text-sm">{amountFormatter.format(metrics.orderQuantity)}</span>;
        },
      },
      {
        key: "shippedQuantity",
        header: tr("出荷数", "Số lượng xuất"),
        sortKey: "shippedQuantity",
        align: "right",
        render: (row) => {
          const metrics = getSalesOrderMetrics(row);
          return <span className="text-sm">{amountFormatter.format(metrics.shippedQuantity)}</span>;
        },
      },
      {
        key: "remainingQuantity",
        header: tr("残注数", "Số lượng còn lại"),
        sortKey: "remainingQuantity",
        align: "right",
        render: (row) => {
          const metrics = getSalesOrderMetrics(row);
          return <span className="text-sm font-semibold">{amountFormatter.format(metrics.remainingQuantity)}</span>;
        },
      },
      {
        key: "unitPrice",
        header: tr("単価", "Đơn giá"),
        sortKey: "unitPrice",
        align: "right",
        render: (row) => <span className="text-sm font-semibold">{tx(getUnitPriceLabel(row.items, row.currency))}</span>,
      },
      {
        key: "amount",
        header: tr("金額", "Số tiền"),
        sortKey: "amount",
        align: "right",
        render: (row) => {
          const metrics = getSalesOrderMetrics(row);
          return <span className="text-sm font-semibold">{formatCurrencyValue(row.currency, metrics.amount)}</span>;
        },
      },
      {
        key: "orderBalance",
        header: tr("受注残高", "Số dư đơn hàng"),
        sortKey: "orderBalance",
        align: "right",
        render: (row) => {
          const metrics = getSalesOrderMetrics(row);
          return <span className="text-sm font-semibold">{formatCurrencyValue(row.currency, metrics.orderBalance)}</span>;
        },
      },
      {
        key: "receivableBalance",
        header: tr("売掛残高", "Công nợ phải thu"),
        sortKey: "receivableBalance",
        align: "right",
        render: (row) => {
          const metrics = getSalesOrderMetrics(row);
          return (
            <span className="text-sm font-semibold text-amber-700">
              {formatCurrencyValue(row.currency, metrics.receivableBalance)}
            </span>
          );
        },
      },
      {
        key: "unshippedAmount",
        header: tr("未出荷残高", "Số dư chưa xuất"),
        sortKey: "unshippedAmount",
        align: "right",
        render: (row) => {
          const metrics = getSalesOrderMetrics(row);
          return <span className="text-sm font-semibold">{formatCurrencyValue(row.currency, metrics.unshippedAmount)}</span>;
        },
      },
      {
        key: "requiredMaterial",
        header: tr("必要材料量", "Lượng nguyên vật liệu cần thiết"),
        align: "right",
        render: (row) => {
          const metrics = getSalesOrderMetrics(row);
          if (metrics.requiredMaterial === null) {
            return <span className="text-sm text-gray-400">-</span>;
          }
          return <span className="text-sm">{amountFormatter.format(metrics.requiredMaterial)} kg</span>;
        },
      },
      {
        key: "moldingTime",
        header: tr("成形時間", "Thời gian tạo hình"),
        align: "right",
        render: (row) => {
          const metrics = getSalesOrderMetrics(row);
          if (metrics.moldingTime === null) {
            return <span className="text-sm text-gray-400">-</span>;
          }
          return <span className="text-sm">{timeFormatter.format(metrics.moldingTime)} {tr("時間", "giờ")}</span>;
        },
      },
      {
        key: "deliveryDate",
        header: tr("出荷日", "Ngày xuất hàng"),
        sortKey: "deliveryDate",
        render: (row) => <span className="text-sm">{getDeliveryDateLabel(row.items, row.deliveryDate, language === "vi")}</span>,
      },
      {
        key: "status",
        header: tr("ステータス", "Trạng thái"),
        render: (row) =>
          renderStatusItems(
            salesStatusOptions.map((status) => ({
              label: status.label,
              active: row.status[status.key],
            })),
            tx,
          ),
      },
      {
        key: "documentStatus",
        header: tr("請求状況", "Tình trạng hóa đơn"),
        render: (row) =>
          renderStatusItems(
            salesDocumentStatusOptions.map((status) => ({
              label: status.label,
              active: row.documentStatus[status.key],
            })),
            tx,
          ),
      },
      {
        key: "delete",
        header: <span>{tr("削除", "Xóa")}</span>,
        align: "center",
        render: (row) =>
          onDelete ? (
            <IconButton
              size="small"
              aria-label={tr("削除", "Xóa")}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(row);
              }}
            >
              <Trash2 size={16} className="text-red-500" />
            </IconButton>
          ) : (
            <Trash2 size={16} className="text-red-500" />
          ),
      },
    ],
    [language, onDelete, tr, tx],
  );

  const handleSort = (key: string) => {
    const typedKey = key as SortKey;
    if (sortKey === typedKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(typedKey);
    setSortDirection("asc");
  };

  const getSortValue = (row: SalesRow, key: SortKey) => {
    switch (key) {
      case "productCode":
        return row.items[0]?.productCode ?? "";
      case "orderQuantity":
        return getSalesOrderMetrics(row).orderQuantity;
      case "shippedQuantity":
        return getSalesOrderMetrics(row).shippedQuantity;
      case "remainingQuantity":
        return getSalesOrderMetrics(row).remainingQuantity;
      case "unitPrice":
        return row.items[0]?.unitPrice ?? 0;
      case "amount":
        return getSalesOrderMetrics(row).amount;
      case "orderBalance":
        return getSalesOrderMetrics(row).orderBalance;
      case "receivableBalance":
        return getSalesOrderMetrics(row).receivableBalance;
      case "unshippedAmount":
        return getSalesOrderMetrics(row).unshippedAmount;
      case "deliveryDate":
        return getPrimaryDeliveryDate(row.items, row.deliveryDate);
      default:
        return row[key as keyof SalesRow];
    }
  };

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const aValue = getSortValue(a, sortKey);
      const bValue = getSortValue(b, sortKey);
      if (sortKey === "orderDate" || sortKey === "deliveryDate") {
        const aDate = Date.parse(String(aValue));
        const bDate = Date.parse(String(bValue));
        if (Number.isNaN(aDate) || Number.isNaN(bDate)) {
          return 0;
        }
        return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      const aText = String(aValue);
      const bText = String(bValue);
      return sortDirection === "asc" ? aText.localeCompare(bText) : bText.localeCompare(aText);
    });
    return sorted;
  }, [rows, sortDirection, sortKey]);

  return (
    <DataTable
      columns={columns}
      rows={sortedRows}
      getRowId={(row) => row.salesOrderId}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSort={handleSort}
      onRowClick={onRowClick}
      enableHorizontalScroll
    />
  );
}

