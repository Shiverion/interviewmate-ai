import type { Timestamp, FieldValue } from "firebase/firestore";
import { db, storage } from "./config";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
  status: "active" | "completed" | "revoked";
  allowed_modes: "audio_only" | "audio_and_text";
  visual_panel?: VisualPanel;
  valid_from?: Timestamp | FieldValue | Date;
  expires_at: Timestamp | Date;
  created_at?: Timestamp | FieldValue | Date;
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
  cvParsing?: ParsingResult
): Promise<string> {
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
  const storagePath = `resumes/${sessionRef.id}/${Date.now()}.${fileExtension}`;
  const storageRef = ref(storage, storagePath);

  const [templateRef] = await Promise.all([
    addDoc(collection(db, "interview_templates"), templateData),
    resumeFile ? uploadBytes(storageRef, resumeFile) : Promise.resolve(),
  ]);

  const downloadUrl = resumeFile ? await getDownloadURL(storageRef) : "";

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
    template_id: templateRef.id,
    recruiter_id: recruiterId,
    candidate_name: candidateName,
    candidate_id: candidateId,
    candidate_email: candidateEmail,
    resume_url: downloadUrl,
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
