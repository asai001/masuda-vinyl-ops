export const paymentStatusOptions = [
  { key: "paid", label: "支払済み" },
  { key: "unpaid", label: "未払い" },
] as const;

export type PaymentStatusKey = (typeof paymentStatusOptions)[number]["key"];

export type PaymentManagementRow = {
  id: number;
  category: string;
  content: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  status: PaymentStatusKey;
  note: string;
  isFixedCost: boolean;
};

export const paymentManagementRows: PaymentManagementRow[] = [
  {
    id: 4,
    category: "家賃",
    content: "工場賃料",
    amount: 500000,
    currency: "JPY",
    paymentMethod: "銀行振込",
    paymentDate: "2025-12-30",
    status: "unpaid",
    note: "",
    isFixedCost: true,
  },
  {
    id: 5,
    category: "光熱費",
    content: "電気代",
    amount: 0,
    currency: "JPY",
    paymentMethod: "銀行振込",
    paymentDate: "2025-12-30",
    status: "unpaid",
    note: "",
    isFixedCost: false,
  },
  {
    id: 6,
    category: "光熱費",
    content: "水道代",
    amount: 0,
    currency: "JPY",
    paymentMethod: "銀行振込",
    paymentDate: "2025-12-30",
    status: "unpaid",
    note: "",
    isFixedCost: false,
  },
];
