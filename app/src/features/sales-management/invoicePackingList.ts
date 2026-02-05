export type InvoicePackingLineItem = {
  partNo: string;
  partName: string;
  poNo: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  palletCount: number;
  totalWeight: number;
  packaging?: number | null;
};

export type InvoicePackingTemplate = "client" | "hq";

export type InvoicePackingPayload = {
  orderNo: string;
  invoiceDate: string;
  invoiceNo?: string;
  templateType?: InvoicePackingTemplate;
  destinationCountry: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeTel: string;
  consigneeTaxId: string;
  items: InvoicePackingLineItem[];
};
