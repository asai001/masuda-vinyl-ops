import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function repoRoot() {
  return path.resolve(__dirname, "..", "..");
}

export function readJsonFile(filename) {
  const abs = path.resolve(__dirname, filename);
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

export function toTsLiteral(value) {
  // JSON -> TS-ish: remove quotes from simple property names
  const json = JSON.stringify(value, null, 2);
  return json.replace(/"([A-Za-z_][A-Za-z0-9_]*)":/g, "$1:");
}

export function replaceExportedConst({ tsRelPath, constName, literal }) {
  const abs = path.resolve(repoRoot(), tsRelPath);
  const src = fs.readFileSync(abs, "utf8");

  const re = new RegExp(
    `(export\\s+const\\s+${constName}[^=]*=\\s*)([\\s\\S]*?)(\\n?;\\s*)`,
    "m",
  );

  if (!re.test(src)) {
    throw new Error(`Could not find exported const '${constName}' in ${tsRelPath}`);
  }

  const next = src.replace(re, `$1${literal}$3`);
  fs.writeFileSync(abs, next, "utf8");
}
