"use server";

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

// Disable workers for Node.js server environments
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

/**
 * Server action to download a PDF resume from a Firebase Storage URL and extract its raw text.
 * Uses pdfjs-dist which is much more stable in Next.js Server Actions than pdf-parse.
 */
export async function extractTextFromPdfUrl(url: string): Promise<string | null> {
    try {
        if (!url || !url.includes('.pdf')) {
            console.warn("[PDF JS] Invalid or missing PDF URL:", url);
            return null;
        }

        const response = await fetch(url);
        if (!response.ok) {
            console.error(`[PDF JS] Failed to fetch PDF payload: ${response.status} ${response.statusText}`);
            return `[SERVER_ERROR] Failed to fetch PDF: ${response.status}`;
        }

        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false });
        const pdfDocument = await loadingTask.promise;

        let fullText = "";
        const numPages = pdfDocument.numPages;

        // Iterate through each page and extract text paragraphs
        for (let i = 1; i <= numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n\n";
        }

        return fullText.trim();
    } catch (err: any) {
        console.error("Error parsing resume PDF via pdfjs-dist:", err);
        return `[SERVER_ERROR] ${err?.message || 'Unknown parsing error'}`;
    }
}
