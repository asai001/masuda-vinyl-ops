import type { InvoicePackingPayload } from "./invoicePackingList";

const shipperInfo = {
  name: "MASUDA VINYL VIETNAM CO.,LTD",
  lines: [
    "LOT NO1 DONG DANG DINH TRAM INDUSTRIAL ZONE",
    "NENH WARD BAC NINH PROVINCE",
  ],
  tel: "0204 3662 777",
  fax: "0204 3662 825",
  fromLocation: "BACNINH VIETNAM",
  countryOfOrigin: "VIETNAM",
  terms: "FOB HAI PHONG VIETNAM Incoterms® 2020",
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safeText = (value?: string | null) => escapeHtml((value ?? "").trim());
const HQ_DESTINATION_COUNTRY = "JAPAN";

const formatNumber = (value: number, digits = 2) => {
  if (!Number.isFinite(value)) {
    return "";
  }
  return value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits });
};

const formatQuantity = (value: number) => formatNumber(value, 0);

const formatPackaging = (value: number | null | undefined, unit: string) => {
  if (!Number.isFinite(value ?? NaN)) {
    return "";
  }
  const unitLabel = unit ? `${unit}/box` : "/box";
  return `${formatNumber(value as number, 0)} ${escapeHtml(unitLabel)}`;
};

const formatFixedNumber = (value: number, digits = 2) => {
  if (!Number.isFinite(value)) {
    return "";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const formatWeightKg = (value: number) => {
  const formatted = formatFixedNumber(value, 2);
  if (!formatted) {
    return "";
  }
  return `${formatted} kg`;
};

const calculateBoxesCount = (quantity: number, packaging: number | null | undefined) => {
  if (!Number.isFinite(quantity) || !Number.isFinite(packaging ?? NaN)) {
    return 0;
  }
  const packagingValue = packaging as number;
  if (packagingValue <= 0) {
    return 0;
  }
  return Math.ceil(quantity / packagingValue);
};

const formatBoxesCount = (quantity: number, packaging: number | null | undefined) => {
  const boxesCount = calculateBoxesCount(quantity, packaging);
  if (!Number.isFinite(boxesCount) || boxesCount <= 0) {
    return "";
  }
  return formatNumber(boxesCount, 0);
};

const hqConsigneeInfo = {
  name: "MASUDA VINYL CO.,LTD",
  lines: ["390ROKUGAIKECYOU KITAKU", "NAGOYA CITY AICHI JAPAN"],
  tel: "052-901-9373",
  fax: "052-901-6943",
};

const isHqTemplate = (payload: InvoicePackingPayload) => payload.templateType === "hq";

const formatHqUnitPrice = (value: number) => {
  if (!Number.isFinite(value)) {
    return "";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
};

const formatHqAmount = (value: number) => {
  if (!Number.isFinite(value)) {
    return "";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const renderCurrencyAmount = (value: string) => (value ? `<span class="hq-currency">$</span><span>${value}</span>` : "");

const resolveHqIncotermLine = (destinationCountry: string) => {
  const normalized = destinationCountry.trim().toUpperCase();
  if (!normalized || normalized === "JAPAN") {
    return "CIF TO NAGOYA PORT";
  }
  return `CIF TO ${normalized} PORT`;
};

const renderHtmlLines = (values: string[]) =>
  values
    .filter((value) => value.trim().length > 0)
    .map((value) => `<div>${safeText(value)}</div>`)
    .join("");

const commonStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #f3f4f6; color: #111111; font-family: "NotoSerifJP", "NotoSerif", serif; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #ffffff; padding: 10mm; }
  .title { text-align: center; font-size: 22px; font-weight: 700; letter-spacing: 1px; margin: 4px 0 6px; }
  .meta-top { display: flex; justify-content: flex-end; font-size: 11px; margin-bottom: 6px; }
  .meta-top span { white-space: nowrap; }
  .info-table { width: 100%; border-collapse: collapse; border: 2px solid #111111; table-layout: fixed; }
  .info-table td { border: 1px solid #111111; vertical-align: top; padding: 0; }
  .info-left-cell { width: 68%; padding: 6px; }
  .info-right-cell { width: 32%; padding: 0; }
  .block + .block { border-top: 1px solid #111111; margin-top: 6px; padding-top: 6px; }
  .block-title { font-weight: 700; font-size: 12px; }
  .block-title .en { font-weight: 700; }
  .block-body { font-size: 12px; line-height: 1.35; }
  .shipper-name { font-size: 14px; font-weight: 700; margin-top: 2px; }
  .right-table { width: 100%; border-collapse: collapse; height: 100%; }
  .right-table td { border-bottom: 1px solid #111111; padding: 4px 6px; font-size: 11px; }
  .right-table td.tight { padding: 0; }
  .tight { padding: 0; }
  .right-table tr:last-child td { border-bottom: none; }
  .right-cell-title { font-weight: 700; text-align: center; }
  .right-cell-value { text-align: center; font-weight: 700; margin-top: 2px; font-size: 12px; }
  .right-note { min-height: 34px; }
  .right-terms { min-height: 34px; }
  .right-top-table { width: 100%; border-collapse: collapse; }
  .right-top-table td { border-bottom: 1px solid #111111; padding: 4px 6px; font-size: 11px; }
  .right-top-table tr:last-child td { border-bottom: none; }
  .right-middle-table { width: 100%; border-collapse: collapse; }
  .right-middle-table td { border-bottom: 1px solid #111111; padding: 6px; font-size: 11px; }
  .right-middle-table tr:last-child td { border-bottom: none; }
  .origin-table { width: 100%; border-collapse: collapse; }
  .origin-table td { border: 1px solid #111111; padding: 2px 3px; font-size: 10px; text-align: center; }
  .origin-head { font-weight: 700; line-height: 1.2; }
  .check-table { width: 100%; border-collapse: collapse; margin-top: 0; }
  .check-table td { border: 1px solid #111111; padding: 2px 4px; font-size: 10px; vertical-align: middle; line-height: 1.2; }
  .check-cell { width: 18px; text-align: center; }
  .terms-box { min-height: 40px; font-size: 10px; }
  .remark-box { min-height: 32px; font-size: 10px; }
  .checkbox { width: 12px; height: 12px; border: 1px solid #111111; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; }
  .fromto-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12px; }
  .fromto-table td { padding: 4px 6px; }
  .fromto-label { width: 28%; font-weight: 700; border-bottom: 1px dotted #111111; }
  .fromto-line { border-bottom: 1px dotted #111111; height: 1px; width: 100%; }
  .fromto-value { text-align: center; border-bottom: 1px dotted #111111; font-weight: 700; padding: 6px 0; }
  .invoice-top-table { width: 100%; border-collapse: collapse; border: 2px solid #111111; table-layout: fixed; }
  .invoice-top-table > tbody > tr > td,
  .invoice-top-table > tr > td { border: 1px solid #111111; vertical-align: top; padding: 0; }
  .invoice-top-left { width: 67%; }
  .invoice-top-right { width: 33%; }
  .invoice-block { padding: 4px 6px; }
  .invoice-block-title { font-size: 12px; font-weight: 700; line-height: 1.2; }
  .invoice-block-body { font-size: 12px; line-height: 1.3; min-height: 72px; }
  .invoice-party-name { font-size: 13px; font-weight: 700; line-height: 1.25; margin: 4px 0 1px; letter-spacing: 0.1px; }
  .invoice-contact-gap { height: 14px; }
  .invoice-consignee-body { min-height: 112px; }
  .invoice-right-head-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .invoice-right-head-table td { padding: 0; }
  .invoice-right-head-row-invoice td { border-bottom: 1px solid #111111; }
  .invoice-right-head-row-terms td { border-top: 1px solid #111111; }
  .invoice-right-invoice { text-align: center; padding: 3px 4px 4px; }
  .invoice-right-invoice-label { font-size: 12px; font-weight: 700; line-height: 1.15; }
  .invoice-right-invoice-no { font-size: 13px; font-weight: 700; line-height: 1.15; margin-top: 2px; }
  .invoice-country-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .invoice-country-table td { text-align: center; padding: 1px 2px; font-size: 10px; line-height: 1.15; }
  .invoice-country-table td + td { border-left: 1px solid #111111; }
  .invoice-country-table tr + tr td { border-top: 1px solid #111111; }
  .invoice-country-head { font-weight: 700; }
  .invoice-country-value { font-size: 12px; font-weight: 700; }
  .invoice-terms-title { text-align: center; font-size: 12px; font-weight: 700; padding: 3px 4px; line-height: 1.2; }
  .invoice-right-terms-gap { min-height: 70px; border-bottom: 1px solid #111111; }
  .invoice-right-remark { font-size: 12px; font-weight: 400; line-height: 1.15; padding: 2px 4px; }
  .invoice-option-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .invoice-option-table td { padding: 1px 2px; font-size: 9px; line-height: 1.1; vertical-align: middle; }
  .invoice-option-row td { height: 20px; }
  .invoice-option-row:first-child .invoice-option-check { border-top: 1px solid #111111; }
  .invoice-option-row + .invoice-option-row .invoice-option-check { border-top: 1px solid #111111; }
  .invoice-option-row:last-child .invoice-option-check { border-bottom: 1px solid #111111; }
  .invoice-option-check { width: 64px; text-align: center; border-right: 1px solid #111111; font-size: 10px; font-weight: 400; padding: 0; }
  .invoice-option-label { padding-left: 2px; white-space: nowrap; }
  .invoice-option-label .invoice-option-label-sample-en { font-size: 8px; white-space: nowrap; }
  .invoice-option-row-gap td { height: 20px; padding: 0; }
  .invoice-option-row-gap .invoice-option-check { border-right: none; }
  .invoice-option-gap { height: 10px; }
  .invoice-fromto-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
  .invoice-fromto-table td { padding: 3px 6px; }
  .invoice-fromto-row-from td { border-bottom: 1px dotted #111111; }
  .invoice-fromto-label { width: 28%; font-weight: 700; }
  .invoice-fromto-dotted { border-bottom: 1px dotted #111111; }
  .invoice-fromto-value { text-align: center; font-size: 13px; font-weight: 700; padding: 0 0 4px; line-height: 1.2; }
  .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; border: 2px solid #111111; }
  .items-table th, .items-table td { border: 1px solid #111111; font-size: 11px; }
  .items-table th { text-align: center; font-weight: 700; padding: 0; }
  .items-table td { height: 20px; padding: 3px 4px; }
  .invoice-items-table th, .invoice-items-table td { text-align: center; }
  .invoice-items-table .text-right { text-align: center; }
  .invoice-items-table .items-header-sub { font-size: 10px; }
  .packing-items-table th, .packing-items-table td { text-align: center; font-size: 9px; }
  .packing-items-table td { height: 30px; }
  .packing-items-table .items-header-sub { font-size: 7px; }
  .packing-total-row td { font-weight: 700; }
  .packing-total-label { text-align: center; }
  .packing-total-value { white-space: nowrap; }
  .packing-footer-origin-cell,
  .packing-footer-body-cell { text-align: left !important; }
  .packing-footer-origin-cell {
    padding: 4px 8px !important;
    font-weight: 700;
    text-decoration: underline;
    border-bottom: none !important;
  }
  .packing-footer-body-cell { padding: 8px 10px !important; border-top: none !important; }
  .packing-footer-layout { display: flex; min-height: 120px; }
  .packing-footer-left { display: flex; flex-direction: column; gap: 8px; }
  .packing-footer-row { display: grid; grid-template-columns: auto auto; column-gap: 24px; align-items: baseline; }
  .packing-footer-value { min-width: 90px; white-space: nowrap; }
  .packing-footer-signature {
    margin-left: auto;
    width: 36%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 18px;
  }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .footers { display: flex; justify-content: space-between; margin-top: 10px; font-size: 11px; }
  .footers .label { font-weight: 700; }
  .hq-page { background: #ffffff; padding: 8mm 6mm 10mm; }
  .hq-title { margin-top: 0; margin-bottom: 2mm; font-size: 24px; letter-spacing: 0.8px; }
  .hq-meta-top { margin-bottom: 8px; font-size: 11px; }
  .hq-top-table { width: 100%; border-collapse: collapse; border: 2px solid #111111; table-layout: fixed; }
  .hq-top-table > tbody > tr > td,
  .hq-top-table > tr > td { border: 1px solid #111111; vertical-align: top; padding: 0; }
  .hq-top-left { width: 66%; }
  .hq-top-right { width: 34%; }
  .hq-left-stack, .hq-right-stack { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .hq-left-stack > tbody > tr > td,
  .hq-left-stack > tr > td,
  .hq-right-stack > tbody > tr > td,
  .hq-right-stack > tr > td { padding: 0; vertical-align: top; }
  .hq-left-stack > tbody > tr + tr > td,
  .hq-left-stack > tr + tr > td,
  .hq-right-stack > tbody > tr + tr > td,
  .hq-right-stack > tr + tr > td { border-top: 1px solid #111111; }
  .hq-block { padding: 4px 6px; }
  .hq-shipper-block { padding-bottom: 14px; }
  .hq-block-title { font-size: 12px; font-weight: 700; line-height: 1.15; }
  .hq-block-body { font-size: 11px; line-height: 1.25; }
  .hq-block-body.hq-consignee-body { min-height: 118px; }
  .hq-party-name { font-size: 13px; font-weight: 700; margin: 4px 0 2px; line-height: 1.2; }
  .hq-right-invoice { text-align: center; padding: 2px 4px 4px; border-bottom: 1px solid #111111; }
  .hq-right-invoice-label { font-size: 12px; font-weight: 700; line-height: 1.1; }
  .hq-right-invoice-no { margin-top: 2px; font-size: 13px; font-weight: 700; line-height: 1.15; }
  .hq-country-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .hq-country-table td { border-bottom: 1px solid #111111; padding: 1px 2px; text-align: center; font-size: 10px; line-height: 1.15; }
  .hq-country-table td + td { border-left: 1px solid #111111; }
  .hq-country-head { font-weight: 700; }
  .hq-country-value { font-size: 12px; font-weight: 700; }
  .hq-terms-head { border-bottom: 1px solid #111111; text-align: center; padding: 2px 4px; font-size: 12px; font-weight: 700; line-height: 1.2; }
  .hq-terms-body { padding: 6px 6px 8px; text-align: center; font-size: 10px; line-height: 1.25; }
  .hq-terms-body .hq-terms-ja { font-weight: 700; font-size: 11px; margin-bottom: 4px; }
  .hq-remark-head { padding: 3px 4px; font-size: 12px; line-height: 1.15; }
  .hq-remark-body { min-height: 150px; padding: 4px 8px; font-size: 9px; line-height: 1.25; }
  .hq-remark-content { min-height: 130px; text-align: left; vertical-align: top; }
  .hq-option-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 14px; margin-bottom: 10px; }
  .hq-option-table td { font-size: 9px; line-height: 1.1; padding: 1px 2px; vertical-align: middle; }
  .hq-option-table .hq-option-row td { height: 19px; }
  .hq-option-check { width: 48px; border-right: 1px solid #111111; text-align: center; padding: 0; }
  .hq-option-row + .hq-option-row .hq-option-check { border-top: 1px solid #111111; }
  .hq-option-table .hq-option-row:first-child .hq-option-check { border-top: 1px solid #111111; }
  .hq-option-table .hq-option-row:last-child .hq-option-check { border-bottom: 1px solid #111111; }
  .hq-option-label { padding-left: 4px; white-space: nowrap; }
  .hq-option-gap td { height: 12px; padding: 0; }
  .hq-option-gap .hq-option-check { border-right: none; }
  .hq-delivery-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
  .hq-delivery-table td { padding: 0; }
  .hq-delivery-label-cell { padding: 4px 6px; border-right: 1px solid #111111; }
  .hq-delivery-label { font-weight: 700; line-height: 1.2; }
  .hq-delivery-fill { height: 38px; border-top: 1px dotted #111111; margin-top: 4px; }
  .hq-delivery-term { width: 68px; text-align: center; font-size: 12px; font-weight: 700; }
  .hq-items-table { width: 100%; border-collapse: collapse; margin-top: 16px; border: 2px solid #111111; table-layout: fixed; background: #ffffff; }
  .hq-items-table th, .hq-items-table td { border: 1px solid #111111; padding: 2px 4px; font-size: 10px; line-height: 1.15; }
  .hq-items-table th { text-align: center; font-weight: 700; }
  .hq-items-table td { height: 22px; }
  .hq-items-table .hq-header-ja { display: block; font-size: 10px; }
  .hq-items-table .hq-header-en { display: block; font-size: 9px; font-weight: 700; }
  .hq-items-table .hq-center { text-align: center; }
  .hq-items-table .hq-right { text-align: right; }
  .hq-items-table .hq-desc { text-align: center; font-weight: 700; }
  .hq-items-table .hq-money-cell { white-space: nowrap; }
  .hq-items-table .hq-money-wrap { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
  .hq-currency { min-width: 8px; display: inline-block; text-align: left; }
  .hq-invoice-total-row td { height: 60px; font-weight: 700; font-size: 12px; }
  .hq-invoice-total-label { text-align: center; }
  .hq-footer { display: grid; grid-template-columns: 1fr 34%; column-gap: 12px; margin-top: 12px; align-items: start; font-size: 11px; }
  .hq-footer-left { display: flex; flex-direction: column; gap: 6px; }
  .hq-footer-origin { font-weight: 700; }
  .hq-footer-incoterm { font-weight: 700; text-decoration: underline; }
  .hq-footer-signature { text-align: center; font-weight: 700; padding-top: 2px; }
  .hq-packing-table th, .hq-packing-table td { font-size: 9px; }
  .hq-packing-table td { height: 20px; }
  .hq-packing-total-row td { font-weight: 700; }
  .hq-packing-summary-row td { height: 20px; padding: 1px 4px; font-weight: 700; vertical-align: middle; }
  .hq-packing-summary-label { text-align: center; }
  .hq-packing-summary-qty,
  .hq-packing-summary-box,
  .hq-packing-summary-pallet,
  .hq-packing-summary-gross { text-align: center; white-space: nowrap; }
  .hq-packing-summary-pack { background: #ffffff; }
  .hq-packing-footer { margin-top: 2px; font-size: 11px; line-height: 1.25; }
  .hq-packing-footer-incoterm { font-weight: 700; text-decoration: underline; margin-bottom: 6px; }
  .hq-packing-footer-row {
    display: grid;
    grid-template-columns: 330px 1fr 180px;
    column-gap: 10px;
    align-items: baseline;
    margin-top: 2px;
  }
  .hq-packing-footer-values { display: flex; gap: 24px; flex-wrap: wrap; }
  .hq-packing-footer-signature { text-align: center; font-weight: 700; }
  .hq-packing-note { margin-top: 8px; display: grid; grid-template-columns: 1fr 34%; column-gap: 12px; font-size: 11px; }
  .hq-packing-note-left { display: flex; flex-direction: column; gap: 4px; }
  .hq-packing-note-row { display: flex; justify-content: space-between; gap: 12px; }
  .hq-packing-note-label { font-weight: 700; }
`;

const renderInvoiceRows = (items: InvoicePackingPayload["items"]) => {
  const rowCount = 18;
  const rows = Array.from({ length: rowCount }, (_, index) => items[index] ?? null);
  return rows
    .map((item, index) => {
      if (!item) {
        return `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="text-right"></td>
            <td class="text-right"></td>
            <td class="text-right"></td>
          </tr>
        `;
      }
      const amount = item.quantity * item.unitPrice;
      return `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${safeText(item.partNo)}</td>
          <td>${safeText(item.partName)}</td>
          <td class="text-center">${safeText(item.poNo)}</td>
          <td class="text-center">${safeText(item.unit)}</td>
          <td class="text-right">${formatQuantity(item.quantity)}</td>
          <td class="text-right">${formatNumber(item.unitPrice)}</td>
          <td class="text-right">${formatNumber(amount)}</td>
        </tr>
      `;
    })
    .join("");
};

const renderSharedTopSection = (payload: InvoicePackingPayload, invoiceNo: string, destination: string) => `
        <table class="invoice-top-table">
          <tr>
            <td class="invoice-top-left">
              <div class="invoice-block">
                <div class="invoice-block-title">依頼主 (Shipper Address)</div>
                <div class="invoice-block-body">
                  <div class="invoice-party-name">${safeText(shipperInfo.name)}</div>
                  ${shipperInfo.lines.map((line) => `<div>${safeText(line)}</div>`).join("")}
                  <div>TEL: ${safeText(shipperInfo.tel)}</div>
                  <div>FAX : ${safeText(shipperInfo.fax)}</div>
                </div>
              </div>
            </td>
            <td class="invoice-top-right">
              <table class="invoice-right-head-table">
                <tr class="invoice-right-head-row-invoice">
                  <td>
                    <div class="invoice-right-invoice">
                      <div class="invoice-right-invoice-label">Invoice No</div>
                      <div class="invoice-right-invoice-no">${invoiceNo}</div>
                    </div>
                  </td>
                </tr>
                <tr class="invoice-right-head-row-country">
                  <td class="tight">
                    <table class="invoice-country-table">
                      <colgroup>
                        <col style="width: 34%;" />
                        <col style="width: 66%;" />
                      </colgroup>
                      <tr>
                        <td class="invoice-country-head">(原産国)<br/>Country of Origin</td>
                        <td class="invoice-country-head">(仕向先国名)<br/>Country of Destination</td>
                      </tr>
                      <tr>
                        <td class="invoice-country-value">${safeText(shipperInfo.countryOfOrigin)}</td>
                        <td class="invoice-country-value">${destination}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr class="invoice-right-head-row-terms">
                  <td>
                    <div class="invoice-terms-title">支払条件 (Terms of Payment)</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="invoice-top-left">
              <div class="invoice-block">
                <div class="invoice-block-title">荷受人(Consignee)</div>
                <div class="invoice-block-body invoice-consignee-body">
                  <div class="invoice-party-name">${safeText(payload.consigneeName)}</div>
                  <div>${safeText(payload.consigneeAddress)}</div>
                  <div class="invoice-contact-gap"></div>
                  <div>TEL: ${safeText(payload.consigneeTel)}</div>
                  <div>TAX ID: ${safeText(payload.consigneeTaxId)}</div>
                </div>
              </div>
            </td>
            <td class="invoice-top-right tight" rowspan="2">
              <div class="invoice-right-terms-gap"></div>
              <div class="invoice-right-remark">備考 (Remark):</div>
              <div class="invoice-option-gap"></div>
              <table class="invoice-option-table">
                <tr class="invoice-option-row">
                  <td class="invoice-option-check">&#10003;</td>
                  <td class="invoice-option-label">有償 (Commercial Value)</td>
                </tr>
                <tr class="invoice-option-row">
                  <td class="invoice-option-check"></td>
                  <td class="invoice-option-label">無償(No Commercial Value)</td>
                </tr>
                <tr class="invoice-option-row invoice-option-row-gap">
                  <td class="invoice-option-check"></td>
                  <td class="invoice-option-label"></td>
                </tr>
                <tr class="invoice-option-row">
                  <td class="invoice-option-check"></td>
                  <td class="invoice-option-label">贈物 (Gift)</td>
                </tr>
                <tr class="invoice-option-row">
                  <td class="invoice-option-check"></td>
                  <td class="invoice-option-label">
                    商品見本(<span class="invoice-option-label-sample-en">Sample, No Commercial Value</span>)
                  </td>
                </tr>
                <tr class="invoice-option-row">
                  <td class="invoice-option-check"></td>
                  <td class="invoice-option-label">その他 (Other)</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="invoice-top-left">
              <table class="invoice-fromto-table">
                <tr class="invoice-fromto-row-from">
                  <td class="invoice-fromto-label">From (発地国)</td>
                  <td></td>
                </tr>
                <tr>
                  <td colspan="2" class="invoice-fromto-value">${safeText(shipperInfo.fromLocation)}</td>
                </tr>
                <tr>
                  <td class="invoice-fromto-label">To (着地国)</td>
                  <td></td>
                </tr>
                <tr>
                  <td colspan="2" class="invoice-fromto-value">${destination}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
`;

const renderHqTopSection = (invoiceNo: string) => {
  const destinationRaw = HQ_DESTINATION_COUNTRY;
  const destination = safeText(destinationRaw);

  return `
        <table class="hq-top-table">
          <tr>
            <td class="hq-top-left">
              <table class="hq-left-stack">
                <tr>
                  <td>
                    <div class="hq-block hq-shipper-block">
                      <div class="hq-block-title">依頼主 (Shipper Address)</div>
                      <div class="hq-block-body">
                        <div class="hq-party-name">${safeText(shipperInfo.name)}</div>
                        ${renderHtmlLines(shipperInfo.lines)}
                        <div>TEL : ${safeText(shipperInfo.tel)}</div>
                        <div>FAX : ${safeText(shipperInfo.fax)}</div>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="hq-block">
                      <div class="hq-block-title">荷受人(Consignee)</div>
                      <div class="hq-block-body hq-consignee-body">
                        <div class="hq-party-name">${safeText(hqConsigneeInfo.name)}</div>
                        ${renderHtmlLines(hqConsigneeInfo.lines)}
                        <div style="height: 14px;"></div>
                        <div>TEL : ${safeText(hqConsigneeInfo.tel)}</div>
                        <div>FAX : ${safeText(hqConsigneeInfo.fax)}</div>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table class="hq-delivery-table">
                      <tr>
                        <td class="hq-delivery-label-cell">
                          <div class="hq-delivery-label">Delivery to (着地)</div>
                          <div class="hq-delivery-fill"></div>
                        </td>
                        <td class="hq-delivery-term">CIF</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
            <td class="hq-top-right">
              <table class="hq-right-stack">
                <tr>
                  <td>
                    <div class="hq-right-invoice">
                      <div class="hq-right-invoice-label">Invoice No</div>
                      <div class="hq-right-invoice-no">${invoiceNo}</div>
                    </div>
                    <table class="hq-country-table">
                      <tr>
                        <td class="hq-country-head">(原産国)<br/>Country of Origin</td>
                        <td class="hq-country-head">(仕向先国名)<br/>Country of Destination</td>
                      </tr>
                      <tr>
                        <td class="hq-country-value">${safeText(shipperInfo.countryOfOrigin)}</td>
                        <td class="hq-country-value">${destination}</td>
                      </tr>
                    </table>
                    <div class="hq-terms-head">支払条件 (Terms of Payment)</div>
                    <div class="hq-terms-body">
                      <div class="hq-terms-ja">20日締め翌月末 支払</div>
                      <div>(Invoice will be closed on 20th every month and payment at end of the following month)</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="hq-remark-head">備考 (Remark):</div>
                    <table class="hq-option-table">
                      <tr class="hq-option-row">
                        <td class="hq-option-check">&#10003;</td>
                        <td class="hq-option-label">有償 (Commercial Value)</td>
                      </tr>
                      <tr class="hq-option-row">
                        <td class="hq-option-check"></td>
                        <td class="hq-option-label">無償(No Commercial Value)</td>
                      </tr>
                      <tr class="hq-option-row hq-option-gap">
                        <td class="hq-option-check"></td>
                        <td class="hq-option-label"></td>
                      </tr>
                      <tr class="hq-option-row">
                        <td class="hq-option-check"></td>
                        <td class="hq-option-label">贈物 (Gift)</td>
                      </tr>
                      <tr class="hq-option-row">
                        <td class="hq-option-check"></td>
                        <td class="hq-option-label">商品見本(Sample, No Commercial Value)</td>
                      </tr>
                      <tr class="hq-option-row">
                        <td class="hq-option-check"></td>
                        <td class="hq-option-label">その他 (Other)</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
`;
};

const renderHqInvoiceRows = (items: InvoicePackingPayload["items"]) => {
  const rowCount = 13;
  const totalItems = items.length;
  const rows = Array.from({ length: rowCount }, (_, index) => items[index] ?? null);

  return rows
    .map((item, index) => {
      if (!item) {
        return `
          <tr>
            <td class="hq-center"></td>
            <td></td>
            <td></td>
            <td class="hq-center"></td>
            <td class="hq-right"></td>
            <td class="hq-right hq-money-cell"></td>
            <td class="hq-right hq-money-cell"></td>
          </tr>
        `;
      }

      const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
      const unitPrice = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;
      const amount = quantity * unitPrice;
      const marks = totalItems ? `${index + 1}/${totalItems}` : `${index + 1}`;
      const unitPriceText = formatHqUnitPrice(unitPrice);
      const amountText = formatHqAmount(amount);

      return `
        <tr>
          <td class="hq-center">${safeText(marks)}</td>
          <td class="hq-desc">${safeText(item.partName || item.partNo)}</td>
          <td class="hq-center">${safeText(item.poNo)}</td>
          <td class="hq-center">${safeText(item.unit)}</td>
          <td class="hq-right">${formatQuantity(quantity)}</td>
          <td class="hq-right hq-money-cell"><div class="hq-money-wrap">${renderCurrencyAmount(unitPriceText)}</div></td>
          <td class="hq-right hq-money-cell"><div class="hq-money-wrap">${renderCurrencyAmount(amountText)}</div></td>
        </tr>
      `;
    })
    .join("");
};

const renderHqPackingRows = (items: InvoicePackingPayload["items"]) => {
  const rowCount = 14;
  const totalItems = items.length;
  const rows = Array.from({ length: rowCount }, (_, index) => items[index] ?? null);

  return rows
    .map((item, index) => {
      if (!item) {
        return `
          <tr>
            <td class="hq-center"></td>
            <td></td>
            <td></td>
            <td class="hq-center"></td>
            <td class="hq-right"></td>
            <td class="hq-center"></td>
            <td class="hq-right"></td>
            <td class="hq-right"></td>
            <td class="hq-right"></td>
          </tr>
        `;
      }

      const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
      const palletCount = Number.isFinite(item.palletCount) ? item.palletCount : 0;
      const totalWeight = Number.isFinite(item.totalWeight) ? item.totalWeight : 0;
      const marks = totalItems ? `${index + 1}/${totalItems}` : `${index + 1}`;

      return `
        <tr>
          <td class="hq-center">${safeText(marks)}</td>
          <td class="hq-desc">${safeText(item.partName || item.partNo)}</td>
          <td class="hq-center">${safeText(item.poNo)}</td>
          <td class="hq-center">${safeText(item.unit)}</td>
          <td class="hq-right">${formatQuantity(quantity)}</td>
          <td class="hq-center">${formatPackaging(item.packaging, item.unit)}</td>
          <td class="hq-right">${formatBoxesCount(quantity, item.packaging)}</td>
          <td class="hq-right">${formatNumber(palletCount, 0)}</td>
          <td class="hq-right">${formatWeightKg(totalWeight)}</td>
        </tr>
      `;
    })
    .join("");
};

const renderHqInvoicePreviewHtml = (payload: InvoicePackingPayload) => {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const totalAmount = items.reduce(
    (sum, item) => sum + (Number.isFinite(item.quantity * item.unitPrice) ? item.quantity * item.unitPrice : 0),
    0,
  );
  const invoiceNo = safeText(payload.invoiceNo ?? "");
  const invoiceDate = safeText(payload.invoiceDate);
  const incotermLine = safeText(resolveHqIncotermLine(HQ_DESTINATION_COUNTRY));

  return `<!DOCTYPE html>
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="page hq-page">
        <div class="title hq-title">INVOICE</div>
        <div class="meta-top hq-meta-top"><span>インボイス作成日 (Date): ${invoiceDate}</span></div>

        ${renderHqTopSection(invoiceNo)}

        <table class="hq-items-table">
          <colgroup>
            <col style="width: 8%;" />
            <col style="width: 35%;" />
            <col style="width: 11%;" />
            <col style="width: 6%;" />
            <col style="width: 7%;" />
            <col style="width: 11%;" />
            <col style="width: 22%;" />
          </colgroup>
          <thead>
            <tr>
              <th><span class="hq-header-ja">ラベル内容</span><span class="hq-header-en">(Marks &amp; Nos.)</span></th>
              <th><span class="hq-header-ja">内容品の記載</span><span class="hq-header-en">(Description)</span></th>
              <th><span class="hq-header-ja">注文書No</span><span class="hq-header-en">PO No</span></th>
              <th><span class="hq-header-ja">単位</span><span class="hq-header-en">(Unit)</span></th>
              <th><span class="hq-header-ja">数量</span><span class="hq-header-en">(Quantity)</span></th>
              <th><span class="hq-header-ja">単価</span><span class="hq-header-en">(Unit Price)</span></th>
              <th><span class="hq-header-ja">合計</span><span class="hq-header-en">(Total Amount)</span></th>
            </tr>
          </thead>
          <tbody>
            ${renderHqInvoiceRows(items)}
            <tr class="hq-invoice-total-row">
              <td colspan="5" class="hq-invoice-total-label">合計 （Total）</td>
              <td></td>
              <td class="hq-right hq-money-cell"><div class="hq-money-wrap">${renderCurrencyAmount(formatHqAmount(totalAmount))}</div></td>
            </tr>
          </tbody>
        </table>

        <div class="hq-footer">
          <div class="hq-footer-left">
            <div class="hq-footer-origin">原産国 (Country of Origin) : ${safeText(shipperInfo.countryOfOrigin)}</div>
            <div class="hq-footer-incoterm">${incotermLine}</div>
          </div>
          <div class="hq-footer-signature">署名 ( Signature )</div>
        </div>
      </div>
    </body>
  </html>`;
};

const renderHqPackingListPreviewHtml = (payload: InvoicePackingPayload) => {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const invoiceNo = safeText(payload.invoiceNo ?? "");
  const invoiceDate = safeText(payload.invoiceDate);
  const totalBoxes = items.reduce((sum, item) => sum + calculateBoxesCount(item.quantity, item.packaging), 0);
  const totalPallets = items.reduce((sum, item) => sum + (Number.isFinite(item.palletCount) ? item.palletCount : 0), 0);
  const totalGrossWeight = items.reduce(
    (sum, item) => sum + (Number.isFinite(item.totalWeight) ? item.totalWeight : 0),
    0,
  );
  const incotermLine = safeText(resolveHqIncotermLine(HQ_DESTINATION_COUNTRY));
  const normalizeUnit = (value?: string | null) => (value ?? "").trim().toLowerCase();
  const sumQuantityForUnits = (unitKeys: string[]) =>
    items.reduce((sum, item) => {
      const key = normalizeUnit(item.unit);
      if (!unitKeys.includes(key)) {
        return sum;
      }
      return sum + (Number.isFinite(item.quantity) ? item.quantity : 0);
    }, 0);
  const qtyPcs = sumQuantityForUnits(["pc", "pcs", "piece", "pieces"]);
  const qtyM = sumQuantityForUnits(["m", "meter", "meters"]);
  const qtyBag = sumQuantityForUnits(["bag", "bags"]);
  const qtyRoll = sumQuantityForUnits(["roll", "rolls"]);

  return `<!DOCTYPE html>
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="page hq-page">
        <div class="title hq-title">PACKING LIST</div>
        <div class="meta-top hq-meta-top"><span>Date: ${invoiceDate}</span></div>

        ${renderHqTopSection(invoiceNo)}

        <table class="hq-items-table hq-packing-table">
          <colgroup>
            <col style="width: 8%;" />
            <col style="width: 32%;" />
            <col style="width: 9%;" />
            <col style="width: 8%;" />
            <col style="width: 9%;" />
            <col style="width: 10%;" />
            <col style="width: 9%;" />
            <col style="width: 8%;" />
            <col style="width: 7%;" />
          </colgroup>
          <thead>
            <tr>
              <th><span class="hq-header-ja">ラベル内容</span><span class="hq-header-en">(Marks &amp; Nos.)</span></th>
              <th><span class="hq-header-ja">内容品の記載</span><span class="hq-header-en">(Description)</span></th>
              <th><span class="hq-header-ja">注文書No</span><span class="hq-header-en">PO No</span></th>
              <th><span class="hq-header-ja">単位</span><span class="hq-header-en">(Unit)</span></th>
              <th><span class="hq-header-ja">数量</span><span class="hq-header-en">(Quantity)</span></th>
              <th><span class="hq-header-ja">梱包</span><span class="hq-header-en">(Packing)</span></th>
              <th><span class="hq-header-ja">箱数</span><span class="hq-header-en">(Number of Boxs)</span></th>
              <th><span class="hq-header-ja">パレット数</span><span class="hq-header-en">(Number of Pallets)</span></th>
              <th><span class="hq-header-ja">総重量</span><span class="hq-header-en">(Gross Weight)</span></th>
            </tr>
          </thead>
          <tbody>
            ${renderHqPackingRows(items)}
            <tr class="hq-packing-summary-row">
              <td colspan="4" rowspan="3" class="hq-packing-summary-label">合計 （Total）</td>
              <td class="hq-packing-summary-qty">${formatNumber(qtyPcs, 0)} pcs</td>
              <td rowspan="3" class="hq-packing-summary-pack"></td>
              <td class="hq-packing-summary-box">${formatNumber(totalBoxes, 0)} Boxs</td>
              <td rowspan="3" class="hq-packing-summary-pallet">${formatNumber(totalPallets, 0)} pallet</td>
              <td rowspan="3" class="hq-packing-summary-gross">${formatWeightKg(totalGrossWeight)}</td>
            </tr>
            <tr class="hq-packing-summary-row">
              <td class="hq-packing-summary-qty">${formatNumber(qtyM, 0)} m</td>
              <td class="hq-packing-summary-box">${formatNumber(qtyRoll, 0)} Roll</td>
            </tr>
            <tr class="hq-packing-summary-row">
              <td class="hq-packing-summary-qty">${formatNumber(qtyBag, 0)} bag</td>
              <td class="hq-packing-summary-box"></td>
            </tr>
          </tbody>
        </table>

        <div class="hq-packing-footer">
          <div class="hq-packing-footer-incoterm">${incotermLine}</div>
          <div class="hq-packing-footer-row">
            <div>郵便物の個数 (Number of pieces, m) :</div>
            <div class="hq-packing-footer-values">
              <span>${formatNumber(qtyPcs, 0)} pcs</span>
              <span>${formatNumber(qtyM, 0)} m</span>
              <span>${formatNumber(qtyBag, 0)} bag</span>
            </div>
            <div class="hq-packing-footer-signature">署名 ( Signature )</div>
          </div>
          <div class="hq-packing-footer-row">
            <div>総重量 (Gross weight) Kg :</div>
            <div class="hq-packing-footer-values">
              <span>${formatWeightKg(totalGrossWeight)}</span>
              <span>${formatNumber(totalPallets, 0)} Pallets</span>
            </div>
            <div></div>
          </div>
          <div class="hq-packing-footer-row">
            <div>原産国(Country of Origin) :${safeText(shipperInfo.countryOfOrigin)}</div>
            <div class="hq-packing-footer-values">
              <span>CBM</span>
            </div>
            <div></div>
          </div>
          <div class="hq-packing-footer-row">
            <div>輸送方法 (Shipped per) : SEA</div>
            <div></div>
            <div></div>
          </div>
        </div>
      </div>
    </body>
  </html>`;
};

export const renderInvoicePreviewHtml = (payload: InvoicePackingPayload) => {
  if (isHqTemplate(payload)) {
    return renderHqInvoicePreviewHtml(payload);
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const destination = safeText(payload.destinationCountry);
  const invoiceNo = safeText(payload.invoiceNo ?? "");
  const invoiceDate = safeText(payload.invoiceDate);

  return `<!DOCTYPE html>
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="page">
        <div class="title">INVOICE</div>
        <div class="meta-top"><span>インボイス作成日 (Date): ${invoiceDate}</span></div>

        ${renderSharedTopSection(payload, invoiceNo, destination)}

        <table class="items-table invoice-items-table">
          <colgroup>
            <col style="width: 4%" />
            <col style="width: 12%" />
            <col style="width: 24%" />
            <col style="width: 14%" />
            <col style="width: 6%" />
            <col style="width: 8%" />
            <col style="width: 9%" />
            <col style="width: 13%" />
          </colgroup>
          <thead>
            <tr>
              <th colspan="2">品番<br/><span class="items-header-sub">(Part No)</span></th>
              <th>品名<br/><span class="items-header-sub">(Part Name)</span></th>
              <th>注文書No<br/>PO No</th>
              <th>単位<br/><span class="items-header-sub">(Unit)</span></th>
              <th>数量<br/><span class="items-header-sub">(Quantity)</span></th>
              <th>単価<br/><span class="items-header-sub">(Unit Price)</span><br/>USD</th>
              <th>合計<br/><span class="items-header-sub">(Total Amount)</span><br/>USD</th>
            </tr>
          </thead>
          <tbody>
            ${renderInvoiceRows(items)}
            <tr>
              <td colspan="7" class="text-center"><strong>合計 (Total)</strong></td>
              <td class="text-right"><strong>${formatNumber(totalAmount)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="footers">
          <div><span class="label">Terms:</span> ${safeText(shipperInfo.terms)}</div>
          <div><span class="label">署名 (Signature)</span></div>
        </div>
        <div class="footers">
          <div><span class="label">原産国 (Country of Origin):</span> ${safeText(shipperInfo.countryOfOrigin)}</div>
          <div></div>
        </div>
      </div>
    </body>
  </html>`;
};

const renderPackingRows = (items: InvoicePackingPayload["items"]) => {
  const rowCount = 18;
  const rows = Array.from({ length: rowCount }, (_, index) => items[index] ?? null);
  return rows
    .map((item, index) => {
      if (!item) {
        return `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        `;
      }
      const boxesCount = formatBoxesCount(item.quantity, item.packaging);
      const netWeight = formatWeightKg(0);
      const grossWeight = formatWeightKg(item.totalWeight);
      return `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${safeText(item.partNo)}</td>
          <td>${safeText(item.partName)}</td>
          <td class="text-center">${safeText(item.poNo)}</td>
          <td class="text-center">${safeText(item.unit)}</td>
          <td class="text-center">${formatQuantity(item.quantity)}</td>
          <td class="text-center">${formatPackaging(item.packaging, item.unit)}</td>
          <td class="text-center">${boxesCount}</td>
          <td class="text-center">${formatNumber(item.palletCount, 0)}</td>
          <td class="text-center">${netWeight}</td>
          <td class="text-center">${grossWeight}</td>
        </tr>
      `;
    })
    .join("");
};

export const renderPackingListPreviewHtml = (payload: InvoicePackingPayload) => {
  if (isHqTemplate(payload)) {
    return renderHqPackingListPreviewHtml(payload);
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const invoiceNo = safeText(payload.invoiceNo ?? "");
  const destination = safeText(payload.destinationCountry);
  const invoiceDate = safeText(payload.invoiceDate);
  const totalQuantity = items.reduce((sum, item) => sum + (Number.isFinite(item.quantity) ? item.quantity : 0), 0);
  const totalBoxes = items.reduce((sum, item) => sum + calculateBoxesCount(item.quantity, item.packaging), 0);
  const totalPallets = items.reduce((sum, item) => sum + (Number.isFinite(item.palletCount) ? item.palletCount : 0), 0);
  const totalGrossWeight = items.reduce(
    (sum, item) => sum + (Number.isFinite(item.totalWeight) ? item.totalWeight : 0),
    0,
  );
  const estimatedCbm = totalPallets * 1.6683;

  return `<!DOCTYPE html>
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="page">
        <div class="title">PACKING LIST</div>
        <div class="meta-top"><span>Date: ${invoiceDate}</span></div>

        ${renderSharedTopSection(payload, invoiceNo, destination)}

        <table class="items-table packing-items-table">
          <colgroup>
            <col style="width: 4%" />
            <col style="width: 18%" />
            <col style="width: 18%" />
            <col style="width: 11%" />
            <col style="width: 4%" />
            <col style="width: 6%" />
            <col style="width: 9%" />
            <col style="width: 6%" />
            <col style="width: 8%" />
            <col style="width: 8%" />
            <col style="width: 8%" />
          </colgroup>
          <thead>
            <tr>
              <th colspan="2">品番<br/><span class="items-header-sub">(Part No)</span></th>
              <th>品名<br/><span class="items-header-sub">(Part Name)</span></th>
              <th>注文書No<br/>PO No</th>
              <th>単位<br/><span class="items-header-sub">(Unit)</span></th>
              <th>数量<br/><span class="items-header-sub">(Quantity)</span></th>
              <th>梱包<br/><span class="items-header-sub">(Packing)</span></th>
              <th>箱数<br/><span class="items-header-sub">(Number of Boxs)</span></th>
              <th>パレット数<br/><span class="items-header-sub">(Number of Pallets)</span></th>
              <th>正味重量<br/><span class="items-header-sub">(Net weight)</span></th>
              <th>総重量<br/><span class="items-header-sub">(Gross weight)</span></th>
            </tr>
          </thead>
          <tbody>
            ${renderPackingRows(items)}
            <tr class="packing-total-row">
              <td colspan="5" class="packing-total-label">合計 （Total）</td>
              <td class="packing-total-value">${formatNumber(totalQuantity, 0)} pcs</td>
              <td></td>
              <td class="packing-total-value">${formatNumber(totalBoxes, 0)} Boxs</td>
              <td class="packing-total-value">${formatNumber(totalPallets, 0)} Pallets</td>
              <td class="packing-total-value">${formatWeightKg(0)}</td>
              <td class="packing-total-value">${formatWeightKg(totalGrossWeight)}</td>
            </tr>
            <tr>
              <td colspan="11" class="packing-footer-origin-cell">原産国 (Country of Origin) : ${safeText(shipperInfo.countryOfOrigin)}</td>
            </tr>
            <tr>
              <td colspan="11" class="packing-footer-body-cell">
                <div class="packing-footer-layout">
                  <div class="packing-footer-left">
                    <div class="packing-footer-row">
                      <span>郵便物の個数 ( Number of pieces) :</span>
                      <span class="packing-footer-value">${formatNumber(totalQuantity, 0)} pcs</span>
                    </div>
                    <div class="packing-footer-row">
                      <span>総重量 (Gross weight) Kg :</span>
                      <span class="packing-footer-value">${formatWeightKg(totalGrossWeight)}</span>
                    </div>
                    <div class="packing-footer-row">
                      <span>原産国 (Country of Origin) :${safeText(shipperInfo.countryOfOrigin)}</span>
                      <span class="packing-footer-value">${formatFixedNumber(estimatedCbm, 2)} CBM</span>
                    </div>
                    <div class="packing-footer-row">
                      <span>輸送方法 ( Shipped pei) : SEA</span>
                      <span class="packing-footer-value"></span>
                    </div>
                  </div>
                  <div class="packing-footer-signature">署名 ( Singnature )</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </body>
  </html>`;
};
