import type { OrderIssueExcelLineItem, OrderIssueExcelPayload } from "@/features/order-management/orderIssueExcel";

export type OrderIssuePreviewPayload = OrderIssueExcelPayload & {
  note?: string;
  issuerName?: string;
  issuerAddress?: string;
  issuerPhone?: string;
  issuerFax?: string;
};

const USD_CURRENCY_CODE = "USD";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safeText = (value?: string | null) => escapeHtml((value ?? "").trim());

const safeMultilineText = (value?: string | null) => safeText(value).replace(/\r?\n/g, "<br />");

const buildIssuerContactLine = (phone?: string | null, fax?: string | null) => {
  const phoneText = (phone ?? "").trim();
  const faxText = (fax ?? "").trim();
  const parts: string[] = [];
  if (phoneText) {
    parts.push(`TELL: ${phoneText}`);
  }
  if (faxText) {
    parts.push(`FAX: ${faxText}`);
  }
  return parts.join(" ");
};

const formatNumber = (value: number, digits = 0) => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const formatMoney = (value: number, currency: string) => {
  const normalizedCurrency = currency.trim();
  const digits = normalizedCurrency.toUpperCase() === USD_CURRENCY_CODE ? 2 : 0;
  const formatted = formatNumber(value, digits);
  if (!normalizedCurrency) {
    return formatted;
  }
  return `${formatted} ${normalizedCurrency}`;
};

const toDisplayDate = (value?: string | null) => {
  const raw = (value ?? "").trim();
  if (!raw) {
    return "";
  }
  const normalized = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (normalized) {
    const [, year, month, day] = normalized;
    return `${day}/${month}/${year}`;
  }
  const dayMonth = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dayMonth) {
    return raw;
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    return raw;
  }
  const date = new Date(parsed);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const resolvePreviewRowCount = (lineItemCount: number) => {
  if (lineItemCount >= 13) {
    return 17;
  }
  if (lineItemCount >= 8) {
    return 12;
  }
  return 7;
};

const renderRows = (lineItems: OrderIssueExcelLineItem[], rowCount: number, currency: string) =>
  Array.from({ length: rowCount }, (_, index) => lineItems[index] ?? null)
    .map((item, index) => {
      if (!item) {
        return `
          <tr class="line-row">
            <td>${index + 1}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        `;
      }
      const amount = item.quantity * item.unitPrice;
      return `
        <tr class="line-row">
          <td>${index + 1}</td>
          <td>${safeText(item.name)}</td>
          <td>${safeText(item.unit)}</td>
          <td>${safeText(formatNumber(item.quantity, 0))}</td>
          <td>${safeText(formatMoney(item.unitPrice, currency))}</td>
          <td>${safeText(toDisplayDate(item.deliveryDate))}</td>
          <td>${safeText(formatMoney(amount, currency))}</td>
        </tr>
      `;
    })
    .join("");

export const renderOrderIssuePreviewHtml = (payload: OrderIssuePreviewPayload) => {
  const safeCurrency = (payload.currency ?? "").trim();
  const rowCount = resolvePreviewRowCount(payload.lineItems.length);
  const outputItems = payload.lineItems.slice(0, rowCount);
  const subtotal = outputItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const amountLabel = formatMoney(subtotal, safeCurrency);
  const issuerName = (payload.issuerName ?? "").trim();
  const issuerAddress = safeMultilineText(payload.issuerAddress);
  const issuerContactLine = buildIssuerContactLine(payload.issuerPhone, payload.issuerFax);

  return `<!DOCTYPE html>
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; overflow-x: hidden; background: #f3f4f6; color: #111111; font-family: "NotoSerifJP", "NotoSerif", serif; }
        @font-face { font-family: "NotoSerifJP"; src: url("/fonts/NotoSerifJP-Regular.ttf") format("truetype"); font-weight: 400; font-style: normal; }
        @font-face { font-family: "NotoSerifJP"; src: url("/fonts/NotoSerifJP-Bold.ttf") format("truetype"); font-weight: 700; font-style: normal; }
        @font-face { font-family: "NotoSerif"; src: url("/fonts/NotoSerif-Regular.ttf") format("truetype"); font-weight: 400; font-style: normal; }
        @font-face { font-family: "NotoSerif"; src: url("/fonts/NotoSerif-Bold.ttf") format("truetype"); font-weight: 700; font-style: normal; }
        .vn { font-family: "NotoSerif", "NotoSerifJP", serif; }
        .page { width: 580px; min-height: 297mm; margin: 8px auto; background: #ffffff; padding: 10mm 8mm; }
        .title { text-align: center; margin-top: 3mm; line-height: 1.2; }
        .title-main { font-size: 18px; font-weight: 700; letter-spacing: 1px; }
        .title-sub { font-size: 14px; font-weight: 400; letter-spacing: 0.8px; }
        .header-row { display: flex; gap: 7mm; margin-top: 6mm; }
        .supplier-block { flex: 1; min-width: 0; margin-top: 10mm; }
        .issuer-block { width: 43%; min-width: 0; display: flex; flex-direction: column; gap: 1mm; }
        .meta-box { margin-left: auto; width: 44mm; text-align: center; margin-bottom: 5mm; line-height: 1.2; }
        .meta-order-no { font-size: 9px; font-weight: 700; }
        .meta-order-code { font-size: 11px; font-weight: 700; }
        .meta-order-label { display: inline-block; margin-top: 2mm; padding: 0 3mm 1px; border-bottom: 1px solid #111111; font-size: 9px; font-weight: 700; }
        .meta-date { font-size: 10px; margin-top: 2mm; }
        .supplier-name { font-size: 14px; font-weight: 700; text-decoration: underline; overflow-wrap: anywhere; word-break: break-word; }
        .text-line { font-size: 10px; line-height: 1.35; overflow-wrap: anywhere; word-break: break-word; }
        .issuer-name { font-size: 12px; font-weight: 700; margin-top: 2mm; overflow-wrap: anywhere; word-break: break-word; }
        .description { margin: 6mm 1mm 4mm; line-height: 1.45; font-size: 10px; }
        .description .vn { display: block; margin-top: 2mm; }
        table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        .items-table { width: 92%; margin: 0 auto; border: 1.4px solid #111111; }
        .items-table th, .items-table td { border: 1px solid #111111; text-align: center; vertical-align: middle; padding: 1px 2px; font-size: 10px; }
        .items-table thead th { height: 28px; line-height: 1.2; font-weight: 700; }
        .items-table thead .sub { font-size: 9px; font-weight: 400; }
        .line-row td { height: 20px; }
        .summary-row td { height: 26px; }
        .summary-row .label { font-weight: 700; }
        .summary-row .amount { text-align: right; padding-right: 8px; font-weight: 700; }
        .vat-row td { height: 22px; }
        .memo-row td { height: 48px; text-align: left; vertical-align: top; padding: 4px 8px; font-size: 9px; }
        .stamp-wrap { width: 92%; margin: 6mm auto 0; display: flex; justify-content: flex-end; }
        .stamp-table { width: 90mm; border: 1px solid #111111; }
        .stamp-table th, .stamp-table td { border: 1px solid #111111; width: 30mm; text-align: center; vertical-align: middle; }
        .stamp-table th { height: 28px; font-size: 10px; font-weight: 700; }
        .stamp-table td { height: 64px; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="title">
          <div class="title-main">注文書</div>
          <div class="title-sub vn">ĐƠN ĐẶT HÀNG</div>
        </div>
        <div class="header-row">
          <div class="supplier-block">
            <div class="supplier-name">${safeText(payload.supplierName)} 御中</div>
            <div class="text-line">ĐC: ${safeText(payload.supplierAddress)}</div>
            <div class="text-line">To: ${safeText(payload.supplierContact)}</div>
          </div>
          <div class="issuer-block">
            <div class="meta-box">
              <div class="meta-order-no">注番: <span class="meta-order-code">${safeText(payload.orderNumber)}</span></div>
              <div class="meta-order-label vn">Mã đặt hàng:</div>
              <div class="meta-date">${safeText(toDisplayDate(payload.issueDate))}</div>
            </div>
            <div class="issuer-name">${safeText(issuerName)}</div>
            ${issuerAddress ? `<div class="text-line vn">${issuerAddress}</div>` : ""}
            ${issuerContactLine ? `<div class="text-line">${safeText(issuerContactLine)}</div>` : ""}
          </div>
        </div>
        <div class="description">
          <span>下記の事項に注文致します。宜しくお願いします。</span>
          <span class="vn">Chúng tôi xác nhận đặt hàng quý công ty theo danh sách các mặt hàng bên dưới.</span>
        </div>
        <table class="items-table">
          <colgroup>
            <col style="width: 4.5%;" />
            <col style="width: 30.5%;" />
            <col style="width: 7.5%;" />
            <col style="width: 11.5%;" />
            <col style="width: 14.5%;" />
            <col style="width: 14.5%;" />
            <col style="width: 17%;" />
          </colgroup>
          <thead>
            <tr>
              <th>№</th>
              <th>品 名<br/><span class="sub vn">Tên sản phẩm</span></th>
              <th>単位<br/><span class="sub vn">Đơn vị</span></th>
              <th>数 量<br/><span class="sub vn">Số lượng</span></th>
              <th>単価<br/><span class="sub vn">Đơn giá</span></th>
              <th>希望納期<br/><span class="sub vn">Ngày giao hàng</span></th>
              <th>金額<br/><span class="sub vn">Số tiền</span></th>
            </tr>
          </thead>
          <tbody>
            ${renderRows(outputItems, rowCount, safeCurrency)}
            <tr class="summary-row">
              <td class="label" colspan="6">小計(税抜)<br/><span class="vn" style="font-weight:400;">Tổng trước thuế</span></td>
              <td class="amount">${safeText(amountLabel)}</td>
            </tr>
            <tr class="vat-row">
              <td colspan="6">VAT 0%</td>
              <td></td>
            </tr>
            <tr class="summary-row">
              <td class="label" colspan="6">合計(税込)<br/><span class="vn" style="font-weight:400;">Tổng sau thuế</span></td>
              <td class="amount">${safeText(amountLabel)}</td>
            </tr>
            <tr class="memo-row">
              <td colspan="7">※摘要<br/>${safeMultilineText(payload.note)}</td>
            </tr>
          </tbody>
        </table>
        <div class="stamp-wrap">
          <table class="stamp-table">
            <thead>
              <tr>
                <th>承認者<br/><span class="vn" style="font-weight:400;">Xác nhận</span></th>
                <th>確認者<br/><span class="vn" style="font-weight:400;">Kiểm tra</span></th>
                <th>担当者<br/><span class="vn" style="font-weight:400;">Phụ trách</span></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </body>
  </html>`;
};
