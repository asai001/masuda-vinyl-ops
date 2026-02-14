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
  .items-table th, .items-table td { border: 1px solid #111111; padding: 3px 4px; font-size: 11px; }
  .items-table th { text-align: center; font-weight: 700; }
  .items-table td { height: 20px; }
  .invoice-items-table th, .invoice-items-table td { text-align: center; }
  .invoice-items-table .text-right { text-align: center; }
  .invoice-items-table .items-header-sub { font-size: 10px; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .footers { display: flex; justify-content: space-between; margin-top: 10px; font-size: 11px; }
  .footers .label { font-weight: 700; }
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

export const renderInvoicePreviewHtml = (payload: InvoicePackingPayload) => {
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
            <td class="text-right"></td>
            <td class="text-right"></td>
            <td class="text-right"></td>
            <td class="text-right"></td>
          </tr>
        `;
      }
      return `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${safeText(item.partNo)}</td>
          <td>${safeText(item.partName)}</td>
          <td class="text-center">${safeText(item.poNo)}</td>
          <td class="text-center">${safeText(item.unit)}</td>
          <td class="text-right">${formatQuantity(item.quantity)}</td>
          <td class="text-center">${formatPackaging(item.packaging, item.unit)}</td>
          <td class="text-right">${formatNumber(item.palletCount, 0)}</td>
          <td class="text-right">${formatNumber(item.totalWeight)}</td>
        </tr>
      `;
    })
    .join("");
};

export const renderPackingListPreviewHtml = (payload: InvoicePackingPayload) => {
  const items = Array.isArray(payload.items) ? payload.items : [];
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
        <div class="title">PACKING LIST</div>
        <div class="meta-top"><span>Date: ${invoiceDate}</span></div>

        <table class="info-table">
          <tr>
            <td class="info-left-cell">
              <div class="block">
                <div class="block-title">依頼主 (Shipper Address)</div>
                <div class="block-body">
                  <div class="shipper-name">${safeText(shipperInfo.name)}</div>
                  ${shipperInfo.lines.map((line) => `<div>${safeText(line)}</div>`).join("")}
                  <div>TEL: ${safeText(shipperInfo.tel)}</div>
                  <div>FAX: ${safeText(shipperInfo.fax)}</div>
                </div>
              </div>
              <div class="block">
                <div class="block-title">荷受人 (Consignee)</div>
                <div class="block-body">
                  <div class="shipper-name">${safeText(payload.consigneeName)}</div>
                  <div>${safeText(payload.consigneeAddress)}</div>
                  <div>TEL: ${safeText(payload.consigneeTel)}</div>
                  <div>TAX ID: ${safeText(payload.consigneeTaxId)}</div>
                </div>
              </div>
              <div class="block">
                <table class="fromto-table">
                  <tr>
                    <td class="fromto-label">From (発地国)</td>
                    <td class="fromto-line"></td>
                  </tr>
                  <tr>
                    <td colspan="2" class="fromto-value">${safeText(shipperInfo.countryOfOrigin)}</td>
                  </tr>
                  <tr>
                    <td class="fromto-label">To (着地国)</td>
                    <td class="fromto-line"></td>
                  </tr>
                  <tr>
                    <td colspan="2" class="fromto-value">${safeText(payload.destinationCountry)}</td>
                  </tr>
                </table>
              </div>
            </td>
            <td class="info-right-cell">
              <table class="right-top-table">
                <tr>
                  <td>
                    <div class="right-cell-title">Invoice No</div>
                    <div class="right-cell-value">${invoiceNo}</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="right-cell-title">Template</div>
                    <div class="right-cell-value">${payload.templateType === "hq" ? "HQ" : "CLIENT"}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table class="items-table">
          <colgroup>
            <col style="width: 4%" />
            <col style="width: 12%" />
            <col style="width: 24%" />
            <col style="width: 14%" />
            <col style="width: 6%" />
            <col style="width: 8%" />
            <col style="width: 14%" />
            <col style="width: 9%" />
            <col style="width: 9%" />
          </colgroup>
          <thead>
            <tr>
              <th>No</th>
              <th>品番<br/>(Part No)</th>
              <th>品名<br/>(Part Name)</th>
              <th>注文書No<br/>PO No</th>
              <th>単位<br/>(Unit)</th>
              <th>数量<br/>(Quantity)</th>
              <th>入数<br/>(Packaging)</th>
              <th>パレット<br/>(Pallet)</th>
              <th>重量<br/>(Weight)</th>
            </tr>
          </thead>
          <tbody>
            ${renderPackingRows(items)}
          </tbody>
        </table>
      </div>
    </body>
  </html>`;
};
