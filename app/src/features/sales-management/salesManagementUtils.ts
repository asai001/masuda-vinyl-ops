import type { SalesLineItem, SalesShipment } from "@/features/sales-management/types";

export type SalesMetrics = {
  orderQuantity: number;
  shippedQuantity: number;
  remainingQuantity: number;
  amount: number;
  shippedAmount: number;
  unpaidAmount: number;
  requiredMaterial: number | null;
  moldingTime: number | null;
};

const normalizeDate = (value: string | undefined): string => (typeof value === "string" ? value.trim() : "");

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

export const getItemShippedQuantity = (item: SalesLineItem, fallbackDate = ""): number =>
  collectItemShipments(item, fallbackDate).reduce((sum, shipment) => sum + shipment.shippedQuantity, 0);

export const resolveLineDeliveryDate = (item: SalesLineItem, fallbackDate = ""): string => {
  const dates = collectItemShipments(item, fallbackDate)
    .map((shipment) => normalizeDate(shipment.deliveryDate))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

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
  return Array.from(uniqueDates).sort((a, b) => a.localeCompare(b));
};

export const getPrimaryDeliveryDate = (items: SalesLineItem[], fallbackDate = ""): string => {
  const dates = collectDeliveryDates(items, fallbackDate);
  return dates[0] ?? normalizeDate(fallbackDate);
};

export type SalesShippedAmountEntry = {
  date: string;
  amount: number;
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

  return {
    orderQuantity,
    shippedQuantity,
    remainingQuantity: Math.max(orderQuantity - shippedQuantity, 0),
    amount,
    shippedAmount,
    unpaidAmount: Math.max(shippedAmount - paidAmount, 0),
    requiredMaterial: hasMaterial ? requiredMaterial : null,
    moldingTime: hasTime ? moldingTime : null,
  };
};
