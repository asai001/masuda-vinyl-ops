import { readJsonFile, toTsLiteral, replaceExportedConst } from "./_seedUtils.mjs";

const rows = readJsonFile("test_payment_management.json");
replaceExportedConst({
  tsRelPath: "app/src/mock/paymentManagementData.ts",
  constName: "paymentManagementRows",
  literal: toTsLiteral(rows),
});

console.log("Seeded (test): payment management");
