import path from "path";
import XlsxPopulate from "xlsx-populate";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import type { OrderIssueExcelLineItem, OrderIssueExcelPayload } from "@/features/order-management/orderIssueExcel";

export const runtime = "nodejs";

const TEMPLATE_FILE_NAME = "発注フォーム.xlsx";
const DEFAULT_SHEET_NAME = "Duc Phong";
const SHEET_NAME_12 = "Duc Phong-12";
const SHEET_NAME_17 = "Duc Phong-17";
const LINE_START_ROW = 13;
const LINE_END_ROW_DEFAULT = 19;
const LINE_END_ROW_12 = 24;
const LINE_END_ROW_17 = 29;
const NOTE_ROW_OFFSET = 4;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toNonEmptyString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const toFiniteNumber = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toIsoDate = (value: unknown) => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return "";
  }
  const dayMonthMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dayMonthMatch) {
    const [, day, month, year] = dayMonthMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    return raw;
  }
  const date = new Date(parsed);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const toDisplayDate = (value: unknown) => {
  const normalized = toIsoDate(value);
  if (!normalized) {
    return "";
  }
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return normalized;
  }
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

const escapeNumberFormatText = (value: string) => value.replace(/"/g, '""');

const buildUnitPriceNumberFormat = (currency: string) => {
  const trimmed = currency.trim();
  if (!trimmed) {
    return "#,##0";
  }
  return `#,##0 "${escapeNumberFormatText(trimmed)}"`;
};

const sanitizeFileName = (value: string) => {
  const trimmed = value.trim();
  const sanitized = trimmed.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "");
  return sanitized || "order";
};

type HiddenSheet = {
  hidden: (value?: boolean) => unknown;
};

type NameableSheet = {
  name: (value?: string) => unknown;
};

type WorkbookWithActiveSheet = {
  activeSheet: (sheet: unknown) => unknown;
};

const getSheetOrThrow = (
  workbook: { sheet: (name: string) => unknown },
  sheetName: string,
) => {
  const sheet = workbook.sheet(sheetName);
  if (!sheet) {
    throw new Error(`Template sheet not found: ${sheetName}`);
  }
  return sheet;
};

const setSheetHidden = (sheet: unknown, hidden: boolean) => {
  (sheet as HiddenSheet).hidden(hidden);
};

const renameSheet = (sheet: unknown, nextName: string) => {
  (sheet as NameableSheet).name(nextName);
};

const resolveSheetPlan = (lineItemCount: number) => {
  if (lineItemCount >= 13) {
    return { sheetName: SHEET_NAME_17, lineEndRow: LINE_END_ROW_17 };
  }
  if (lineItemCount >= 8) {
    return { sheetName: SHEET_NAME_12, lineEndRow: LINE_END_ROW_12 };
  }
  return { sheetName: DEFAULT_SHEET_NAME, lineEndRow: LINE_END_ROW_DEFAULT };
};

const normalizeLineItems = (items: unknown): OrderIssueExcelLineItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => {
      if (!isObjectRecord(item)) {
        return null;
      }
      return {
        name: toNonEmptyString(item.name),
        unit: toNonEmptyString(item.unit),
        quantity: toFiniteNumber(item.quantity),
        unitPrice: toFiniteNumber(item.unitPrice),
        deliveryDate: toIsoDate(item.deliveryDate),
      } satisfies OrderIssueExcelLineItem;
    })
    .filter((item): item is OrderIssueExcelLineItem => item !== null);
};

const normalizePayload = (payload: unknown): OrderIssueExcelPayload | null => {
  if (!isObjectRecord(payload)) {
    return null;
  }
  return {
    orderNumber: toNonEmptyString(payload.orderNumber),
    issueDate: toIsoDate(payload.issueDate),
    supplierName: toNonEmptyString(payload.supplierName),
    supplierAddress: toNonEmptyString(payload.supplierAddress),
    supplierContact: toNonEmptyString(payload.supplierContact),
    currency: toNonEmptyString(payload.currency),
    note: typeof payload.note === "string" ? payload.note.trim() : "",
    lineItems: normalizeLineItems(payload.lineItems),
  };
};

export async function POST(request: Request) {
  const action = "order-issue-excel.generate";
  const resource = "order-issue-excel";
  let payload: OrderIssueExcelPayload | null = null;

  try {
    const body = await request.json();
    payload = normalizePayload(body);
  } catch {
    payload = null;
  }

  if (!payload || !payload.orderNumber || !payload.issueDate) {
    await writeAuditLog({
      req: request,
      action,
      resource,
      target: payload ? { orderNumber: payload.orderNumber } : undefined,
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid payload",
    });
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const templatePath = path.join(process.cwd(), "public", TEMPLATE_FILE_NAME);
    const workbook = await XlsxPopulate.fromFileAsync(templatePath);
    const defaultSheet = getSheetOrThrow(workbook as unknown as { sheet: (name: string) => unknown }, DEFAULT_SHEET_NAME);
    const sheet12 = getSheetOrThrow(workbook as unknown as { sheet: (name: string) => unknown }, SHEET_NAME_12);
    const sheet17 = getSheetOrThrow(workbook as unknown as { sheet: (name: string) => unknown }, SHEET_NAME_17);
    const plan = resolveSheetPlan(payload.lineItems.length);
    const sheet = getSheetOrThrow(workbook as unknown as { sheet: (name: string) => unknown }, plan.sheetName) as {
      cell: (address: string) => { value: (value?: string | number | boolean | Date | null) => unknown };
    };

    if (plan.sheetName === SHEET_NAME_12) {
      renameSheet(defaultSheet, `${DEFAULT_SHEET_NAME}-escape`);
      renameSheet(sheet12, DEFAULT_SHEET_NAME);
    }
    if (plan.sheetName === SHEET_NAME_17) {
      renameSheet(defaultSheet, `${DEFAULT_SHEET_NAME}-escape`);
      renameSheet(sheet17, DEFAULT_SHEET_NAME);
    }

    // Ensure the target sheet is visible first, then hide non-target sheets.
    setSheetHidden(sheet, false);
    setSheetHidden(defaultSheet, plan.sheetName !== DEFAULT_SHEET_NAME);
    if (plan.sheetName !== SHEET_NAME_12) {
      setSheetHidden(sheet12, true);
    }
    if (plan.sheetName !== SHEET_NAME_17) {
      setSheetHidden(sheet17, true);
    }
    (workbook as unknown as WorkbookWithActiveSheet).activeSheet(sheet);

    sheet.cell("B4").value(payload.supplierName);
    sheet.cell("C5").value(payload.supplierAddress);
    sheet.cell("C6").value(payload.supplierContact);
    sheet.cell("J2").value(`注番: ${payload.orderNumber}`);
    sheet.cell("J4").value(toDisplayDate(payload.issueDate));

    const maxRows = plan.lineEndRow - LINE_START_ROW + 1;

    const unitPriceNumberFormat = buildUnitPriceNumberFormat(payload.currency);

    for (let row = LINE_START_ROW; row <= plan.lineEndRow; row += 1) {
      sheet.cell(`B${row}`).value(String(row - LINE_START_ROW + 1));
      sheet.cell(`C${row}`).value("");
      sheet.cell(`D${row}`).value("");
      sheet.cell(`E${row}`).value("");
      // F/G are used by template formulas in I column (G*F).
      // Use true blank cells (null), not empty strings, to avoid #VALUE! on multiply.
      sheet.cell(`F${row}`).value(null);
      sheet.cell(`G${row}`).value(null);
      sheet.cell(`H${row}`).value("");
      (sheet.cell(`I${row}`) as unknown as { style: (name: string, value: string) => void }).style(
        "numberFormat",
        unitPriceNumberFormat,
      );
    }

    const outputItems = payload.lineItems.slice(0, maxRows);
    outputItems.forEach((item, index) => {
      const row = LINE_START_ROW + index;
      sheet.cell(`C${row}`).value(item.name);
      sheet.cell(`E${row}`).value(item.unit);
      sheet.cell(`F${row}`).value(item.quantity);
      sheet.cell(`G${row}`).value(item.unitPrice);
      (sheet.cell(`G${row}`) as unknown as { style: (name: string, value: string) => void }).style(
        "numberFormat",
        unitPriceNumberFormat,
      );
      sheet.cell(`H${row}`).value(toDisplayDate(item.deliveryDate));
    });

    const noteRow = plan.lineEndRow + NOTE_ROW_OFFSET;
    const noteLabel = "※摘要";
    const noteValue = payload.note ? `${noteLabel}\n${payload.note}` : noteLabel;
    sheet.cell(`B${noteRow}`).value(noteValue);

    const buffer = await workbook.outputAsync();
    const fileBytes = Uint8Array.from(buffer as Uint8Array);
    const fileBuffer = fileBytes.buffer;
    const safeOrderNumber = sanitizeFileName(payload.orderNumber);
    const fileName = `発注書-${safeOrderNumber}.xlsx`;

    await writeAuditLog({
      req: request,
      action,
      resource,
      target: { orderNumber: payload.orderNumber },
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
    console.error("Failed to generate order issue excel", error);
    const msg = error instanceof Error ? error.message : "Failed to generate order issue excel";
    await writeAuditLog({
      req: request,
      action,
      resource,
      target: payload ? { orderNumber: payload.orderNumber } : undefined,
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    return NextResponse.json({ error: "Failed to generate order issue excel" }, { status: 500 });
  }
}
