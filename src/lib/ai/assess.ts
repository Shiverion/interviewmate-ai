import { type AIProvider, PROVIDERS } from "./catalog";
import {
  EVIDENCE_PROMPT,
  evidenceDraftSchema,
  eligibleEvidence,
  finalizeEvidence,
  type EvidenceLine,
} from "./evidence";
import { evaluateWithProvider } from "./evaluation";
import { providerDiagnostic, recordProvider } from "./health";
import { type InterviewConfiguration } from "@/lib/interview/config";
export async function assessEvidence(
  provider: AIProvider,
  key: string | undefined,
  lines: EvidenceLine[],
  configuration: InterviewConfiguration,
  options: {
    host?: boolean;
    fallbackKeys?: Partial<Record<AIProvider, string>>;
    jobContext?: { role?: string; cvText?: string };
  } = {}
) {
  if (!eligibleEvidence(lines))
    return {
      object: finalizeEvidence({ competencies: [] }, lines, configuration),
      provider: "none",
      model: "deterministic-no-evidence",
      diagnostic: null,
    };
  const choices = [
    provider,
    ...PROVIDERS.map((p) => p.id).filter(
      (p) => p !== provider && options.fallbackKeys?.[p]
    ),
  ];
  let failure = "Evaluation unavailable. Check provider access and retry.";
  for (const [index, choice] of choices.entries()) {
    const credential = index === 0 ? key : options.fallbackKeys?.[choice];
    if (!credential) {
      failure = "Add a key for the selected evaluation provider.";
      continue;
    }
    const model =
      process.env[`EVALUATION_${choice.toUpperCase()}_MODEL`] ||
      PROVIDERS.find((p) => p.id === choice)!.model;
    try {
      const result = await evaluateWithProvider(
        choice,
        credential,
        evidenceDraftSchema,
        EVIDENCE_PROMPT,
        JSON.stringify({
          rubric: configuration.competencies,
          role: options.jobContext?.role?.slice(0, 6500) || "",
          validatedCvContext: options.jobContext?.cvText?.slice(0, 24000) || "",
          transcript: lines.map((l, i) => ({ turn: i + 1, ...l })),
        })
      );
      const object = finalizeEvidence(result.object, lines, configuration);
      const diagnostic = recordProvider(
        providerDiagnostic(choice, result.model, 200, provider, index > 0),
        !!options.host
      );
      return { ...result, object, diagnostic };
    } catch (e) {
      const status =
        typeof e === "object" && e !== null && "statusCode" in e
          ? Number(e.statusCode)
          : e instanceof Error && /\b(401|403|429)\b/.test(e.message)
            ? Number(e.message.match(/\b(401|403|429)\b/)?.[1])
            : 502;
      recordProvider(
        providerDiagnostic(choice, model, status, provider, index > 0),
        !!options.host
      );
      failure =
        status === 401 || status === 403
          ? "Evaluation credentials rejected."
          : status === 429
            ? "Evaluation provider rate limited this request."
            : "Evaluation failed validation or provider access. No score was saved.";
    }
  }
  throw Error(failure);
}
