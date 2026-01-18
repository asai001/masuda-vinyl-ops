export const orderStatusOptions = [
  { key: "ordered", label: "発注済み" },
  { key: "delivered", label: "納品済み" },
  { key: "paid", label: "支払い済み" },
] as const;

export type OrderStatusKey = (typeof orderStatusOptions)[number]["key"];

export const documentStatusOptions = [
  { key: "orderSent", label: "発注書送付" },
  { key: "deliveryReceived", label: "納品書受領" },
  { key: "invoiceReceived", label: "請求書受領" },
] as const;

export type DocumentStatusKey = (typeof documentStatusOptions)[number]["key"];

export type OrderStatus = Record<OrderStatusKey, boolean>;
export type DocumentStatus = Record<DocumentStatusKey, boolean>;

export type OrderLineItem = {
  id: number;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export type OrderRow = {
  id: number;
  purchaseOrderId: string;
  orderDate: string;
  supplier: string;
  items: OrderLineItem[];
  currency: string;
  amount: number;
  deliveryDate: string;
  note: string;
  status: OrderStatus;
  documentStatus: DocumentStatus;
};

export type NewPurchaseOrderInput = Omit<OrderRow, "id" | "purchaseOrderId">;
export type UpdatePurchaseOrderInput = Omit<OrderRow, "id">;

export type PurchaseOrderItem = {
  orgId: string;
  purchaseOrderId: string;
  displayNo?: number;
  orderDate: string;
  deliveryDate: string;
  supplier: string;
  items: OrderLineItem[];
  currency: string;
  amount: number;
  note?: string;
  status?: OrderStatus;
  documentStatus?: DocumentStatus;
  createdAt?: string;
  updatedAt?: string;

  orderDateIndexPk?: string;
  orderDateIndexSk?: string;
  deliveryDateIndexPk?: string;
  deliveryDateIndexSk?: string;
  supplierIndexPk?: string;
  supplierIndexSk?: string;
  orderedStatusIndexPk?: string;
  orderedStatusIndexSk?: string;
  deliveredStatusIndexPk?: string;
  deliveredStatusIndexSk?: string;
  paidStatusIndexPk?: string;
  paidStatusIndexSk?: string;
  orderSentIndexPk?: string;
  orderSentIndexSk?: string;
  deliveryReceivedIndexPk?: string;
  deliveryReceivedIndexSk?: string;
  invoiceReceivedIndexPk?: string;
  invoiceReceivedIndexSk?: string;
};
