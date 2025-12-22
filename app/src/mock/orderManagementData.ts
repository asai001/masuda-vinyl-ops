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

export type OrderRow = {
  id: number;
  orderDate: string;
  supplier: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  amount: number;
  deliveryDate: string;
  note: string;
  status: Record<OrderStatusKey, boolean>;
  documentStatus: Record<DocumentStatusKey, boolean>;
};

export const orderRows: OrderRow[] = [
  {
    id: 1,
    orderDate: "2025-11-15",
    supplier: "Nguyen Trading Co., Ltd.",
    itemCode: "PI-001",
    itemName: "鋼材A",
    quantity: 1000,
    unitPrice: 3.5,
    currency: "USD",
    amount: 3500,
    deliveryDate: "2025-11-25",
    note: "",
    status: { ordered: true, delivered: false, paid: false },
    documentStatus: { orderSent: true, deliveryReceived: false, invoiceReceived: false },
  },
  {
    id: 2,
    orderDate: "2025-11-18",
    supplier: "Vietnam Plastics Ltd.",
    itemCode: "PI-002",
    itemName: "アルミ材",
    quantity: 500,
    unitPrice: 4.2,
    currency: "USD",
    amount: 2100,
    deliveryDate: "2025-11-28",
    note: "",
    status: { ordered: true, delivered: false, paid: false },
    documentStatus: { orderSent: true, deliveryReceived: true, invoiceReceived: false },
  },
  {
    id: 3,
    orderDate: "2025-11-10",
    supplier: "Saigon Processing Co.",
    itemCode: "PI-003",
    itemName: "ボルトM8",
    quantity: 200,
    unitPrice: 0.5,
    currency: "USD",
    amount: 100,
    deliveryDate: "2025-11-20",
    note: "",
    status: { ordered: true, delivered: true, paid: true },
    documentStatus: { orderSent: true, deliveryReceived: true, invoiceReceived: true },
  },
];
