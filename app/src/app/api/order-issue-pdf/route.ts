import { promises as fs, existsSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import {
  renderOrderIssueHtml,
  type OrderIssuePdfPayload,
  type PdfFontSources,
  type PdfLineItem,
} from "@/features/order-management/orderIssueTemplate";

export const runtime = "nodejs";

let fontCache: PdfFontSources | null = null;

const readFontAsBase64 = async (fileName: string) => {
  const fontPath = path.join(process.cwd(), "public", "fonts", fileName);
  const buffer = await fs.readFile(fontPath);
  return buffer.toString("base64");
};

const toDataUri = (base64: string) => `data:font/ttf;base64,${base64}`;

const loadFontData = async () => {
  if (fontCache) {
    return fontCache;
  }
  const [jpRegular, jpBold, vnRegular, vnBold] = await Promise.all([
    readFontAsBase64("NotoSerifJP-Regular.ttf"),
    readFontAsBase64("NotoSerifJP-Bold.ttf"),
    readFontAsBase64("NotoSerif-Regular.ttf"),
    readFontAsBase64("NotoSerif-Bold.ttf"),
  ]);
  fontCache = {
    jpRegular: toDataUri(jpRegular),
    jpBold: toDataUri(jpBold),
    vnRegular: toDataUri(vnRegular),
    vnBold: toDataUri(vnBold),
  };
  return fontCache;
};

const normalizeLineItems = (items: unknown): PdfLineItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => {
    if (!item || typeof item !== "object") {
      return { name: "", unit: "", quantity: "", unitPrice: "", deliveryDate: "", amount: "" };
    }
    const record = item as Record<string, unknown>;
    return {
      name: typeof record.name === "string" ? record.name : "",
      unit: typeof record.unit === "string" ? record.unit : "",
      quantity: typeof record.quantity === "string" ? record.quantity : "",
      unitPrice: typeof record.unitPrice === "string" ? record.unitPrice : "",
      deliveryDate: typeof record.deliveryDate === "string" ? record.deliveryDate : "",
      amount: typeof record.amount === "string" ? record.amount : "",
    };
  });
};

const normalizePayload = (payload: Partial<OrderIssuePdfPayload>): OrderIssuePdfPayload => ({
  orderNumber: typeof payload.orderNumber === "string" ? payload.orderNumber : "-",
  issueDate: typeof payload.issueDate === "string" ? payload.issueDate : "-",
  supplierName: typeof payload.supplierName === "string" ? payload.supplierName : "-",
  supplierAddressLine1: typeof payload.supplierAddressLine1 === "string" ? payload.supplierAddressLine1 : "-",
  supplierAddressLine2: typeof payload.supplierAddressLine2 === "string" ? payload.supplierAddressLine2 : "",
  supplierPhone: typeof payload.supplierPhone === "string" ? payload.supplierPhone : "-",
  lineItems: normalizeLineItems(payload.lineItems),
  amountLabel: typeof payload.amountLabel === "string" ? payload.amountLabel : "-",
  currency: typeof payload.currency === "string" ? payload.currency : "",
  note: typeof payload.note === "string" ? payload.note : "",
});

import type { Browser } from "puppeteer-core";
const isVercel = !!process.env.VERCEL;

const findLocalChromePath = () => {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (envPath && existsSync(envPath)) {
    return envPath;
  }
  const candidates = [
    "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
    "C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
    "C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
    "C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
  ];
  return candidates.find((path) => existsSync(path)) ?? null;
};

async function launchBrowser(): Promise<Browser> {
  if (isVercel) {
    const chromiumMod = await import("@sparticuz/chromium");
    const chromium = chromiumMod.default ?? chromiumMod; // ←ここ重要

    const puppeteer = (await import("puppeteer-core")).default;

    const headless = "shell" as const;

    return puppeteer.launch({
      args: puppeteer.defaultArgs({ args: chromium.args, headless }),
      executablePath: await chromium.executablePath(),
      headless,
      // PDF生成だけなら viewport 指定は必須じゃない（必要なら自分で設定）
      // defaultViewport: { width: 1280, height: 720 },
    });
  }

  const localExecutablePath = findLocalChromePath();
  if (localExecutablePath) {
    const puppeteer = (await import("puppeteer-core")).default;
    return puppeteer.launch({
      headless: true,
      executablePath: localExecutablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  const puppeteer = (await import("puppeteer")).default;
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export async function POST(request: Request) {
  let browser: Browser | null = null;
  const action = "order-issue-pdf.generate";
  const resource = "order-issue-pdf";
  let payload: OrderIssuePdfPayload | null = null;
  try {
    const body = (await request.json()) as Partial<OrderIssuePdfPayload>;
    payload = normalizePayload(body);
    const fonts = await loadFontData();
    const html = renderOrderIssueHtml(payload, fonts);

    browser = await launchBrowser();
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluate(async () => {
      if (document.fonts && "ready" in document.fonts) {
        await document.fonts.ready;
      }
    });
    const pdfData = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    const pdfBytes = Uint8Array.from(pdfData);
    const pdfBuffer = pdfBytes.buffer;

    const safeOrderNumber = payload.orderNumber.replace(/[^A-Za-z0-9-_]/g, "") || "order";
    await writeAuditLog({
      req: request,
      action,
      resource,
      target: { orderNumber: payload.orderNumber },
      result: "success",
      statusCode: 200,
    });
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="order-${safeOrderNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate order PDF", error);
    const msg = error instanceof Error ? error.message : "Failed to generate PDF";
    await writeAuditLog({
      req: request,
      action,
      resource,
      target: payload ? { orderNumber: payload.orderNumber } : undefined,
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.warn("Failed to close browser", closeError);
      }
    }
  }
}
