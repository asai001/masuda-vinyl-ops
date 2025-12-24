export type MaterialRow = {
  id: number;
  code: string;
  name: string;
  supplier: string;
  category: string;
  unit: string;
  currency: string;
  unitPrice: number;
  status: "active" | "inactive";
  note: string;
};

export const materialRows: MaterialRow[] = [
  {
    id: 1,
    code: "PI-001",
    name: "鋼材A",
    supplier: "Nguyen Trading Co., Ltd.",
    category: "原材料",
    unit: "kg",
    currency: "JPY",
    unitPrice: 3.5,
    status: "active",
    note: "主要原料",
  },
  {
    id: 2,
    code: "PI-002",
    name: "アルミ材",
    supplier: "Vietnam Plastics Ltd.",
    category: "原材料",
    unit: "kg",
    currency: "USD",
    unitPrice: 4.2,
    status: "active",
    note: "",
  },
  {
    id: 3,
    code: "PI-003",
    name: "ボルトM8",
    supplier: "Nguyen Trading Co., Ltd.",
    category: "部品",
    unit: "個",
    currency: "USD",
    unitPrice: 0.5,
    status: "active",
    note: "",
  },
  {
    id: 4,
    code: "PI-004",
    name: "包装材料",
    supplier: "Saigon Processing Co.",
    category: "原材料",
    unit: "箱",
    currency: "VND",
    unitPrice: 12,
    status: "active",
    note: "",
  },
  {
    id: 5,
    code: "PI-005",
    name: "工具セット",
    supplier: "Vietnam Plastics Ltd.",
    category: "部品",
    unit: "個",
    currency: "USD",
    unitPrice: 85,
    status: "active",
    note: "",
  },
];
