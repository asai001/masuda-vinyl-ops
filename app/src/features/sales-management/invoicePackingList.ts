export type InvoicePackingLineItem = {
  partNo: string;
  partName: string;
  poNo: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export type InvoicePackingPayload = {
  orderNo: string;
  invoiceDate: string;
  invoiceNo?: string;
  destinationCountry: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeTel: string;
  consigneeTaxId: string;
  items: InvoicePackingLineItem[];
};
