export const salesStatusOptions = [
  { key: "shipped", label: "出荷済み" },
  { key: "delivered", label: "納品済み" },
  { key: "paid", label: "入金済み" },
] as const;

export type SalesStatusKey = (typeof salesStatusOptions)[number]["key"];

export const salesDocumentStatusOptions = [
  { key: "orderReceived", label: "発注書受領" },
  { key: "deliverySent", label: "納品書送付" },
  { key: "invoiceSent", label: "請求書送付" },
] as const;

export type SalesDocumentStatusKey = (typeof salesDocumentStatusOptions)[number]["key"];

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
  orderNo: string;
  orderDate: string;
  customerName: string;
  customerRegion: string;
  deliveryDate: string;
  currency: "JPY" | "USD" | "VND";
  note: string;
  items: SalesLineItem[];
  status: Record<SalesStatusKey, boolean>;
  documentStatus: Record<SalesDocumentStatusKey, boolean>;
};

export const salesRows: SalesRow[] = [
  {
    id: 1,
    orderNo: "PO-2025-001",
    orderDate: "2025-11-15",
    customerName: "パナソニック株式会社",
    customerRegion: "日本",
    deliveryDate: "2025-11-25",
    currency: "JPY",
    note: "",
    items: [
      {
        id: 1,
        productCode: "P-004",
        productName: "成形品A",
        materials: ["ボルトM8"],
        stockQuantity: null,
        orderQuantity: 2000,
        shippedQuantity: 1500,
        unitPrice: 25,
        weight: 80,
        length: 150,
        speed: 0.6,
      },
    ],
    status: { shipped: true, delivered: false, paid: false },
    documentStatus: { orderReceived: true, deliverySent: false, invoiceSent: false },
  },
  {
    id: 2,
    orderNo: "PO-2025-002",
    orderDate: "2025-11-18",
    customerName: "株式会社リケン",
    customerRegion: "日本",
    deliveryDate: "2025-11-28",
    currency: "USD",
    note: "",
    items: [
      {
        id: 1,
        productCode: "P-005",
        productName: "半製品B",
        materials: ["鋼材A"],
        stockQuantity: null,
        orderQuantity: 1500,
        shippedQuantity: 0,
        unitPrice: 15,
        weight: 60,
        length: 120,
        speed: 0.6,
      },
    ],
    status: { shipped: false, delivered: false, paid: false },
    documentStatus: { orderReceived: true, deliverySent: false, invoiceSent: false },
  },
  {
    id: 3,
    orderNo: "PO-2025-003",
    orderDate: "2025-11-10",
    customerName: "日本電産株式会社",
    customerRegion: "日本",
    deliveryDate: "2025-11-20",
    currency: "JPY",
    note: "",
    items: [
      {
        id: 1,
        productCode: "P-004",
        productName: "成形品A",
        materials: ["ボルトM8"],
        stockQuantity: null,
        orderQuantity: 800,
        shippedQuantity: 800,
        unitPrice: 25,
        weight: 80,
        length: 150,
        speed: 0.6,
      },
    ],
    status: { shipped: true, delivered: true, paid: true },
    documentStatus: { orderReceived: true, deliverySent: true, invoiceSent: true },
  },
];
