export type PaymentRow = {
  id: number;
  category: string;
  content: string;
  isFixedCost: boolean;
  fixedAmount: number | null;
  currency: string;
  paymentMethod: string;
  paymentDate: number;
  note: string;
};

export const paymentRows: PaymentRow[] = [
  {
    id: 1,
    category: "家賃",
    content: "工場賃料",
    isFixedCost: true,
    fixedAmount: 500000,
    currency: "JPY",
    paymentMethod: "銀行振込",
    paymentDate: 30,
    note: "毎月末支払い",
  },
  {
    id: 2,
    category: "光熱費",
    content: "電気代",
    isFixedCost: false,
    fixedAmount: null,
    currency: "JPY",
    paymentMethod: "銀行振込",
    paymentDate: 30,
    note: "",
  },
  {
    id: 3,
    category: "光熱費",
    content: "水道代",
    isFixedCost: false,
    fixedAmount: null,
    currency: "JPY",
    paymentMethod: "銀行振込",
    paymentDate: 30,
    note: "",
  },
];
