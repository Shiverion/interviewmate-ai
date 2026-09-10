import type { Timestamp, FieldValue } from "firebase/firestore";
import { db, storage } from "./config";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, deleteObject } from "firebase/storage";
import {
  configurationSchema,
  type InterviewConfiguration,
} from "@/lib/interview/config";
import type { ParsingResult } from "@/lib/pdf/result";

export type VisualPanel = "none" | "code" | "whiteboard" | "code_review";

export interface InterviewTemplate {
  id?: string;
  recruiter_id: string;
  job_title: string;
  job_description: string;
  question_topic?: string;
  question_level?: "easy" | "medium" | "hard";
  question_count?: number;
  custom_questions?: string[];
  preferred_language?: string;
  github_username?: string;
  visual_panel?: VisualPanel;
  code_diff?: string;
  created_at?: Timestamp | FieldValue | Date;
}

export interface InterviewSession {
  role_snapshot?: { job_title: string; job_description: string };
  configuration?: InterviewConfiguration;
  cv_parsing?: ParsingResult;
  id?: string;
  template_id: string;
  recruiter_id: string;
  candidate_name: string;
  candidate_id: string;
  candidate_email?: string;
  resume_url: string;
  resume_storage_path?: string;
  status: "active" | "completed" | "revoked";
  allowed_modes: "audio_only" | "audio_and_text";
  visual_panel?: VisualPanel;
  valid_from?: Timestamp | FieldValue | Date;
  expires_at: Timestamp | Date;
  created_at?: Timestamp | FieldValue | Date;
  source?: "reviewer_invitation";
  invitation_id?: string;
  /** ATS pre-screen snapshot captured when the recruiter creates the link. */
  ats_score?: {
    overall_match: number;
    keyword_match?: number;
    experience_alignment?: number;
    skills_coverage?: number;
    matched_keywords?: string[];
    missing_keywords?: string[];
    red_flags?: string[];
    strengths?: string[];
    summary?: string;
  };
}

export async function createScheduledInterview(
  recruiterId: string,
  jobTitle: string,
  jobDescription: string,
  questionTopic: string,
  questionLevel: "easy" | "medium" | "hard" | "",
  questionCount: number | "",
  customQuestions: string[],
  preferredLanguage: string,
  candidateName: string,
  candidateId: string,
  candidateEmail: string,
  resumeFile: File | null,
  startDate: Date,
  endDate: Date,
  allowedModes: "audio_only" | "audio_and_text" = "audio_and_text",
  githubUsername: string = "",
  visualPanel: VisualPanel = "none",
  codeDiff: string = "",
  configuration?: InterviewConfiguration,
  cvParsing?: ParsingResult,
  atsScore?: InterviewSession["ats_score"]
): Promise<string> {
  if (!candidateEmail.trim())
    throw Error(
      "Enter the candidate’s sign-in email before creating an invitation."
    );
  const templateData = {
    recruiter_id: recruiterId,
    job_title: jobTitle,
    job_description: jobDescription,
    question_topic: questionTopic || "",
    question_level: questionLevel || "",
    question_count: questionCount || "",
    custom_questions: customQuestions || [],
    preferred_language: preferredLanguage || "",
    github_username: githubUsername || "",
    visual_panel: visualPanel,
    code_diff: codeDiff || "",
    created_at: serverTimestamp(),
  };

  const sessionsCol = collection(db, "interview_sessions");
  const sessionRef = doc(sessionsCol);

  const fileExtension = resumeFile?.name.split(".").pop() || "pdf";
  const storagePath = `resumes/${recruiterId}/${sessionRef.id}/${Date.now()}.${fileExtension}`;
  const storageRef = ref(storage, storagePath);

  const [templateRef] = await Promise.all([
    addDoc(collection(db, "interview_templates"), templateData),
    resumeFile ? uploadBytes(storageRef, resumeFile) : Promise.resolve(),
  ]);

  const sessionData: InterviewSession = {
    role_snapshot: { job_title: jobTitle, job_description: jobDescription },
    configuration: configurationSchema.parse(
      configuration || {
        maxTurns: questionCount || 7,
        customQuestions,
        language:
          preferredLanguage === "Bahasa Indonesia"
            ? preferredLanguage
            : "English",
        allowedModes,
        githubUsername,
        visualPanel,
        codeDiff,
      }
    ),
    ...(cvParsing ? { cv_parsing: cvParsing } : {}),
    ...(atsScore ? { ats_score: atsScore } : {}),
    template_id: templateRef.id,
    recruiter_id: recruiterId,
    candidate_name: candidateName,
    candidate_id: candidateId,
    candidate_email: candidateEmail.trim().toLowerCase(),
    resume_url: "",
    ...(resumeFile ? { resume_storage_path: storagePath } : {}),
    status: "active",
    allowed_modes: allowedModes,
    visual_panel: visualPanel,
    valid_from: startDate,
    expires_at: endDate,
    created_at: serverTimestamp(),
  };

  await setDoc(sessionRef, sessionData);
  return sessionRef.id;
}

export async function revokeInterviewSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, "interview_sessions", sessionId);
  await updateDoc(sessionRef, {
    status: "revoked",
    expires_at: new Date(),
  });
}

export async function deleteInterviewSession(
  sessionId: string,
  resumeStoragePath?: string
): Promise<void> {
  if (resumeStoragePath) {
    await deleteObject(ref(storage, resumeStoragePath)).catch((e) => {
      if ((e as { code?: string })?.code !== "storage/object-not-found")
        throw e;
    });
  }
  await deleteDoc(doc(db, "interview_sessions", sessionId));
}

/** Admin's Firebase uid, published once by the admin's own session so
 * reviewer-sourced writes can attribute themselves without hardcoding a uid. */
export async function adminUid(): Promise<string> {
  const snapshot = await getDoc(doc(db, "app_config", "admin"));
  const uid = snapshot.data()?.uid;
  if (typeof uid !== "string" || !uid)
    throw Error(
      "Reviewer access isn't ready yet — ask the administrator to open their Dashboard once first."
    );
  return uid;
}

export async function createReviewerSourcedInterview(
  candidate: { uid: string; email: string },
  jobTitle: string,
  jobDescription: string,
  candidateName: string,
  resumeFile: File | null,
  configuration: InterviewConfiguration,
  cvParsing: ParsingResult | undefined,
  invitationId: string | undefined
): Promise<string> {
  const recruiterId = await adminUid();
  const sessionsCol = collection(db, "interview_sessions");
  const sessionRef = doc(sessionsCol);
  const fileExtension = resumeFile?.name.split(".").pop() || "pdf";
  const storagePath = `resumes/${recruiterId}/${sessionRef.id}/${Date.now()}.${fileExtension}`;
  if (resumeFile) {
    try {
      await uploadBytes(ref(storage, storagePath), resumeFile, {
        contentType: "application/pdf",
      });
    } catch (e) {
      throw Error(
        "Could not upload your CV (" +
          (e instanceof Error ? e.message : "storage error") +
          "). If this persists, continue without CV grounding."
      );
    }
  }
  const now = new Date();
  const sessionData: InterviewSession = {
    role_snapshot: { job_title: jobTitle, job_description: jobDescription },
    configuration: configurationSchema.parse(configuration),
    ...(cvParsing ? { cv_parsing: cvParsing } : {}),
    template_id: "",
    recruiter_id: recruiterId,
    candidate_name: candidateName,
    candidate_id: candidate.uid,
    candidate_email: candidate.email.trim().toLowerCase(),
    resume_url: "",
    ...(resumeFile ? { resume_storage_path: storagePath } : {}),
    status: "active",
    allowed_modes: configuration.allowedModes,
    visual_panel: configuration.visualPanel,
    valid_from: now,
    expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    created_at: serverTimestamp(),
    source: "reviewer_invitation",
    ...(invitationId ? { invitation_id: invitationId } : {}),
  };
  await setDoc(sessionRef, sessionData);
  return sessionRef.id;
}
