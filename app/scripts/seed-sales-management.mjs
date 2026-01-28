import { readJsonFile, toTsLiteral, replaceExportedConst } from "./_seedUtils.mjs";

const rows = readJsonFile("seed_sales_management.json");
replaceExportedConst({
  tsRelPath: "app/src/mock/salesManagementData.ts",
  constName: "salesRows",
  literal: toTsLiteral(rows),
});

console.log("Seeded: sales management");
