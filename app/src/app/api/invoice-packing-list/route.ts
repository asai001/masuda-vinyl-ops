import path from "path";
import JSZip from "jszip";
import XlsxPopulate from "xlsx-populate";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import {
  InvoicePackingPayload,
  type InvoicePackingTemplate,
} from "@/features/sales-management/invoicePackingList";

export const runtime = "nodejs";

const templateFileNames: Record<InvoicePackingTemplate, string> = {
  client: "インボイス-パッキングリスト-取引先用.xlsx",
  hq: "インボイス-パッキングリスト-本社用.xlsx",
};
const sheetName = "INVOICE";
const packingListSheetName = "PACKING LIST";
const clientStartRow = 33;
const clientEndRow = 50;
const hqStartRow = 33;
const hqEndRow = 45;
const clientPackingStartRow = 35;
const clientPackingEndRow = 52;
const hqPackingStartRow = 35;
const hqPackingEndRow = 48;

const formatTel = (value: string) => (value ? `TEL: ${value}` : "TEL:");
const formatTaxId = (value: string) => (value ? `TAX ID: ${value}` : "TAX ID:");
const parseInvoiceDate = (value: string) => {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  const [, day, month, year] = match;
  return { day, month, year };
};

const sanitizeFileName = (value: string) => {
  const trimmed = value.trim();
  const sanitized = trimmed.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "");
  return sanitized || "invoice";
};

const updateSharedStringsXml = (xml: string, count: number, uniqueCount: number) => {
  const match = xml.match(/<sst\b[^>]*>/);
  if (!match) {
    return xml;
  }
  const originalTag = match[0];
  let updatedTag = originalTag.replace(/\s(count|uniqueCount)="[^"]*"/g, "");
  updatedTag = updatedTag.replace(/\s*\/?>$/, ` count="${count}" uniqueCount="${uniqueCount}">`);
  return xml.replace(originalTag, updatedTag);
};

const stripPhonetics = (xml: string) => {
  // rPh（ふりがな割当）を削除
  xml = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  // phoneticPr を削除（自己終了と通常の両方に対応）
  xml = xml.replace(/<phoneticPr\b[^\/>]*\/>/g, "");
  xml = xml.replace(/<phoneticPr\b[\s\S]*?<\/phoneticPr>/g, "");
  return xml;
};

// function addXmlSpacePreserve(xml: string) {
//   // <t ...>TEXT</t> の TEXT に空白/改行/連続スペースが含まれる場合に xml:space="preserve" を付ける
//   return xml.replace(/<t(?![^>]*\bxml:space=)([^>]*)>([\s\S]*?)<\/t>/g, (full, attrs, text) => {
//     // text はXMLエスケープ済み（改行は実体として残る）
//     const needs =
//       /(^\s)|(\s$)/.test(text) || // 先頭/末尾スペース
//       / {2,}/.test(text) || // 連続スペース
//       /[\r\n\t]/.test(text); // 改行/タブ
//     if (!needs) return full;
//     return `<t${attrs} xml:space="preserve">${text}</t>`;
//   });
// }

const updateSharedStringCounts = async (buffer: Buffer) => {
  const zip = await JSZip.loadAsync(buffer);
  const sharedStringsEntry = zip.file("xl/sharedStrings.xml");
  if (!sharedStringsEntry) {
    return buffer;
  }

  const sharedStringsXml = await sharedStringsEntry.async("string");
  const uniqueCount = (sharedStringsXml.match(/<si\b/g) || []).length;
  const sheetFiles = Object.keys(zip.files).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  let count = 0;
  for (const sheetFile of sheetFiles) {
    const sheetEntry = zip.file(sheetFile);
    if (!sheetEntry) {
      continue;
    }
    const sheetXml = await sheetEntry.async("string");
    const matches = sheetXml.match(/<c\b[^>]*\bt="s"/g);
    if (matches) {
      count += matches.length;
    }
  }

  let updatedSharedStringsXml = updateSharedStringsXml(sharedStringsXml, count, uniqueCount);
  updatedSharedStringsXml = stripPhonetics(updatedSharedStringsXml);
  // updatedSharedStringsXml = addXmlSpacePreserve(updatedSharedStringsXml);
  zip.file("xl/sharedStrings.xml", updatedSharedStringsXml);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
};

const escapeNumberFormatText = (value: string) => value.replace(/"/g, '""');

const toPackingFormat = (unitLabel: string) => {
  const trimmed = unitLabel.trim();
  if (!trimmed) {
    return "0";
  }
  const safe = escapeNumberFormatText(trimmed);
  return `0 "${safe}"`;
};

export async function POST(request: Request) {
  const action = "invoice-packing-list.generate";
  const resource = "invoice-packing-list";
  let payload: InvoicePackingPayload;
  try {
    payload = (await request.json()) as InvoicePackingPayload;
  } catch {
    await writeAuditLog({
      req: request,
      action,
      resource,
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid payload",
    });
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!payload?.orderNo || !payload.invoiceDate) {
    await writeAuditLog({
      req: request,
      action,
      resource,
      target: { orderNo: payload?.orderNo },
      result: "failure",
      statusCode: 400,
      errorMessage: "Missing invoice data",
    });
    return NextResponse.json({ error: "Missing invoice data" }, { status: 400 });
  }

  try {
    const templateType: InvoicePackingTemplate = payload.templateType === "hq" ? "hq" : "client";
    const templateFileName = templateFileNames[templateType];
    const templatePath = path.join(process.cwd(), "public", templateFileName);
    const workbook = await XlsxPopulate.fromFileAsync(templatePath);
    const sheet = workbook.sheet(sheetName);
    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 500 });
    }
    const packingSheet = workbook.sheet(packingListSheetName);
    if (!packingSheet) {
      return NextResponse.json({ error: "Packing list sheet not found" }, { status: 500 });
    }

    const invoiceNo = payload.invoiceNo ?? "";
    if (templateType === "hq") {
      const invoiceDateCell = sheet.cell("G5");
      const invoiceDateTemplate = invoiceDateCell.value();
      const parsedDate = parseInvoiceDate(payload.invoiceDate);
      const day = parsedDate?.day ?? "";
      const month = parsedDate?.month ?? "";
      const year = parsedDate?.year ?? "";
      if (typeof invoiceDateTemplate === "string" && parsedDate) {
        const replaced = invoiceDateTemplate
          .replace(/\{D\}/g, day)
          .replace(/\{M\}/g, month)
          .replace(/\{YYYY\}/g, year);
        invoiceDateCell.value(replaced);
      } else {
        invoiceDateCell.value(`インボイス作成日（Date): ${payload.invoiceDate}`);
      }

      const invoiceCell = sheet.cell("G8");
      const invoiceCellValue = invoiceCell.value();
      if (typeof invoiceCellValue === "string") {
        const replacedValue = invoiceCellValue.replace(/\{INVOICE No\.\}/g, invoiceNo);
        invoiceCell.value(replacedValue);
      } else {
        invoiceCell.value(`Invoice No\n${invoiceNo}`);
      }
    } else {
      sheet.cell("H5").value(`インボイス作成日(Date): ${payload.invoiceDate}`);
      const invoiceCell = sheet.cell("H7");
      const invoiceCellValue = invoiceCell.value();
      if (typeof invoiceCellValue === "string" && invoiceCellValue.includes("[Invoice")) {
        const replacedValue = invoiceCellValue
          .replace(/\[Invoice Number\]/g, invoiceNo)
          .replace(/\[Invoice No\]/g, invoiceNo);
        invoiceCell.value(replacedValue);
      } else {
        const label = "Invoice Number";
        invoiceCell.value(invoiceNo ? `${label}\n${invoiceNo}` : `${label}\n`);
      }
    }
    sheet.cell("J12").value(payload.destinationCountry);
    if (templateType !== "hq") {
      sheet.cell("A18").value(payload.consigneeName);
      sheet.cell("A19").value(payload.consigneeAddress);
      sheet.cell("A21").value(formatTel(payload.consigneeTel ?? ""));
      sheet.cell("A22").value(formatTaxId(payload.consigneeTaxId ?? ""));
      sheet.cell("A27").value(payload.destinationCountry);
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    if (templateType === "hq") {
      for (let row = hqStartRow; row <= hqEndRow; row += 1) {
        sheet.cell(`A${row}`).value("");
        sheet.cell(`B${row}`).value("");
        sheet.cell(`D${row}`).value("");
        sheet.cell(`E${row}`).value("");
        sheet.cell(`F${row}`).value("");
        sheet.cell(`G${row}`).value("");
      }

      const maxRows = hqEndRow - hqStartRow + 1;
      const hqItems = items.slice(0, maxRows);
      const totalItems = items.length;
      hqItems.forEach((item, index) => {
        const row = hqStartRow + index;
        const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
        const unitPrice = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;
        sheet.cell(`A${row}`).value(totalItems ? `${index + 1}/${totalItems}` : "");
        sheet.cell(`B${row}`).value(item.partName || item.partNo);
        sheet.cell(`E${row}`).value(item.unit);
        sheet.cell(`F${row}`).value(quantity);
        sheet.cell(`G${row}`).value(unitPrice);
      });
    } else {
      for (let row = clientStartRow; row <= clientEndRow; row += 1) {
        sheet.cell(`B${row}`).value("");
        sheet.cell(`D${row}`).value("");
        sheet.cell(`E${row}`).value("");
        sheet.cell(`F${row}`).value("");
        sheet.cell(`G${row}`).value("");
        sheet.cell(`H${row}`).value("");
        sheet.cell(`J${row}`).value("");
      }

      items.slice(0, clientEndRow - clientStartRow + 1).forEach((item, index) => {
        const row = clientStartRow + index;
        const total = Number.isFinite(item.quantity * item.unitPrice) ? item.quantity * item.unitPrice : 0;
        sheet.cell(`B${row}`).value(item.partNo);
        sheet.cell(`D${row}`).value(item.partName);
        sheet.cell(`E${row}`).value(item.poNo);
        sheet.cell(`F${row}`).value(item.unit);
        sheet.cell(`G${row}`).value(item.quantity);
        sheet.cell(`H${row}`).value(item.unitPrice);
        sheet.cell(`J${row}`).value(total);
      });
    }

    if (templateType === "hq") {
      for (let row = hqPackingStartRow; row <= hqPackingEndRow; row += 1) {
        (packingSheet.cell(`G${row}`) as unknown as { formula: (value: string | null) => void }).formula(null);
        packingSheet.cell(`G${row}`).value(null);
        (packingSheet.cell(`G${row}`) as unknown as { style: (name: string, value: string) => void }).style(
          "numberFormat",
          "General",
        );
        (packingSheet.cell(`H${row}`) as unknown as { formula: (value: string | null) => void }).formula(null);
        packingSheet.cell(`H${row}`).value(null);
        packingSheet.cell(`J${row}`).value("");
        packingSheet.cell(`K${row}`).value("");
      }
      const maxRows = hqPackingEndRow - hqPackingStartRow + 1;
      items.slice(0, maxRows).forEach((item, index) => {
        const row = hqPackingStartRow + index;
        const palletCount = Number.isFinite(item.palletCount) ? item.palletCount : 0;
        const totalWeight = Number.isFinite(item.totalWeight) ? item.totalWeight : 0;
        const packingLabel = item.unit ? `${item.unit}/box` : "/box";
        const packingValue = Number.isFinite(item.packaging) ? (item.packaging as number) : null;
        if (packingValue !== null) {
          (packingSheet.cell(`G${row}`) as unknown as { formula: (value: string | null) => void }).formula(null);
          packingSheet.cell(`G${row}`).value(packingValue);
          (packingSheet.cell(`G${row}`) as unknown as { style: (name: string, value: string) => void }).style(
            "numberFormat",
            toPackingFormat(packingLabel),
          );
          packingSheet.cell(`H${row}`).value(null);
        }
        packingSheet.cell(`J${row}`).value(palletCount);
        packingSheet.cell(`K${row}`).value(totalWeight);
      });
    } else {
      for (let row = clientPackingStartRow; row <= clientPackingEndRow; row += 1) {
        (packingSheet.cell(`H${row}`) as unknown as { formula: (value: string | null) => void }).formula(null);
        packingSheet.cell(`H${row}`).value(null);
        (packingSheet.cell(`H${row}`) as unknown as { style: (name: string, value: string) => void }).style(
          "numberFormat",
          "General",
        );
        (packingSheet.cell(`I${row}`) as unknown as { formula: (value: string | null) => void }).formula(null);
        packingSheet.cell(`I${row}`).value(null);
        packingSheet.cell(`K${row}`).value("");
        packingSheet.cell(`M${row}`).value("");
      }
      const maxRows = clientPackingEndRow - clientPackingStartRow + 1;
      items.slice(0, maxRows).forEach((item, index) => {
        const row = clientPackingStartRow + index;
        const palletCount = Number.isFinite(item.palletCount) ? item.palletCount : 0;
        const totalWeight = Number.isFinite(item.totalWeight) ? item.totalWeight : 0;
        const packingLabel = item.unit ? `${item.unit}/box` : "/box";
        const packingValue = Number.isFinite(item.packaging) ? (item.packaging as number) : null;
        if (packingValue !== null) {
          (packingSheet.cell(`H${row}`) as unknown as { formula: (value: string | null) => void }).formula(null);
          packingSheet.cell(`H${row}`).value(packingValue);
          (packingSheet.cell(`H${row}`) as unknown as { style: (name: string, value: string) => void }).style(
            "numberFormat",
            toPackingFormat(packingLabel),
          );
          packingSheet.cell(`I${row}`).value(null);
        }
        packingSheet.cell(`K${row}`).value(palletCount);
        packingSheet.cell(`M${row}`).value(totalWeight);
      });
    }

    const buffer = await workbook.outputAsync();
    const updatedBuffer = await updateSharedStringCounts(buffer as Buffer);
    const fileBytes = Uint8Array.from(updatedBuffer as Uint8Array);
    const fileBuffer = fileBytes.buffer;
    const safeOrderNo = sanitizeFileName(payload.orderNo);
    const fileName = `インボイス-パッキングリスト-${safeOrderNo}.xlsx`;
    await writeAuditLog({
      req: request,
      action,
      resource,
      target: { orderNo: payload.orderNo },
      result: "success",
      statusCode: 200,
    });
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate invoice packing list", error);
    const msg = error instanceof Error ? error.message : "Failed to generate invoice packing list";
    await writeAuditLog({
      req: request,
      action,
      resource,
      target: { orderNo: payload?.orderNo },
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    return NextResponse.json({ error: "Failed to generate invoice packing list" }, { status: 500 });
  }
}
