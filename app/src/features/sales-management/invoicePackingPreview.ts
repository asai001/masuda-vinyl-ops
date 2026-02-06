import type { InvoicePackingPayload, InvoicePackingTemplate } from "./invoicePackingList";

const shipperInfo = {
  name: "MASUDA VINYL VIETNAM CO.,LTD",
  lines: [
    "LOT NO1 DONG DANG DINH TRAM INDUSTRIAL ZONE",
    "NENH WARD BAC NINH PROVINCE",
  ],
  tel: "0204 3662 777",
  fax: "0204 3662 825",
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
  .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
  .items-table th, .items-table td { border: 1px solid #111111; padding: 3px 4px; font-size: 11px; }
  .items-table th { text-align: center; font-weight: 700; }
  .items-table td { height: 20px; }
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

export const renderInvoicePreviewHtml = (payload: InvoicePackingPayload, templateType: InvoicePackingTemplate) => {
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

        <table class="info-table">
          <tr>
            <td class="info-left-cell">
              <div class="block-title">依頼主 (Shipper Address)</div>
              <div class="block-body">
                <div class="shipper-name">${safeText(shipperInfo.name)}</div>
                ${shipperInfo.lines.map((line) => `<div>${safeText(line)}</div>`).join("")}
                <div>TEL: ${safeText(shipperInfo.tel)}</div>
                <div>FAX: ${safeText(shipperInfo.fax)}</div>
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
                  <td class="tight">
                    <table class="origin-table">
                      <tr>
                        <td class="origin-head">(原産国)<br/>Country of Origin</td>
                        <td class="origin-head">(仕向国名)<br/>Country of Destination</td>
                      </tr>
                      <tr>
                        <td>${safeText(shipperInfo.countryOfOrigin)}</td>
                        <td>${destination}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="info-left-cell">
              <div class="block-title">荷受人 (Consignee)</div>
              <div class="block-body">
                <div class="shipper-name">${safeText(payload.consigneeName)}</div>
                <div>${safeText(payload.consigneeAddress)}</div>
                <div>TEL: ${safeText(payload.consigneeTel)}</div>
                <div>TAX ID: ${safeText(payload.consigneeTaxId)}</div>
              </div>
            </td>
            <td class="info-right-cell">
              <table class="right-middle-table">
                <tr>
                  <td class="right-terms">
                    <div class="block-title">支払条件 (Terms of Payment)</div>
                  </td>
                </tr>
                <tr>
                  <td class="right-note">
                    <div class="block-title">備考 (Remark):</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="info-left-cell">
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
                  <td colspan="2" class="fromto-value">${destination}</td>
                </tr>
              </table>
            </td>
            <td class="info-right-cell">
              <table class="check-table">
                <tr>
                  <td class="check-cell">&#10003;</td>
                  <td>有償 (Commercial Value)</td>
                </tr>
                <tr>
                  <td class="check-cell"></td>
                  <td>無償 (No Commercial Value)</td>
                </tr>
                <tr>
                  <td class="check-cell"></td>
                  <td>贈物 (Gift)</td>
                </tr>
                <tr>
                  <td class="check-cell"></td>
                  <td>商品見本 (Sample, No Commercial Value)</td>
                </tr>
                <tr>
                  <td class="check-cell"></td>
                  <td>その他 (Other)</td>
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
            <col style="width: 9%" />
            <col style="width: 13%" />
          </colgroup>
          <thead>
            <tr>
              <th>No</th>
              <th>品番<br/>(Part No)</th>
              <th>品名<br/>(Part Name)</th>
              <th>注文書No<br/>PO No</th>
              <th>単位<br/>(Unit)</th>
              <th>数量<br/>(Quantity)</th>
              <th>単価<br/>(Unit Price)<br/>USD</th>
              <th>合計<br/>(Total Amount)<br/>USD</th>
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

export const renderPackingListPreviewHtml = (
  payload: InvoicePackingPayload,
  templateType: InvoicePackingTemplate,
) => {
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
                    <div class="right-cell-value">${templateType === "hq" ? "HQ" : "CLIENT"}</div>
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
