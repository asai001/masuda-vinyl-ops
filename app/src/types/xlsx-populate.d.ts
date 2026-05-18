declare module "xlsx-populate" {
  type CellValue = string | number | boolean | Date | null;

  type Cell = {
    value(): CellValue;
    value(value: CellValue): Cell;
    formula(): string | undefined;
    formula(value: string | null): Cell;
    style(name: string, value: string): Cell;
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
    hidden(): boolean | string;
    hidden(value: boolean): Sheet;
    delete(): Workbook;
    name(): string;
    name(value: string): Sheet;
  };

  type Workbook = {
    sheet(name: string | number): Sheet | undefined;
    activeSheet(sheet: Sheet | string | number): Workbook;
    outputAsync(): Promise<Buffer>;
  };

  const XlsxPopulate: {
    fromFileAsync(path: string): Promise<Workbook>;
  };

  export default XlsxPopulate;
}
