import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { draftSchema, ROLE_VERSION, VERSION } from "./contract";
import { createHandler, GenerationFailure, type ModelResult } from "./handler";
import { MODEL, type Provenance } from "./types";

import { evaluationOptions } from "../ai/model-policy";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
export function getBootstrap() {
  const root = path.join(process.cwd(), "src/lib/review-brief");
  const role = JSON.stringify(
    JSON.parse(readFileSync(path.join(root, "role-profile.json"), "utf8"))
  );
  const prompt = readFileSync(path.join(root, "prompt.md"), "utf8");
  const system = `${prompt}\n\nTRUSTED_ROLE_PROFILE_JSON:\n${role}`;
  const provenance: Provenance = {
    contractVersion: VERSION,
    contractHash: sha(readFileSync(path.join(root, "contract.ts"), "utf8")),
    roleVersion: ROLE_VERSION,
    roleHash: sha(role),
    promptVersion: VERSION,
    promptHash: sha(system),
  };
  return {
    provenance,
    configured: !!process.env.OPENAI_API_KEY?.trim(),
    system,
  };
}
export function localHandler(reviewerAuthorized = false) {
  const bootstrap = getBootstrap();
  return createHandler({
    enabled: reviewerAuthorized || process.env.NODE_ENV === "development",
    configured: bootstrap.configured,
    provenance: bootstrap.provenance,
    async generate(input, signal): Promise<ModelResult> {
      let refusal: string | null = null;
      try {
        const result = await generateText({
          model: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }).chat(
            MODEL
          ),
          system: bootstrap.system,
          prompt: JSON.stringify(input),
          output: Output.object({ schema: draftSchema }),
          providerOptions: evaluationOptions("openai"),
          maxOutputTokens: 6000,
          maxRetries: 0,
          abortSignal: signal,
          onStepFinish(step) {
            const body = step.response.body as
              | { choices?: { message?: { refusal?: unknown } }[] }
              | undefined;
            const value = body?.choices?.[0]?.message?.refusal;
            if (typeof value === "string" && value.length > 0) refusal = value;
          },
        });
        // Only allowlisted response fields enter local records; never serialize the SDK response/request object.
        return {
          output: result.output,
          rawOutput: result.text,
          modelReturned: result.response.modelId ?? null,
          responseId: result.response.id ?? null,
          finishReason: result.finishReason ?? null,
          usage: {
            inputTokens: result.usage.inputTokens ?? null,
            outputTokens: result.usage.outputTokens ?? null,
          },
        };
      } catch (error) {
        if (
          refusal ||
          (NoObjectGeneratedError.isInstance(error) &&
            error.finishReason === "content-filter")
        )
          throw new GenerationFailure(
            "MODEL_REFUSAL",
            502,
            "The model declined to produce this draft. No partial draft was opened.",
            false,
            refusal
          );
        if (NoObjectGeneratedError.isInstance(error)) {
          throw new GenerationFailure(
            "INVALID_OUTPUT",
            502,
            "The provider returned no valid structured draft. No partial draft was opened.",
            true,
            error.text ?? null
          );
        }
        if (APICallError.isInstance(error)) {
          if (error.statusCode === 429)
            throw new GenerationFailure(
              "RATE_LIMITED",
              429,
              "The provider rate limit was reached. Retry explicitly later.",
              true
            );
          if ([401, 403, 404].includes(error.statusCode ?? 0))
            throw new GenerationFailure(
              "AI_UNAVAILABLE",
              503,
              "The server key or requested model is unavailable. Check the local configuration.",
              true
            );
        }
        throw new GenerationFailure(
          "PROVIDER_ERROR",
          502,
          "The provider could not complete the attempt.",
          true
        );
      }
    },
    async record(record) {
      const directory = path.join(process.cwd(), ".review-brief-runs");
      await mkdir(directory, { recursive: true });
      await writeFile(
        path.join(directory, `${record.attemptId}.json`),
        JSON.stringify(record, null, 2) + "\n",
        { encoding: "utf8", flag: "wx" }
      );
    },
  });
}
