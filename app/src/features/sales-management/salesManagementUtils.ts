import type { SalesLineItem, SalesOrderShipment, SalesRow, SalesShipment } from "@/features/sales-management/types";

export type SalesMetrics = {
  orderQuantity: number;
  shippedQuantity: number;
  remainingQuantity: number;
  amount: number;
  shippedAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  receivableBalance: number;
  orderBalance: number;
  unshippedAmount: number;
  requiredMaterial: number | null;
  moldingTime: number | null;
};

export type SalesShippedAmountEntry = {
  date: string;
  amount: number;
};

export type SalesPaidAmountEntry = {
  date: string;
  amount: number;
};

export type SalesSnapshot = {
  amount: number;
  shippedAmount: number;
  paidAmount: number;
  orderBalance: number;
  receivableBalance: number;
  unshippedAmount: number;
};

const normalizeDate = (value: string | undefined): string => (typeof value === "string" ? value.trim() : "");

const compareDateText = (left: string, right: string) => left.localeCompare(right);

export const collectItemShipments = (item: SalesLineItem, fallbackDate = ""): SalesShipment[] => {
  if (Array.isArray(item.shipments) && item.shipments.length > 0) {
    return item.shipments;
  }

  const legacyDate = normalizeDate(item.deliveryDate) || normalizeDate(fallbackDate);
  const legacyQuantity = typeof item.shippedQuantity === "number" && Number.isFinite(item.shippedQuantity) ? item.shippedQuantity : 0;
  if (!legacyDate && legacyQuantity <= 0) {
    return [];
  }

  return [
    {
      id: 1,
      deliveryDate: legacyDate,
      shippedQuantity: legacyQuantity,
    },
  ];
};

export const buildOrderShipmentsFromLineItems = (
  items: SalesLineItem[],
  fallbackDeliveryDate = "",
  legacyPaidAmount = 0,
  legacyPaidDate = "",
): SalesOrderShipment[] => {
  const grouped = new Map<
    string,
    {
      id: number;
      deliveryDate: string;
      items: Map<number, { id: number; lineItemId: number; shippedQuantity: number }>;
    }
  >();

  items.forEach((item) => {
    collectItemShipments(item, fallbackDeliveryDate).forEach((shipment) => {
      const deliveryDate = normalizeDate(shipment.deliveryDate);
      if (!deliveryDate || shipment.shippedQuantity <= 0) {
        return;
      }

      const entry =
        grouped.get(deliveryDate) ??
        {
          id: grouped.size + 1,
          deliveryDate,
          items: new Map<number, { id: number; lineItemId: number; shippedQuantity: number }>(),
        };
      const existing = entry.items.get(item.id);
      if (existing) {
        existing.shippedQuantity += shipment.shippedQuantity;
      } else {
        entry.items.set(item.id, {
          id: entry.items.size + 1,
          lineItemId: item.id,
          shippedQuantity: shipment.shippedQuantity,
        });
      }
      grouped.set(deliveryDate, entry);
    });
  });

  const shipments = Array.from(grouped.values())
    .sort((a, b) => compareDateText(a.deliveryDate, b.deliveryDate))
    .map((shipment, index) => ({
      id: index + 1,
      deliveryDate: shipment.deliveryDate,
      paidDate: "",
      paidAmount: 0,
      items: Array.from(shipment.items.values()).sort((a, b) => a.lineItemId - b.lineItemId),
    }));

  const normalizedLegacyPaidAmount = Number.isFinite(legacyPaidAmount) ? legacyPaidAmount : 0;
  const normalizedLegacyPaidDate = normalizeDate(legacyPaidDate);

  if (shipments.length > 0 && (normalizedLegacyPaidAmount > 0 || normalizedLegacyPaidDate)) {
    shipments[0] = {
      ...shipments[0],
      paidDate: normalizedLegacyPaidDate,
      paidAmount: normalizedLegacyPaidAmount,
    };
  } else if (shipments.length === 0 && (normalizedLegacyPaidAmount > 0 || normalizedLegacyPaidDate)) {
    shipments.push({
      id: 1,
      deliveryDate: normalizeDate(fallbackDeliveryDate) || normalizedLegacyPaidDate,
      paidDate: normalizedLegacyPaidDate,
      paidAmount: normalizedLegacyPaidAmount,
      items: [],
    });
  }

  return shipments;
};

export const applyOrderShipmentsToLineItems = (
  items: SalesLineItem[],
  shipments: SalesOrderShipment[],
): SalesLineItem[] =>
  items.map((item) => {
    const itemShipments = shipments
      .flatMap((shipment) => {
        const allocation = shipment.items.find((entry) => entry.lineItemId === item.id && entry.shippedQuantity > 0);
        if (!allocation) {
          return [];
        }
        return [
          {
            id: shipment.id,
            deliveryDate: shipment.deliveryDate,
            shippedQuantity: allocation.shippedQuantity,
          },
        ];
      })
      .sort((a, b) => compareDateText(a.deliveryDate, b.deliveryDate));

    return {
      ...item,
      shipments: itemShipments,
    };
  });

export const getItemShippedQuantity = (item: SalesLineItem, fallbackDate = ""): number =>
  collectItemShipments(item, fallbackDate).reduce((sum, shipment) => sum + shipment.shippedQuantity, 0);

export const resolveLineDeliveryDate = (item: SalesLineItem, fallbackDate = ""): string => {
  const dates = collectItemShipments(item, fallbackDate)
    .map((shipment) => normalizeDate(shipment.deliveryDate))
    .filter(Boolean)
    .sort(compareDateText);

  return dates[0] ?? normalizeDate(fallbackDate);
};

export const collectDeliveryDates = (items: SalesLineItem[], fallbackDate = ""): string[] => {
  const uniqueDates = new Set<string>();
  items.forEach((item) => {
    collectItemShipments(item, fallbackDate).forEach((shipment) => {
      const date = normalizeDate(shipment.deliveryDate);
      if (date) {
        uniqueDates.add(date);
      }
    });
  });
  return Array.from(uniqueDates).sort(compareDateText);
};

export const getPrimaryDeliveryDate = (items: SalesLineItem[], fallbackDate = ""): string => {
  const dates = collectDeliveryDates(items, fallbackDate);
  return dates[0] ?? normalizeDate(fallbackDate);
};

export const buildShippedAmountEntries = (items: SalesLineItem[], fallbackDate = ""): SalesShippedAmountEntry[] =>
  items.flatMap((item) => {
    return collectItemShipments(item, fallbackDate).flatMap((shipment) => {
      if (shipment.shippedQuantity <= 0) {
        return [];
      }

      const shipDate = normalizeDate(shipment.deliveryDate);
      if (!shipDate) {
        return [];
      }

      return [
        {
          date: shipDate,
          amount: shipment.shippedQuantity * item.unitPrice,
        },
      ];
    });
  });

export const buildPaidAmountEntries = (
  shipments: SalesOrderShipment[] | undefined,
  legacyPaidAmount = 0,
  legacyPaidDate = "",
): SalesPaidAmountEntry[] => {
  const normalizedShipments = shipments ?? [];
  const paidEntries = normalizedShipments
    .filter((shipment) => normalizeDate(shipment.paidDate) && shipment.paidAmount > 0)
    .map((shipment) => ({
      date: normalizeDate(shipment.paidDate),
      amount: shipment.paidAmount,
    }));

  if (paidEntries.length > 0) {
    return paidEntries;
  }

  const fallbackDate = normalizeDate(legacyPaidDate);
  const fallbackAmount = Number.isFinite(legacyPaidAmount) ? legacyPaidAmount : 0;
  if (!fallbackDate || fallbackAmount <= 0) {
    return [];
  }

  return [{ date: fallbackDate, amount: fallbackAmount }];
};

export const getSalesOrderPaidAmount = (
  shipments: SalesOrderShipment[] | undefined,
  legacyPaidAmount = 0,
): number => {
  const shipmentPaidAmount = (shipments ?? []).reduce((sum, shipment) => sum + (Number.isFinite(shipment.paidAmount) ? shipment.paidAmount : 0), 0);
  if (shipmentPaidAmount > 0) {
    return shipmentPaidAmount;
  }
  return Number.isFinite(legacyPaidAmount) ? legacyPaidAmount : 0;
};

export const getSalesOrderPaidDate = (
  shipments: SalesOrderShipment[] | undefined,
  legacyPaidDate = "",
): string => {
  const shipmentPaidDates = (shipments ?? [])
    .map((shipment) => normalizeDate(shipment.paidDate))
    .filter(Boolean)
    .sort(compareDateText);
  if (shipmentPaidDates.length) {
    return shipmentPaidDates[shipmentPaidDates.length - 1] ?? "";
  }
  return normalizeDate(legacyPaidDate);
};

export const getShipmentAmount = (shipment: SalesOrderShipment, items: SalesLineItem[]): number => {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  return shipment.items.reduce((sum, entry) => {
    if (entry.shippedQuantity <= 0) {
      return sum;
    }
    const item = itemMap.get(entry.lineItemId);
    if (!item) {
      return sum;
    }
    return sum + entry.shippedQuantity * item.unitPrice;
  }, 0);
};

export const calculateShipmentReceivableBalance = (shipment: SalesOrderShipment, items: SalesLineItem[]): number =>
  Math.max(getShipmentAmount(shipment, items) - (Number.isFinite(shipment.paidAmount) ? shipment.paidAmount : 0), 0);

export const calculateSalesMetrics = (items: SalesLineItem[], paidAmount = 0): SalesMetrics => {
  let orderQuantity = 0;
  let shippedQuantity = 0;
  let amount = 0;
  let shippedAmount = 0;
  let requiredMaterial = 0;
  let moldingTime = 0;
  let hasMaterial = false;
  let hasTime = false;

  items.forEach((item) => {
    orderQuantity += item.orderQuantity;
    shippedQuantity += getItemShippedQuantity(item);
    amount += item.orderQuantity * item.unitPrice;
    shippedAmount += buildShippedAmountEntries([item]).reduce((sum, entry) => sum + entry.amount, 0);

    if (item.weight !== null) {
      requiredMaterial += (item.orderQuantity * item.weight) / 1000;
      hasMaterial = true;
    }

    if (item.length !== null && item.speed !== null && item.speed > 0) {
      const totalMeters = (item.orderQuantity * item.length) / 1000;
      moldingTime += totalMeters / item.speed / 60;
      hasTime = true;
    }
  });

  const normalizedPaidAmount = Number.isFinite(paidAmount) ? paidAmount : 0;
  const receivableBalance = Math.max(shippedAmount - normalizedPaidAmount, 0);
  const orderBalance = Math.max(amount - normalizedPaidAmount, 0);
  const unshippedAmount = Math.max(amount - shippedAmount, 0);

  return {
    orderQuantity,
    shippedQuantity,
    remainingQuantity: Math.max(orderQuantity - shippedQuantity, 0),
    amount,
    shippedAmount,
    paidAmount: normalizedPaidAmount,
    unpaidAmount: receivableBalance,
    receivableBalance,
    orderBalance,
    unshippedAmount,
    requiredMaterial: hasMaterial ? requiredMaterial : null,
    moldingTime: hasTime ? moldingTime : null,
  };
};

export const calculateSalesSnapshot = (
  row: Pick<SalesRow, "orderDate" | "items" | "shipments" | "paidAmount" | "paidDate">,
  asOfDate: string,
): SalesSnapshot => {
  const normalizedAsOfDate = normalizeDate(asOfDate);
  const orderDate = normalizeDate(row.orderDate);
  if (orderDate && normalizedAsOfDate && compareDateText(orderDate, normalizedAsOfDate) > 0) {
    return {
      amount: 0,
      shippedAmount: 0,
      paidAmount: 0,
      orderBalance: 0,
      receivableBalance: 0,
      unshippedAmount: 0,
    };
  }
  const orderAmount = row.items.reduce((sum, item) => sum + item.orderQuantity * item.unitPrice, 0);
  const shipments = row.shipments ?? [];

  const shippedAmount = shipments.reduce((sum, shipment) => {
    if (!shipment.deliveryDate || compareDateText(shipment.deliveryDate, normalizedAsOfDate) > 0) {
      return sum;
    }
    return sum + getShipmentAmount(shipment, row.items);
  }, 0);

  const shipmentPaidAmount = shipments.reduce((sum, shipment) => {
    const paidDate = normalizeDate(shipment.paidDate);
    if (!paidDate || compareDateText(paidDate, normalizedAsOfDate) > 0) {
      return sum;
    }
    return sum + (Number.isFinite(shipment.paidAmount) ? shipment.paidAmount : 0);
  }, 0);

  const paidAmount =
    shipmentPaidAmount > 0
      ? shipmentPaidAmount
      : normalizeDate(row.paidDate) && compareDateText(normalizeDate(row.paidDate), normalizedAsOfDate) <= 0
        ? row.paidAmount
        : 0;

  return {
    amount: orderAmount,
    shippedAmount,
    paidAmount,
    orderBalance: Math.max(orderAmount - paidAmount, 0),
    receivableBalance: Math.max(shippedAmount - paidAmount, 0),
    unshippedAmount: Math.max(orderAmount - shippedAmount, 0),
  };
};

export const getSalesOrderMetrics = (row: Pick<SalesRow, "items" | "shipments" | "paidAmount">): SalesMetrics =>
  calculateSalesMetrics(row.items, getSalesOrderPaidAmount(row.shipments, row.paidAmount));
