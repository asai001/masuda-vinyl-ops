import { toTsLiteral, replaceExportedConst } from "./_seedUtils.mjs";

replaceExportedConst({
  tsRelPath: "app/src/mock/salesManagementData.ts",
  constName: "salesRows",
  literal: toTsLiteral([]),
});

console.log("Cleared: sales management");
