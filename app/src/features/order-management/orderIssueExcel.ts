export type OrderIssueExcelLineItem = {
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  deliveryDate: string;
};

export type OrderIssueExcelPayload = {
  orderNumber: string;
  issueDate: string;
  supplierName: string;
  supplierAddress: string;
  supplierContact: string;
  currency: string;
  note: string;
  lineItems: OrderIssueExcelLineItem[];
};
