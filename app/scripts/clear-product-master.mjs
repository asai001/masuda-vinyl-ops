import { toTsLiteral, replaceExportedConst } from "./_seedUtils.mjs";

replaceExportedConst({
  tsRelPath: "app/src/mock/productMasterData.ts",
  constName: "productRows",
  literal: toTsLiteral([]),
});

console.log("Cleared: product master");
