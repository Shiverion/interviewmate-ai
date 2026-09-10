import { parsingFailure, type ParsingResult } from "./result";
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export async function parsePdfBytes(bytes: Uint8Array): Promise<ParsingResult> {
  if (bytes.length > MAX_PDF_BYTES)
    return parsingFailure("unsupported", "PDF exceeds 10 MB.");
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    return parsingFailure("unsupported", "Upload a PDF file.");
  let document: import("pdfjs-dist").PDFDocumentProxy | undefined;
  try {
    const pdf = await import("pdfjs-dist/legacy/build/pdf.js");
    pdf.GlobalWorkerOptions.workerSrc = "";
    document = await pdf.getDocument({
      data: bytes,
      useWorkerFetch: false,
      isEvalSupported: false,
    }).promise;
    const warnings: string[] = [];
    let text = "";
    for (let n = 1; n <= Math.min(document.numPages, 20); n++) {
      try {
        const page = await document.getPage(n);
        const content = await page.getTextContent();
        text +=
          content.items.map((i) => ("str" in i ? i.str : "")).join(" ") +
          "\n\n";
      } catch {
        warnings.push(`Page ${n} could not be read.`);
      }
    }
    if (document.numPages > 20)
      warnings.push("Only the first 20 pages were read.");
    if (text.length > 24000)
      warnings.push("Context truncated to 24,000 characters.");
    text = text
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
      .trim()
      .slice(0, 24000);
    if (text.replace(/\s/g, "").length < 30)
      return {
        ...parsingFailure(
          "no_extractable_text",
          "No usable text found. Scanned/image-only PDFs need a text-based replacement; OCR is not enabled."
        ),
        pageCount: document.numPages,
        warnings,
      };
    return {
      status: warnings.length ? "partial" : "success",
      text,
      pageCount: document.numPages,
      characterCount: text.length,
      warnings,
      failureReason: null,
    };
  } catch {
    return parsingFailure(
      "failed",
      "Could not read this PDF. It may be encrypted or damaged."
    );
  } finally {
    await document?.destroy().catch(() => {});
  }
}
