import { getBytes, ref } from "firebase/storage";
import { storage } from "./config";
import { parsingFailure, type ParsingResult } from "@/lib/pdf/result";

// Fetch through authenticated Storage rules, never through a public download token.
export async function readPrivateResume(path: string): Promise<ParsingResult> {
  try {
    const bytes = await getBytes(ref(storage, path), 10 * 1024 * 1024);
    const form = new FormData();
    form.set(
      "file",
      new File([bytes], "resume.pdf", { type: "application/pdf" })
    );
    const response = await fetch("/api/parse-resume", {
      method: "POST",
      body: form,
    });
    if (!response.ok)
      return parsingFailure(
        "failed",
        "Resume parsing failed. Ask your recruiter to check the CV preview."
      );
    return await response.json();
  } catch {
    return parsingFailure(
      "failed",
      "This account could not retrieve the private resume. Continue without CV grounding or contact your recruiter."
    );
  }
}
