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
    code: "LDBA043800-2",
    name: "RAIL TOP",
    category: "部品",
    unit: "pcs",
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
    code: "LDBA043900-2",
    name: "RAIL BOTTOM",
    category: "原材料",
    unit: "pcs",
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
    code: "LDBA044901-2",
    name: "DOOR OUTER SASH R -S500",
    category: "原材料",
    unit: "pcs",
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
    code: "LDBA045001-2",
    name: "DOOR OUTER SASH L-S500",
    category: "完成品",
    unit: "pcs",
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
    code: "LDBA045101-3",
    name: "DOOR CENTER SASH-S500H",
    category: "半製品",
    unit: "pcs",
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
