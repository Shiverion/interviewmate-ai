"use server";
import { MAX_PDF_BYTES, parsePdfBytes } from "./engine";
import { parsingFailure, type ParsingResult } from "./result";
export async function extractTextFromPdfUrl(
  url: string
): Promise<ParsingResult> {
  try {
    const parsed = new URL(url),
      bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "firebasestorage.googleapis.com" ||
      !bucket ||
      !parsed.pathname.startsWith(`/v0/b/${bucket}/o/`)
    )
      return parsingFailure(
        "unsupported",
        "Use a resume uploaded to this workspace."
      );
    const response = await fetch(parsed, {
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      return parsingFailure(
        "failed",
        "The uploaded PDF could not be retrieved."
      );
    const reader = response.body?.getReader();
    if (!reader) return parsingFailure("failed", "Empty PDF response.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_PDF_BYTES) {
          await reader.cancel();
          return parsingFailure("unsupported", "PDF exceeds 10 MB.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return parsePdfBytes(Buffer.concat(chunks));
  } catch {
    return parsingFailure(
      "failed",
      "Resume retrieval failed. Retry or continue without CV grounding."
    );
  }
}
