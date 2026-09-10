"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { InterviewSession } from "@/lib/firebase/interviews";
import {
  defaultConfiguration,
  type InterviewConfiguration,
} from "@/lib/interview/config";
import type { ParsingResult } from "@/lib/pdf/result";

export type AtsScore = NonNullable<InterviewSession["ats_score"]>;
export type CandidateStatus = "queued" | "parsing" | "scoring" | "ready" | "error";
export type InviteStatus = "idle" | "creating" | "created" | "error";

export type PipelineCandidate = {
  id: string;
  file: File;
  fileName: string;
  candidateName: string;
  candidateEmail: string;
  resumeText: string;
  parsing?: ParsingResult;
  atsScore?: AtsScore;
  status: CandidateStatus;
  inviteStatus: InviteStatus;
  sessionId?: string;
  pipelineId?: string;
  error?: string;
  selected: boolean;
};

export type PipelineDraft = {
  jobTitle: string;
  jobDescription: string;
  configuration: InterviewConfiguration;
  candidates: PipelineCandidate[];
  topLimit: "all" | "5" | "10" | "20";
  starts: string;
  ends: string;
};

export const MAX_FILES = 50;

function localDateTime(ms: number) {
  const date = new Date(ms);
  return new Date(ms - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function initialDraft(): PipelineDraft {
  return {
    jobTitle: "",
    jobDescription: "",
    configuration: defaultConfiguration(),
    candidates: [],
    topLimit: "20",
    starts: localDateTime(Date.now() - 60000),
    ends: localDateTime(Date.now() + 3 * 86400000),
  };
}

const PipelineDraftContext = createContext<{
  draft: PipelineDraft;
  setDraft: Dispatch<SetStateAction<PipelineDraft>>;
} | null>(null);

export function PipelineDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<PipelineDraft>(initialDraft);
  const value = useMemo(() => ({ draft, setDraft }), [draft]);
  return (
    <PipelineDraftContext.Provider value={value}>
      {children}
    </PipelineDraftContext.Provider>
  );
}

export function usePipelineDraft() {
  const value = useContext(PipelineDraftContext);
  if (!value) {
    throw new Error("usePipelineDraft must be used inside PipelineDraftProvider");
  }
  return value;
}
