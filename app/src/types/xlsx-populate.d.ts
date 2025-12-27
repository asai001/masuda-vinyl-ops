declare module "xlsx-populate" {
  type CellValue = string | number | boolean | Date | null;

  type Cell = {
    value(): CellValue;
    value(value: CellValue): Cell;
    address(): string;
  };

  type Range = {
    startCell(): Cell;
    endCell(): Cell;
  };

  type Sheet = {
    cell(address: string): Cell;
    cell(row: number, column: number): Cell;
    usedRange(): Range | undefined | null;
  };

  type Workbook = {
    sheet(name: string): Sheet;
    outputAsync(): Promise<Buffer>;
  };

  const XlsxPopulate: {
    fromFileAsync(path: string): Promise<Workbook>;
  };

  export default XlsxPopulate;
}
