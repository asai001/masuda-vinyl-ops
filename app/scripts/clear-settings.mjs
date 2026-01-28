import { toTsLiteral, replaceExportedConst } from "./_seedUtils.mjs";

replaceExportedConst({
  tsRelPath: "app/src/mock/settingsData.ts",
  constName: "exchangeRates",
  literal: toTsLiteral({ jpyPerUsd: "", vndPerUsd: "" }),
});

console.log("Cleared: settings");
