import { readJsonFile, toTsLiteral, replaceExportedConst } from "./_seedUtils.mjs";

const rows = readJsonFile("seed_product_master.json");
replaceExportedConst({
  tsRelPath: "app/src/mock/productMasterData.ts",
  constName: "productRows",
  literal: toTsLiteral(rows),
});

console.log("Seeded: product master");
