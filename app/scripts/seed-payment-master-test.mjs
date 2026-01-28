import { readJsonFile, toTsLiteral, replaceExportedConst } from "./_seedUtils.mjs";

const rows = readJsonFile("test_payment_master.json");
replaceExportedConst({
  tsRelPath: "app/src/mock/paymentMasterData.ts",
  constName: "paymentRows",
  literal: toTsLiteral(rows),
});

console.log("Seeded (test): payment master");
