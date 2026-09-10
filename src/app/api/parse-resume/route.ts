import { parsePdfBytes, MAX_PDF_BYTES } from "@/lib/pdf/engine";
import { parsingFailure } from "@/lib/pdf/result";
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length")) > MAX_PDF_BYTES + 10000)
    return Response.json(parsingFailure("unsupported", "PDF exceeds 10 MB."), {
      status: 413,
    });
  try {
    const form = await req.formData(),
      file = form.get("file");
    if (!(file instanceof File))
      return Response.json(parsingFailure("unsupported", "Select a PDF."), {
        status: 400,
      });
    if (file.size > MAX_PDF_BYTES)
      return Response.json(
        parsingFailure("unsupported", "PDF exceeds 10 MB."),
        { status: 413 }
      );
    return Response.json(
      await parsePdfBytes(new Uint8Array(await file.arrayBuffer()))
    );
  } catch {
    return Response.json(
      parsingFailure("failed", "Could not read the upload."),
      { status: 400 }
    );
  }
}
