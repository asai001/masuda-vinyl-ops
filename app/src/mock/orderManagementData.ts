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
  orderDate: string;
  supplier: string;
  items: OrderLineItem[];
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
    items: [
      {
        id: 1,
        itemCode: "PI-001",
        itemName: "鋼材A",
        unit: "kg",
        quantity: 1000,
        unitPrice: 3.5,
      },
      {
        id: 2,
        itemCode: "PI-003",
        itemName: "ボルトM8",
        unit: "個",
        quantity: 200,
        unitPrice: 0.5,
      },
    ],
    currency: "USD",
    amount: 3600,
    deliveryDate: "2025-11-25",
    note: "",
    status: { ordered: true, delivered: false, paid: false },
    documentStatus: { orderSent: true, deliveryReceived: false, invoiceReceived: false },
  },
  {
    id: 2,
    orderDate: "2025-11-18",
    supplier: "Vietnam Plastics Ltd.",
    items: [
      {
        id: 1,
        itemCode: "PI-002",
        itemName: "アルミ材",
        unit: "kg",
        quantity: 500,
        unitPrice: 4.2,
      },
    ],
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
    items: [
      {
        id: 1,
        itemCode: "PI-004",
        itemName: "包装材料",
        unit: "箱",
        quantity: 50,
        unitPrice: 12,
      },
    ],
    currency: "VND",
    amount: 600,
    deliveryDate: "2025-11-20",
    note: "",
    status: { ordered: true, delivered: true, paid: true },
    documentStatus: { orderSent: true, deliveryReceived: true, invoiceReceived: true },
  },
];
