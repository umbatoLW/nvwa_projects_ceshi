declare module "pdf-parse" {
  interface PDFParseResult {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
    version?: string;
  }

  function pdfParse(
    dataBuffer: Buffer | Uint8Array,
    options?: Record<string, unknown>
  ): Promise<PDFParseResult>;

  export default pdfParse;
}
