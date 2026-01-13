export type ClientRow = {
  /** 表示用の連番（一覧の並び・UI用） */
  id: number;

  /** DynamoDB の sort key 想定（更新/削除をする場合に必要） */
  clientId: string;

  name: string;
  note: string;
  address: string;
  phone: string;
  taxId?: string;
  category?: string;
  region: string;
  currency: string;
  status: "active" | "inactive" | undefined;
};

export type ClientItem = {
  orgId: string;
  clientId: string;
  displayNo?: number;
  name: string;
  category?: string;
  region?: string;
  currency?: string;
  status?: "active" | "inactive" | undefined;
  address?: string;
  phone?: string;
  note?: string;
  code?: string;
  taxId?: string;
  createdAt?: string;
  updatedAt?: string;
};
