export type ClientRow = {
  id: number;
  name: string;
  note: string;
  address: string;
  phone: string;
  taxId?: string;
  category: string;
  region: string;
  currency: string;
  status: "active" | "inactive";
};

export const clientRows: ClientRow[] = [
  {
    id: 1,
    name: "Nguyen Trading Co., Ltd.",
    note: "PVC材料の主要サプライヤー",
    address: "No.102, Huu Nghi Road, VSIP Bac Ninh Integrated Township",
    phone: "0241-3906-120",
    category: "材料",
    region: "ベトナム",
    currency: "USD",
    status: "active",
  },
  {
    id: 2,
    name: "Vietnam Plastics Ltd.",
    note: "ポリエチレン供給",
    address: "Lot B2, Thang Long Industrial Park, Hanoi",
    phone: "024-3555-7788",
    category: "材料",
    region: "ベトナム",
    currency: "VND",
    status: "active",
  },
  {
    id: 3,
    name: "Saigon Processing Co.",
    note: "外注加工先",
    address: "Saigon Hi-Tech Park, Thu Duc, Ho Chi Minh City",
    phone: "028-3896-5521",
    category: "加工",
    region: "ベトナム",
    currency: "USD",
    status: "active",
  },
  {
    id: 4,
    name: "Hanoi Logistics Service",
    note: "国内物流",
    address: "Dong Anh District, Hanoi",
    phone: "024-3888-9012",
    category: "物流",
    region: "ベトナム",
    currency: "VND",
    status: "active",
  },
  {
    id: 5,
    name: "Bangkok Materials Supply",
    note: "取引停止中",
    address: "Bang Na, Bangkok",
    phone: "+66-2-555-9012",
    category: "材料",
    region: "タイ",
    currency: "USD",
    status: "inactive",
  },
  {
    id: 6,
    name: "パナソニック株式会社",
    note: "主要取引先",
    address: "大阪府門真市大字門真1006番地",
    phone: "06-6908-1121",
    category: "顧客",
    region: "日本",
    currency: "JPY",
    status: "active",
  },
  {
    id: 7,
    name: "株式会社リケン",
    note: "自動車部品向け",
    address: "新潟県柏崎市北半田1-1",
    phone: "0257-23-6121",
    category: "顧客",
    region: "日本",
    currency: "JPY",
    status: "active",
  },
  {
    id: 8,
    name: "日本電産株式会社",
    note: "モーター部品向け",
    address: "京都府京都市南区久世殿城町338",
    phone: "075-935-6600",
    category: "顧客",
    region: "日本",
    currency: "JPY",
    status: "active",
  },
];
