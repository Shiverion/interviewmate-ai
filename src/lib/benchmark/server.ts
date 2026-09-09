import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { createHandler } from "../review-brief/handler";
import { loadCases } from "./dataset";
import { configurationFor, generateBenchmark, profiles } from "./providers";
import { STUDY_VERSION, providerIdSchema } from "./types";

const selectionSchema = z.strictObject({
  caseId: z.string().max(64),
  providerId: providerIdSchema,
  referenceHash: z.string().regex(/^[a-f0-9]{64}$/),
  referenceReviewed: z.literal(true),
});
export async function benchmarkPost(request: Request) {
  const error = (code: string, message: string, status: number) =>
    Response.json(
      { error: { code, message } },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  if (process.env.NODE_ENV !== "development")
    return error("NOT_ENABLED", "Development only.", 404);
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return error(
      "ORIGIN_MISMATCH",
      "Open the local evaluation workspace to run a case.",
      403
    );
  let body: unknown;
  const reader = request.body?.getReader();
  if (!reader)
    return error("INVALID_INPUT", "Select a bundled case and provider.", 400);
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) {
        await reader.cancel();
        return error("INPUT_TOO_LARGE", "Selection exceeds limit.", 413);
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return error("INVALID_INPUT", "Invalid selection JSON.", 400);
  } finally {
    reader.releaseLock();
  }
  const selected = selectionSchema.safeParse(body);
  if (!selected.success)
    return error(
      "INVALID_INPUT",
      "Review the reference before selecting a bundled case and provider.",
      422
    );
  const { cases, datasetHash } = loadCases();
  const item = cases.find((c) => c.id === selected.data.caseId);
  if (!item || item.referenceHash !== selected.data.referenceHash)
    return error(
      "REFERENCE_MISMATCH",
      "The case or reference changed. Reload and review it.",
      409
    );
  const provider = profiles().find((p) => p.id === selected.data.providerId)!;
  const suppliedKey = request.headers.get("x-ai-key")?.trim();
  const config = configurationFor(provider.id, item.language);
  const metadata = {
    studyVersion: STUDY_VERSION,
    datasetHash,
    caseId: item.id,
    language: item.language,
    inputHash: item.inputHash,
    referenceHash: item.referenceHash,
    configurationHash: config.hash,
    providerId: provider.id,
    modelRequested: config.model,
  };
  const handler = createHandler({
    enabled: true,
    configured: provider.configured || !!suppliedKey,
    provenance: config.provenance,
    modelRequested: config.model,
    unavailableMessage:
      "Configure " +
      provider.keyName +
      " on the server and restart it. Key presence does not prove access.",
    generate: (input, signal) =>
      suppliedKey
        ? generateBenchmark(
            provider.id,
            item.language,
            input,
            signal,
            suppliedKey
          )
        : generateBenchmark(provider.id, item.language, input, signal),
    async record(record) {
      const directory = path.join(process.cwd(), ".benchmark-runs");
      await mkdir(directory, { recursive: true });
      await writeFile(
        path.join(directory, record.attemptId + ".json"),
        JSON.stringify(
          {
            ...metadata,
            settings: config.settings,
            referenceReviewed: true,
            record,
          },
          null,
          2
        ) + "\n",
        { encoding: "utf8", flag: "wx" }
      );
    },
  });
  const result = await handler(
    new Request(request.url, {
      method: "POST",
      signal: request.signal,
      body: JSON.stringify(item.input),
      headers: { "Content-Type": "application/json" },
    })
  );
  return Response.json(
    { ...metadata, result: await result.json() },
    { status: result.status, headers: { "Cache-Control": "no-store" } }
  );
}
