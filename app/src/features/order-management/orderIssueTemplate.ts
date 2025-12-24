export type PdfLineItem = {
  name: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  deliveryDate: string;
  amount: string;
};

export type OrderIssuePdfPayload = {
  orderNumber: string;
  issueDate: string;
  supplierName: string;
  supplierAddressLine1: string;
  supplierAddressLine2: string;
  supplierPhone: string;
  lineItems: PdfLineItem[];
  amountLabel: string;
  note: string;
};

export type PdfFontSources = {
  jpRegular: string;
  jpBold: string;
  vnRegular: string;
  vnBold: string;
};

export const issuerInfo = {
  name: "MASUDA VINYL VIETNAM",
  addressLines: ["Lô I Đồng vàng, Khu công nghiệp Đình Trám, Phường Nếnh, Tỉnh Bắc Ninh"],
  phone: "0240-3662-7777",
} as const;

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const renderOrderIssueHtml = (payload: OrderIssuePdfPayload, fonts: PdfFontSources) => {
  const safe = (value: string) => escapeHtml(value);
  const rows = Array.from({ length: 9 }, (_, index) => payload.lineItems[index] ?? null);
  const rowsHtml = rows
    .map((row, index) => {
      const rowNumber = row ? String(index + 1) : "";
      return `
        <tr class="table-row">
          <td class="text-center">${rowNumber}</td>
          <td>${row ? safe(row.name) : ""}</td>
          <td class="text-center">${row ? safe(row.unit) : ""}</td>
          <td class="text-right">${row ? safe(row.quantity) : ""}</td>
          <td class="text-right">${row ? safe(row.unitPrice) : ""}</td>
          <td class="text-center">${row ? safe(row.deliveryDate) : ""}</td>
          <td class="text-right">${row ? safe(row.amount) : ""}</td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <title>order-${safe(payload.orderNumber)}</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; background: #ffffff; font-family: "NotoSerifJP", "NotoSerif", serif; color: #111111; font-size: 14px; }
        @media screen { html, body { width: 210mm; height: 297mm; overflow: hidden; } }
        @font-face { font-family: "NotoSerifJP"; src: url("${fonts.jpRegular}") format("truetype"); font-weight: 400; font-style: normal; }
        @font-face { font-family: "NotoSerifJP"; src: url("${fonts.jpBold}") format("truetype"); font-weight: 700; font-style: normal; }
        @font-face { font-family: "NotoSerif"; src: url("${fonts.vnRegular}") format("truetype"); font-weight: 400; font-style: normal; }
        @font-face { font-family: "NotoSerif"; src: url("${fonts.vnBold}") format("truetype"); font-weight: 700; font-style: normal; }
        .vn { font-family: "NotoSerif", "NotoSerifJP", serif; font-size: 12px; font-weight: 400; }
        .content { width: 94%; margin-left: auto; margin-right: auto; }
        .title-row { display: flex; justify-content: center; margin-top: 12px }
        .title-center { text-align: center; }
        .title-main { font-size: 28px; font-weight: 700; }
        .title-sub { font-size: 20px; letter-spacing: 1px; }
        .meta-block { text-align: right; line-height: 1.2; margin-bottom: 32px; }
        .address-row { display: flex; margin-top: 10px; line-height: 1.25 }
        .address-left { flex: 6; padding-right: 12px; margin-top: 32px; font-size: 14px; }
        .address-right { flex: 4; text-align: left; padding-left: 0; font-size: 14px; display: flex; flex-direction: column; }
        .line { padding-bottom: 2px; margin-bottom: 2px; }
        .recipient-name { font-size: 16px; font-weight: 900; }
        .note { margin-top: -16px; font-size: 14px; }
        .note-sub { font-size: 12px; }
        .table { margin-top: 20px; width: 100%; border-collapse: collapse; }
        .table th, .table td { border: 1.4px solid #111111; padding: 2px; vertical-align: middle; }
        .table thead tr { height: 64px; }
        .table tbody tr { height: 40px; }
        .table th { height: 64px; text-align: center; font-weight: 700; }
        .table td { height: 40px; text-align: center; }
        .header-sub { font-size: 12px; font-weight: 400; }
        .table thead th > div:first-child { font-weight: 900; }
        .subtotal-row td:first-child > div:first-child { font-weight: 900; }
        .total-row td:first-child > div:first-child { font-weight: 900; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .note-row td { height: 48px; padding: 4px 3px; font-size: 14px; vertical-align: top; text-align: left; }
        .table tbody tr.note-row { height: 48px; }
        .note-label { text-align: center; }
        .note-row td > div:first-child { font-weight: 900; }
        .note-row td > div:last-child { font-weight: 400; }
        .note-value { white-space: pre-wrap; line-height: 1.4; font-weight: 400; }
        .issuer-address { font-size: 14px; font-weight: 400; }
        .stamp { margin-top: 40px; margin-right: 80px; text-align: right; }
        .stamp-table { width: 192px; border-collapse: collapse; margin-left: auto; border: 1px solid #111111; table-layout: fixed; }
        .stamp-table th, .stamp-table td { border: 1px solid #111111; text-align: center; vertical-align: middle; width: 96px; }
        .stamp-table thead tr { height: 48px; }
        .stamp-table tbody tr { height: 72px; }
        .stamp-table th { font-size: 12px; font-weight: 600; }
        .table-row { height: 40px; }
      </style>
    </head>
    <body>
      <div class="content">
        <div class="title-row">
          <div class="title-center">
            <div class="title-main">注文書</div>
            <div class="title-sub vn">ĐƠN ĐẶT HÀNG</div>
          </div>
        </div>
        <div class="address-row">
          <div class="address-left">
          <div class="line recipient-name"><strong>${safe(payload.supplierName)}</strong> 御中</div>
          <div class="line">Add: ${safe(payload.supplierAddressLine1)}</div>
          ${payload.supplierAddressLine2 ? `<div class="line">${safe(payload.supplierAddressLine2)}</div>` : ""}
          <div class="line">Tel : ${safe(payload.supplierPhone)}</div>
        </div>
        <div class="address-right">
          <div class="meta-block">
            <div><strong>注番:</strong> ${safe(payload.orderNumber)}</div>
            <div class="vn">Mã đặt hàng:</div>
            <div>${safe(payload.issueDate)}</div>
          </div>
          <div class="line"><strong>${safe(issuerInfo.name)}</strong></div>
          ${issuerInfo.addressLines.map((line) => `<div class="line vn issuer-address">${safe(line)}</div>`).join("")}
          <div class="line">TELL: ${safe(issuerInfo.phone)}</div>
        </div>
      </div>

      <div class="note">下記の事項に注文致します。宜しくお願いします。</div>
      <div class="note-sub vn">Chúng tôi xác nhận đặt hàng theo danh mục các mặt hàng bên dưới.</div>

      <table class="table">
        <colgroup>
          <col style="width: 7%" />
          <col style="width: 30%" />
          <col style="width: 8%" />
          <col style="width: 12%" />
          <col style="width: 12%" />
          <col style="width: 14%" />
          <col style="width: 17%" />
        </colgroup>
        <thead>
          <tr>
            <th>No.</th>
            <th>
              <div>品名/規格</div>
              <div class="header-sub vn">Tên sản phẩm/Quy cách</div>
            </th>
            <th>
              <div>単位</div>
              <div class="header-sub vn">Đơn vị</div>
            </th>
            <th>
              <div>数量</div>
              <div class="header-sub vn">Số lượng</div>
            </th>
            <th>
              <div>単価</div>
              <div class="header-sub vn">Đơn giá</div>
            </th>
            <th>
              <div>希望納期</div>
              <div class="header-sub vn">Ngày giao</div>
            </th>
            <th>
              <div>金額</div>
              <div class="header-sub vn">Số tiền (VND)</div>
            </th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr class="subtotal-row">
            <td class="text-center" colspan="6"><div>小計(税抜)</div><div class="vn">Tổng trước thuế</div></td>
            <td class="text-right">${safe(payload.amountLabel)}</td>
          </tr>
          <tr>
            <td class="text-center" colspan="6">VAT %</td>
            <td class="text-right">-</td>
          </tr>
          <tr class="total-row">
            <td class="text-center" colspan="6"><div>合計(税込)</div><div class="vn">Tổng sau thuế</div></td>
            <td class="text-right"><strong>${safe(payload.amountLabel)}</strong></td>
          </tr>
          <tr class="note-row">
            <td class="note-label" colspan="7"><div>※摘要</div><div>${safe(payload.note)}</div></td>
          </tr>
        </tbody>
      </table>

      <div class="stamp">
        <table class="stamp-table">
          <thead>
            <tr>
              <th>Vice Director</th>
              <th>GM</th>
            </tr>
          </thead>
          <tbody>
            <tr>
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
