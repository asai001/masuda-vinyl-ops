export type PaymentRow = {
  id: number;
  paymentDefId: string;

  transferDestinationName?: string;
  category: string;
  content: string;
  isFixedCost: boolean;
  fixedAmount: number | null;
  currency: string;
  paymentMethod: string;
  paymentDate: number;
  note: string;
};

export type NewPaymentInput = Omit<PaymentRow, "id" | "paymentDefId">;
export type UpdatePaymentInput = Omit<PaymentRow, "id">;

export type PaymentDefinitionItem = {
  orgId: string;
  paymentDefId: string;
  displayNo?: number;

  transferDestinationName?: string;
  category?: string;
  content?: string;
  isFixedCost?: boolean;
  fixedAmount?: number | null;
  currency?: string;
  paymentMethod?: string;
  paymentDate?: number;
  note?: string;

  createdAt?: string;
  updatedAt?: string;
};
