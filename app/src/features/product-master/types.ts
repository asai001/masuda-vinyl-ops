export type ProductRow = {
  id: number;
  productId: string;
  code: string;
  name: string;
  packaging: number | null;
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

export type NewProductInput = Omit<ProductRow, "id" | "productId">;
export type UpdateProductInput = Omit<ProductRow, "id">;

export type ProductItem = {
  orgId: string;
  productId: string;
  displayNo?: number;
  code: string;
  name: string;
  packaging?: number | null;
  category?: string;
  unit?: string;
  currency?: string;
  unitPrice?: number;
  materials?: string[];
  weight?: number | null;
  length?: number | null;
  speed?: number | null;
  status?: "active" | "inactive";
  note?: string;
  createdAt?: string;
  updatedAt?: string;
};
