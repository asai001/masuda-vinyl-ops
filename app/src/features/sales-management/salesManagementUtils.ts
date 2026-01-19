import type { SalesLineItem } from "@/features/sales-management/types";

export type SalesMetrics = {
  orderQuantity: number;
  shippedQuantity: number;
  remainingQuantity: number;
  amount: number;
  requiredMaterial: number | null;
  moldingTime: number | null;
};

export const calculateSalesMetrics = (items: SalesLineItem[]): SalesMetrics => {
  let orderQuantity = 0;
  let shippedQuantity = 0;
  let amount = 0;
  let requiredMaterial = 0;
  let moldingTime = 0;
  let hasMaterial = false;
  let hasTime = false;

  items.forEach((item) => {
    orderQuantity += item.orderQuantity;
    shippedQuantity += item.shippedQuantity;
    amount += item.orderQuantity * item.unitPrice;

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
    remainingQuantity: orderQuantity - shippedQuantity,
    amount,
    requiredMaterial: hasMaterial ? requiredMaterial : null,
    moldingTime: hasTime ? moldingTime : null,
  };
};
