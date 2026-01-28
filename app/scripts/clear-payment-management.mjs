import { toTsLiteral, replaceExportedConst } from "./_seedUtils.mjs";

replaceExportedConst({
  tsRelPath: "app/src/mock/paymentManagementData.ts",
  constName: "paymentManagementRows",
  literal: toTsLiteral([]),
});

console.log("Cleared: payment management");
