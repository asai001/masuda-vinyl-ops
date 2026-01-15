export type MaterialRow = {
  id: number;
  materialId: string;

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

// New は id/materialId を持たない
export type NewMaterialInput = Omit<MaterialRow, "id" | "materialId">;

export type UpdateMaterialInput = Omit<MaterialRow, "id">; // materialId + 各項目

export type MaterialItem = {
  orgId: string;
  materialId: string;
  displayNo?: number;

  code: string;
  name: string;
  supplier?: string;
  category?: string;
  unit?: string;
  currency?: string;
  unitPrice?: number;
  status?: "active" | "inactive";
  note?: string;

  createdAt?: string;
  updatedAt?: string;
};
