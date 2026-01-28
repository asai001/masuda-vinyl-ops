import { readJsonFile, toTsLiteral, replaceExportedConst } from "./_seedUtils.mjs";

const data = readJsonFile("test_settings.json");
replaceExportedConst({
  tsRelPath: "app/src/mock/settingsData.ts",
  constName: "exchangeRates",
  literal: toTsLiteral(data.exchangeRates),
});

console.log("Seeded (test): settings");
