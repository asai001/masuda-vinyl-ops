export const salesStatusOptions = [
  { key: "shipped", label: "出荷済み" },
  { key: "delivered", label: "納品済み" },
  { key: "paid", label: "入金済み" },
] as const;

export type SalesStatusKey = (typeof salesStatusOptions)[number]["key"];
export type SalesStatus = Record<SalesStatusKey, boolean>;

export const salesDocumentStatusOptions = [
  { key: "orderReceived", label: "発注書受領" },
  { key: "deliverySent", label: "納品書送付" },
  { key: "invoiceSent", label: "請求書送付" },
] as const;

export type SalesDocumentStatusKey = (typeof salesDocumentStatusOptions)[number]["key"];
export type SalesDocumentStatus = Record<SalesDocumentStatusKey, boolean>;

export type SalesLineItem = {
  id: number;
  productCode: string;
  productName: string;
  materials: string[];
  stockQuantity: number | null;
  orderQuantity: number;
  shippedQuantity: number;
  unitPrice: number;
  weight: number | null;
  length: number | null;
  speed: number | null;
};

export type SalesRow = {
  id: number;
  salesOrderId: string;
  orderNo: string;
  orderDate: string;
  customerName: string;
  customerRegion: string;
  deliveryDate: string;
  currency: string;
  note: string;
  items: SalesLineItem[];
  status: SalesStatus;
  documentStatus: SalesDocumentStatus;
};

export type NewSalesOrderInput = Omit<SalesRow, "id" | "salesOrderId">;
export type UpdateSalesOrderInput = Omit<SalesRow, "id">;

export type SalesOrderItem = {
  orgId: string;
  salesOrderId: string;
  displayNo?: number;
  orderNo: string;
  orderDate: string;
  deliveryDate: string;
  customerName: string;
  customerRegion?: string;
  currency: string;
  note?: string;
  items: SalesLineItem[];
  status?: SalesStatus;
  documentStatus?: SalesDocumentStatus;
  createdAt?: string;
  updatedAt?: string;

  orderDateIndexPk?: string;
  orderDateIndexSk?: string;
  deliveryDateIndexPk?: string;
  deliveryDateIndexSk?: string;
  customerIndexPk?: string;
  customerIndexSk?: string;
  orderNoIndexPk?: string;
  orderNoIndexSk?: string;
  shippedStatusIndexPk?: string;
  shippedStatusIndexSk?: string;
  deliveredStatusIndexPk?: string;
  deliveredStatusIndexSk?: string;
  paidStatusIndexPk?: string;
  paidStatusIndexSk?: string;
};
