export type ProductRow = {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  currency: string;
  unitPrice: number;
  materials: string[];
  weight: number | null;
  length: number | null;
  speed: number | null;
  status: "active" | "inactive";
  note: string;
};

export const productRows: ProductRow[] = [
  {
    id: 1,
    code: "P-001",
    name: "電子部品A",
    category: "部品",
    unit: "個",
    currency: "USD",
    unitPrice: 150,
    materials: ["PI-001", "PI-002"],
    weight: 50,
    length: 100,
    speed: 0.6,
    status: "active",
    note: "",
  },
  {
    id: 2,
    code: "P-002",
    name: "プラスチック樹脂",
    category: "原材料",
    unit: "kg",
    currency: "USD",
    unitPrice: 2.5,
    materials: [],
    weight: 1000,
    length: null,
    speed: null,
    status: "active",
    note: "",
  },
  {
    id: 3,
    code: "P-003",
    name: "添加剤",
    category: "原材料",
    unit: "kg",
    currency: "USD",
    unitPrice: 5,
    materials: [],
    weight: 1000,
    length: null,
    speed: null,
    status: "active",
    note: "",
  },
  {
    id: 4,
    code: "P-004",
    name: "成形品A",
    category: "完成品",
    unit: "個",
    currency: "JPY",
    unitPrice: 25,
    materials: ["PI-003"],
    weight: 80,
    length: 150,
    speed: 0.6,
    status: "active",
    note: "",
  },
  {
    id: 5,
    code: "P-005",
    name: "半製品B",
    category: "半製品",
    unit: "個",
    currency: "USD",
    unitPrice: 15,
    materials: ["PI-001"],
    weight: 60,
    length: 120,
    speed: 0.6,
    status: "active",
    note: "",
  },
];
