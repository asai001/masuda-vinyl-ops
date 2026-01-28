import { toTsLiteral, replaceExportedConst } from "./_seedUtils.mjs";

replaceExportedConst({
  tsRelPath: "app/src/mock/paymentMasterData.ts",
  constName: "paymentRows",
  literal: toTsLiteral([]),
});

console.log("Cleared: payment master");
