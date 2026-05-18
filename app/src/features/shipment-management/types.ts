export type ShipmentAllocation = {
  id: number;
  salesOrderId: string;
  lineItemId: number;
  shippedQuantity: number;
};

export type ShipmentItem = {
  orgId: string;
  shipmentId: string;
  displayNo?: number;
  shipmentNo?: string;
  invoiceNo?: string;
  deliveryDate: string;
  paidDate?: string;
  paidAmount?: number;
  note?: string;
  customerName?: string;
  customerRegion?: string;
  currency?: string;
  allocations?: ShipmentAllocation[];
  createdAt?: string;
  updatedAt?: string;

  deliveryDateIndexPk?: string;
  deliveryDateIndexSk?: string;
  customerIndexPk?: string;
  customerIndexSk?: string;
};

export type ShipmentRow = {
  id: number;
  shipmentId: string;
  shipmentNo: string;
  invoiceNo: string;
  deliveryDate: string;
  paidDate: string;
  paidAmount: number;
  note: string;
  customerName: string;
  customerRegion: string;
  currency: string;
  allocations: ShipmentAllocation[];
};

export type NewShipmentInput = {
  deliveryDate: string;
  invoiceNo?: string;
  paidDate?: string;
  paidAmount?: number;
  note?: string;
  allocations: ShipmentAllocation[];
};

export type UpdateShipmentInput = NewShipmentInput & {
  shipmentId: string;
};

export type ShipmentResolvedAllocation = {
  shipmentAllocationId: number;
  salesOrderId: string;
  orderNo: string;
  customerName: string;
  customerRegion: string;
  currency: string;
  lineItemId: number;
  productCode: string;
  productName: string;
  orderQuantity: number;
  shippedQuantity: number;
  unitPrice: number;
  palletCount: number;
  totalWeight: number;
  weight: number | null;
};

export type ShipmentCandidateLine = {
  key: string;
  salesOrderId: string;
  orderNo: string;
  customerName: string;
  customerRegion: string;
  currency: string;
  lineItemId: number;
  productCode: string;
  productName: string;
  orderQuantity: number;
  shippedQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  palletCount: number;
  totalWeight: number;
  weight: number | null;
};
