import {
  applyOrderShipmentsToLineItems,
  getItemShippedQuantity,
  getPrimaryDeliveryDate,
  getSalesOrderPaidAmount,
  getSalesOrderPaidDate,
} from "@/features/sales-management/salesManagementUtils";
import type { SalesOrderShipment, SalesRow } from "@/features/sales-management/types";
import type {
  ShipmentAllocation,
  ShipmentCandidateLine,
  ShipmentItem,
  ShipmentResolvedAllocation,
  ShipmentRow,
} from "@/features/shipment-management/types";

const normalizeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const normalizeAllocations = (value: unknown): ShipmentAllocation[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const salesOrderId = normalizeString(record.salesOrderId);
      const lineItemId = normalizeNumber(record.lineItemId);
      if (!salesOrderId || lineItemId <= 0) {
        return null;
      }
      return {
        id: normalizeNumber(record.id, index + 1),
        salesOrderId,
        lineItemId,
        shippedQuantity: normalizeNumber(record.shippedQuantity),
      };
    })
    .filter((entry): entry is ShipmentAllocation => entry !== null);
};

export const buildShipmentNo = (displayNo: number) => `SH-${String(displayNo).padStart(4, "0")}`;

export const toShipmentRow = (item: ShipmentItem): ShipmentRow => {
  const id = normalizeNumber(item.displayNo);
  const shipmentNo = normalizeString(item.shipmentNo) || buildShipmentNo(id || 1);
  return {
    id,
    shipmentId: normalizeString(item.shipmentId),
    shipmentNo,
    invoiceNo: normalizeString(item.invoiceNo),
    deliveryDate: normalizeString(item.deliveryDate),
    paidDate: normalizeString(item.paidDate),
    paidAmount: normalizeNumber(item.paidAmount),
    note: normalizeString(item.note),
    customerName: normalizeString(item.customerName),
    customerRegion: normalizeString(item.customerRegion),
    currency: normalizeString(item.currency),
    allocations: normalizeAllocations(item.allocations),
  };
};

const compareShipmentRows = (left: Pick<ShipmentRow, "deliveryDate" | "id">, right: Pick<ShipmentRow, "deliveryDate" | "id">) =>
  left.deliveryDate.localeCompare(right.deliveryDate) || left.id - right.id;

const roundCurrencyLike = (value: number) => Math.round(value * 100) / 100;

export const resolveShipmentAllocations = (
  shipment: ShipmentRow,
  salesRows: SalesRow[],
): ShipmentResolvedAllocation[] => {
  const rowMap = new Map(salesRows.map((row) => [row.salesOrderId, row]));

  return shipment.allocations.flatMap((allocation) => {
    const row = rowMap.get(allocation.salesOrderId);
    if (!row) {
      return [];
    }

    const item = row.items.find((lineItem) => lineItem.id === allocation.lineItemId);
    if (!item) {
      return [];
    }

    return [
      {
        shipmentAllocationId: allocation.id,
        salesOrderId: allocation.salesOrderId,
        orderNo: row.orderNo,
        customerName: row.customerName,
        customerRegion: row.customerRegion,
        currency: row.currency,
        lineItemId: allocation.lineItemId,
        productCode: item.productCode,
        productName: item.productName,
        orderQuantity: item.orderQuantity,
        shippedQuantity: allocation.shippedQuantity,
        unitPrice: item.unitPrice,
        palletCount: item.palletCount,
        totalWeight: item.totalWeight,
        weight: item.weight,
      },
    ];
  });
};

export const getShipmentTotalQuantity = (shipment: ShipmentRow) =>
  shipment.allocations.reduce((sum, allocation) => sum + allocation.shippedQuantity, 0);

export const getShipmentTotalAmount = (shipment: ShipmentRow, salesRows: SalesRow[]) =>
  resolveShipmentAllocations(shipment, salesRows).reduce(
    (sum, allocation) => sum + allocation.shippedQuantity * allocation.unitPrice,
    0,
  );

export const getShipmentOrderNos = (shipment: ShipmentRow, salesRows: SalesRow[]) =>
  Array.from(new Set(resolveShipmentAllocations(shipment, salesRows).map((allocation) => allocation.orderNo)));

export const buildShipmentCandidateLines = (
  salesRows: SalesRow[],
  editingShipment?: ShipmentRow | null,
): ShipmentCandidateLine[] => {
  const currentAllocationMap = new Map(
    (editingShipment?.allocations ?? []).map((allocation) => [
      `${allocation.salesOrderId}:${allocation.lineItemId}`,
      allocation.shippedQuantity,
    ]),
  );
  const currentAllocationKeys = new Set((editingShipment?.allocations ?? []).map((allocation) => `${allocation.salesOrderId}:${allocation.lineItemId}`));

  return salesRows.flatMap((row) =>
    row.items.flatMap((item) => {
      const allocationKey = `${row.salesOrderId}:${item.id}`;
      const currentQuantity = currentAllocationMap.get(allocationKey) ?? 0;
      const shippedQuantity = Math.max(getItemShippedQuantity(item) - currentQuantity, 0);
      const remainingQuantity = Math.max(item.orderQuantity - shippedQuantity, 0);
      if (remainingQuantity <= 0 && !currentAllocationKeys.has(allocationKey)) {
        return [];
      }

      return [
        {
          key: allocationKey,
          salesOrderId: row.salesOrderId,
          orderNo: row.orderNo,
          customerName: row.customerName,
          customerRegion: row.customerRegion,
          currency: row.currency,
          lineItemId: item.id,
          productCode: item.productCode,
          productName: item.productName,
          orderQuantity: item.orderQuantity,
          shippedQuantity,
          remainingQuantity,
          unitPrice: item.unitPrice,
          palletCount: item.palletCount,
          totalWeight: item.totalWeight,
          weight: item.weight,
        },
      ];
    }),
  );
};

export const mergeShipmentRowsIntoSalesRows = (salesRows: SalesRow[], shipmentRows: ShipmentRow[]): SalesRow[] => {
  const projectedShipmentsByOrder = new Map<string, SalesOrderShipment[]>();
  const rowMap = new Map(salesRows.map((row) => [row.salesOrderId, row]));

  [...shipmentRows]
    .sort(compareShipmentRows)
    .forEach((shipment) => {
      const grouped = new Map<string, ShipmentAllocation[]>();
      shipment.allocations.forEach((allocation) => {
        if (allocation.shippedQuantity <= 0) {
          return;
        }
        const entries = grouped.get(allocation.salesOrderId) ?? [];
        entries.push(allocation);
        grouped.set(allocation.salesOrderId, entries);
      });

      const orderIds = Array.from(grouped.keys());
      const orderAmounts = new Map<string, number>();
      let totalAmount = 0;

      orderIds.forEach((salesOrderId) => {
        const row = rowMap.get(salesOrderId);
        if (!row) {
          return;
        }
        const itemMap = new Map(row.items.map((item) => [item.id, item]));
        const amount = (grouped.get(salesOrderId) ?? []).reduce((sum, allocation) => {
          const item = itemMap.get(allocation.lineItemId);
          return sum + (item ? allocation.shippedQuantity * item.unitPrice : 0);
        }, 0);
        orderAmounts.set(salesOrderId, amount);
        totalAmount += amount;
      });

      let remainingPaidAmount = shipment.paidAmount;
      orderIds.forEach((salesOrderId, index) => {
        const allocations = grouped.get(salesOrderId);
        if (!allocations?.length) {
          return;
        }

        const row = rowMap.get(salesOrderId);
        if (!row) {
          return;
        }

        const orderAmount = orderAmounts.get(salesOrderId) ?? 0;
        const paidAmount =
          shipment.paidAmount > 0 && totalAmount > 0
            ? index === orderIds.length - 1
              ? roundCurrencyLike(remainingPaidAmount)
              : roundCurrencyLike((shipment.paidAmount * orderAmount) / totalAmount)
            : 0;
        remainingPaidAmount = roundCurrencyLike(remainingPaidAmount - paidAmount);

        const projectedShipment: SalesOrderShipment = {
          id: 0,
          deliveryDate: shipment.deliveryDate,
          paidDate: paidAmount > 0 ? shipment.paidDate : "",
          paidAmount,
          items: allocations.map((allocation, allocationIndex) => ({
            id: allocationIndex + 1,
            lineItemId: allocation.lineItemId,
            shippedQuantity: allocation.shippedQuantity,
          })),
        };

        const shipments = projectedShipmentsByOrder.get(salesOrderId) ?? [];
        shipments.push(projectedShipment);
        projectedShipmentsByOrder.set(salesOrderId, shipments);
      });
    });

  return salesRows.map((row) => {
    const combinedShipments = [...(row.shipments ?? []), ...(projectedShipmentsByOrder.get(row.salesOrderId) ?? [])]
      .sort((left, right) => left.deliveryDate.localeCompare(right.deliveryDate) || left.id - right.id)
      .map((shipment, shipmentIndex) => ({
        ...shipment,
        id: shipmentIndex + 1,
        items: shipment.items.map((item, itemIndex) => ({
          ...item,
          id: itemIndex + 1,
        })),
      }));

    const items = applyOrderShipmentsToLineItems(row.items, combinedShipments);
    return {
      ...row,
      items,
      shipments: combinedShipments,
      deliveryDate: getPrimaryDeliveryDate(items, row.deliveryDate),
      paidAmount: getSalesOrderPaidAmount(combinedShipments, row.paidAmount),
      paidDate: getSalesOrderPaidDate(combinedShipments, row.paidDate),
    };
  });
};
