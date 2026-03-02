import { NextResponse } from "next/server";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = "";

type PdfTextItem = {
    str?: string;
};

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            useWorkerFetch: false,
            isEvalSupported: false
        });
        const pdfDocument = await loadingTask.promise;

        let fullText = "";
        for (let page = 1; page <= pdfDocument.numPages; page++) {
            const pageRef = await pdfDocument.getPage(page);
            const textContent = await pageRef.getTextContent();
            const pageText = textContent.items
                .map((item) => {
                    const candidate = item as PdfTextItem;
                    return candidate.str || "";
                })
                .join(" ");
            fullText += `${pageText}\n\n`;
        }

        return NextResponse.json({ text: fullText.trim() }, { status: 200 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to parse PDF";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
