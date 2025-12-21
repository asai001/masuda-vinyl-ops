export type ClientRow = {
  id: number;
  name: string;
  description: string;
  category: string;
  region: string;
  currency: string;
  status: "active" | "inactive";
};

export const clientRows: ClientRow[] = [
  {
    id: 1,
    name: "Nguyen Trading Co., Ltd.",
    description: "PVC材料の主要サプライヤー",
    category: "材料",
    region: "ベトナム",
    currency: "USD",
    status: "active",
  },
  {
    id: 2,
    name: "Vietnam Plastics Ltd.",
    description: "ポリエチレン供給",
    category: "材料",
    region: "ベトナム",
    currency: "VND",
    status: "active",
  },
  {
    id: 3,
    name: "Saigon Processing Co.",
    description: "外注加工先",
    category: "加工",
    region: "ベトナム",
    currency: "USD",
    status: "active",
  },
  {
    id: 4,
    name: "Hanoi Logistics Service",
    description: "国内物流",
    category: "物流",
    region: "ベトナム",
    currency: "VND",
    status: "active",
  },
  {
    id: 5,
    name: "Bangkok Materials Supply",
    description: "取引停止中",
    category: "材料",
    region: "タイ",
    currency: "USD",
    status: "inactive",
  },
  {
    id: 6,
    name: "パナソニック株式会社",
    description: "主要取引先",
    category: "顧客",
    region: "日本",
    currency: "JPY",
    status: "active",
  },
  {
    id: 7,
    name: "株式会社リケン",
    description: "自動車部品向け",
    category: "顧客",
    region: "日本",
    currency: "JPY",
    status: "active",
  },
  {
    id: 8,
    name: "日本電産株式会社",
    description: "モーター部品向け",
    category: "顧客",
    region: "日本",
    currency: "JPY",
    status: "active",
  },
];
