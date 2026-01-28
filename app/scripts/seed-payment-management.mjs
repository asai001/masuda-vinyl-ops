import { readJsonFile, toTsLiteral, replaceExportedConst } from "./_seedUtils.mjs";

const rows = readJsonFile("seed_payment_management.json");
replaceExportedConst({
  tsRelPath: "app/src/mock/paymentManagementData.ts",
  constName: "paymentManagementRows",
  literal: toTsLiteral(rows),
});

console.log("Seeded: payment management");
