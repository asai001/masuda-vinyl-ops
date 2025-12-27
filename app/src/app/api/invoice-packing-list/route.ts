import path from "path";
import JSZip from "jszip";
import XlsxPopulate from "xlsx-populate";
import { NextResponse } from "next/server";
import { InvoicePackingPayload } from "@/features/sales-management/invoicePackingList";

export const runtime = "nodejs";

const templateFileName = "インボイス-パッキングリスト.xlsx";
const sheetName = "INVOICE";
const startRow = 33;
const endRow = 50;

const formatTel = (value: string) => (value ? `TEL: ${value}` : "TEL:");
const formatTaxId = (value: string) => (value ? `TAX ID: ${value}` : "TAX ID:");

const sanitizeFileName = (value: string) => value.replace(/[^A-Za-z0-9-_]/g, "") || "invoice";

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

export async function POST(request: Request) {
  let payload: InvoicePackingPayload;
  try {
    payload = (await request.json()) as InvoicePackingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!payload?.orderNo || !payload.invoiceDate) {
    return NextResponse.json({ error: "Missing invoice data" }, { status: 400 });
  }

  try {
    const templatePath = path.join(process.cwd(), "public", templateFileName);
    const workbook = await XlsxPopulate.fromFileAsync(templatePath);
    const sheet = workbook.sheet(sheetName);
    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 500 });
    }

    sheet.cell("H5").value(`インボイス作成日(Date): ${payload.invoiceDate}`);
    const invoiceNo = payload.invoiceNo ?? "";
    const invoiceCell = sheet.cell("H7");
    const invoiceCellValue = invoiceCell.value();
    if (typeof invoiceCellValue === "string" && invoiceCellValue.includes("[Invoice")) {
      const replacedValue = invoiceCellValue.replace(/\[Invoice Number\]/g, invoiceNo).replace(/\[Invoice No\]/g, invoiceNo);
      invoiceCell.value(replacedValue);
    } else {
      const label = "Invoice Number";
      invoiceCell.value(invoiceNo ? `${label}\n${invoiceNo}` : `${label}\n`);
    }
    sheet.cell("J12").value(payload.destinationCountry);
    sheet.cell("A18").value(payload.consigneeName);
    sheet.cell("A19").value(payload.consigneeAddress);
    sheet.cell("A21").value(formatTel(payload.consigneeTel ?? ""));
    sheet.cell("A22").value(formatTaxId(payload.consigneeTaxId ?? ""));
    sheet.cell("A27").value(payload.destinationCountry);

    for (let row = startRow; row <= endRow; row += 1) {
      sheet.cell(`B${row}`).value("");
      sheet.cell(`D${row}`).value("");
      sheet.cell(`E${row}`).value("");
      sheet.cell(`F${row}`).value("");
      sheet.cell(`G${row}`).value("");
      sheet.cell(`H${row}`).value("");
      sheet.cell(`J${row}`).value("");
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    items.slice(0, endRow - startRow + 1).forEach((item, index) => {
      const row = startRow + index;
      const total = Number.isFinite(item.quantity * item.unitPrice) ? item.quantity * item.unitPrice : 0;
      sheet.cell(`B${row}`).value(item.partNo);
      sheet.cell(`D${row}`).value(item.partName);
      sheet.cell(`E${row}`).value(item.poNo);
      sheet.cell(`F${row}`).value(item.unit);
      sheet.cell(`G${row}`).value(item.quantity);
      sheet.cell(`H${row}`).value(item.unitPrice);
      sheet.cell(`J${row}`).value(total);
    });

    const buffer = await workbook.outputAsync();
    const updatedBuffer = await updateSharedStringCounts(buffer as Buffer);
    const fileBytes = Uint8Array.from(updatedBuffer as Uint8Array);
    const fileBuffer = fileBytes.buffer;
    const safeOrderNo = sanitizeFileName(payload.orderNo);
    const fileName = `インボイス-パッキングリスト-${safeOrderNo}.xlsx`;
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
    return NextResponse.json({ error: "Failed to generate invoice packing list" }, { status: 500 });
  }
}
