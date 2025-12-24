import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
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
  note: typeof payload.note === "string" ? payload.note : "",
});

type Browser = import("puppeteer-core").Browser;

const isVercelRuntime = process.env.VERCEL === "1" || process.env.VERCEL === "true";

const ensureChromiumLambdaEnv = () => {
  if (!process.env.AWS_LAMBDA_JS_RUNTIME) {
    process.env.AWS_LAMBDA_JS_RUNTIME = "nodejs";
  }
  if (!process.env.AWS_EXECUTION_ENV) {
    process.env.AWS_EXECUTION_ENV = "AWS_Lambda_nodejs";
  }
  if (!process.env.FONTCONFIG_PATH) {
    process.env.FONTCONFIG_PATH = "/tmp/aws";
  }
  const libPath = "/tmp/aws/lib";
  if (!process.env.LD_LIBRARY_PATH) {
    process.env.LD_LIBRARY_PATH = libPath;
  } else if (!process.env.LD_LIBRARY_PATH.split(":").includes(libPath)) {
    process.env.LD_LIBRARY_PATH = `${libPath}:${process.env.LD_LIBRARY_PATH}`;
  }
};

const launchBrowser = async (): Promise<Browser> => {
  if (isVercelRuntime) {
    ensureChromiumLambdaEnv();
    const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const { default: puppeteer } = await import("puppeteer");
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
};

export async function POST(request: Request) {
  let browser: Browser | null = null;
  try {
    const body = (await request.json()) as Partial<OrderIssuePdfPayload>;
    const payload = normalizePayload(body);
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
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="order-${safeOrderNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate order PDF", error);
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
