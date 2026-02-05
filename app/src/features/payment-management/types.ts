export const paymentStatusOptions = [
  { key: "paid", label: "支払済み" },
  { key: "unpaid", label: "未払い" },
] as const;

export type PaymentStatusKey = (typeof paymentStatusOptions)[number]["key"];

export type PaymentManagementRow = {
  id: number;
  paymentId: string;
  yearMonth: string;
  transferDestinationName?: string;
  category: string;
  content: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  status: PaymentStatusKey;
  note: string;
  isFixedCost: boolean;
};

export type NewPaymentManagementInput = Omit<PaymentManagementRow, "id" | "paymentId" | "yearMonth">;

export type UpdatePaymentManagementInput = NewPaymentManagementInput & {
  paymentId: string;
  yearMonth: string;
};

export type PaymentManagementItem = {
  paymentMonthKey: string;
  paymentId: string;
  orgId: string;
  displayNo?: number;

  yearMonth?: string;
  paymentDate?: string;
  transferDestinationName?: string;
  category?: string;
  content?: string;
  contentLower?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  status?: PaymentStatusKey;
  note?: string;
  isFixedCost?: boolean;

  createdAt?: string;
  updatedAt?: string;

  paymentDateIndexPk?: string;
  paymentDateIndexSk?: string;
  monthCategoryIndexPk?: string;
  monthCategoryIndexSk?: string;
  monthCurrencyIndexPk?: string;
  monthCurrencyIndexSk?: string;
  monthPaymentMethodIndexPk?: string;
  monthPaymentMethodIndexSk?: string;
  monthStatusIndexPk?: string;
  monthStatusIndexSk?: string;
  monthAmountIndexPk?: string;
  monthAmountIndexSk?: number;
  monthContentIndexPk?: string;
  monthContentIndexSk?: string;
};
