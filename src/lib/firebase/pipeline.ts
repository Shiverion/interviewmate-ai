import { where, collection, doc, deleteDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./config";
import { isWorkspaceAdmin } from "./access";
import type { ParsingResult } from "@/lib/pdf/result";
import type { InterviewSession } from "./interviews";
import type { InterviewConfiguration } from "@/lib/interview/config";

export type PipelineStatus = "screened" | "invited" | "not_invited";
export type PipelineAtsScore = NonNullable<InterviewSession["ats_score"]>;

export type PipelineCandidate = {
  id: string;
  recruiter_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string;
  job_description: string;
  configuration?: InterviewConfiguration;
  file_name: string;
  resume_text: string;
  cv_parsing?: ParsingResult;
  ats_score: PipelineAtsScore;
  status: PipelineStatus;
  session_id?: string;
  created_at?: { toMillis: () => number };
  updated_at?: { toMillis: () => number };
};

export function pipelineScope(user: { uid: string; email: string | null; emailVerified: boolean }) {
  return isWorkspaceAdmin(user) ? [] : [where("recruiter_id", "==", user.uid)];
}

export async function savePipelineCandidate(
  recruiterId: string,
  candidate: Omit<PipelineCandidate, "id" | "recruiter_id" | "created_at" | "updated_at">
) {
  const ref = doc(collection(db, "pipeline_candidates"));
  await setDoc(ref, {
    ...candidate,
    recruiter_id: recruiterId,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePipelineCandidate(
  id: string,
  data: Partial<Pick<PipelineCandidate, "status" | "session_id" | "candidate_name" | "candidate_email" | "job_title" | "job_description" | "configuration" | "file_name" | "resume_text" | "cv_parsing" | "ats_score">>
) {
  await updateDoc(doc(db, "pipeline_candidates", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export async function deletePipelineCandidate(id: string) {
  await deleteDoc(doc(db, "pipeline_candidates", id));
}
