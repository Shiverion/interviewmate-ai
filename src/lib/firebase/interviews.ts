import { db, storage } from "./config";
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    getDocs,
    orderBy,
    doc,
    updateDoc,
    setDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export interface InterviewTemplate {
    id?: string;
    recruiter_id: string;
    job_title: string;
    job_description: string;
    created_at?: any;
}

export interface InterviewSession {
    id?: string;
    template_id: string;
    recruiter_id: string;
    candidate_name: string;
    candidate_id: string; // Human-readable unique ID (e.g. CAND-1234)
    candidate_email?: string;
    resume_url: string; // The download URL or storage path
    status: "active" | "completed" | "revoked";
    allowed_modes: "audio_only" | "audio_and_text"; // Added for Interview Mode Config
    valid_from?: any; // Firestore Timestamp
    expires_at: any; // Firestore Timestamp
    created_at?: any;
}

/**
 * Creates a new interview template and session, and uploads the candidate CV.
 */
export async function createScheduledInterview(
    recruiterId: string,
    jobTitle: string,
    jobDescription: string,
    candidateName: string,
    candidateId: string,
    candidateEmail: string,
    resumeFile: File,
    startDate: Date,
    endDate: Date,
    allowedModes: "audio_only" | "audio_and_text" = "audio_and_text"
): Promise<string> {

    // 1. Create the Template
    const templateData = {
        recruiter_id: recruiterId,
        job_title: jobTitle,
        job_description: jobDescription,
        created_at: serverTimestamp()
    };

    // 2. We need a session ID to organize the storage folder
    const sessionsCol = collection(db, "interview_sessions");
    const sessionRef = doc(sessionsCol); // auto-generate ID

    // 3. Prepare Storage Reference
    const fileExtension = resumeFile.name.split('.').pop();
    const storagePath = `resumes/${sessionRef.id}/${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, storagePath);

    // 4. Parallelize Template DB Creation & Resume Storage Upload
    const [templateRef, _] = await Promise.all([
        addDoc(collection(db, "interview_templates"), templateData),
        uploadBytes(storageRef, resumeFile)
    ]);

    const downloadUrl = await getDownloadURL(storageRef);

    // 5. Create the Session
    const sessionData: InterviewSession = {
        template_id: templateRef.id,
        recruiter_id: recruiterId,
        candidate_name: candidateName,
        candidate_id: candidateId,
        candidate_email: candidateEmail,
        resume_url: downloadUrl,
        status: "active",
        allowed_modes: allowedModes,
        valid_from: startDate,
        expires_at: endDate,
        created_at: serverTimestamp()
    };

    // Save the uniquely generated session ID document
    await setDoc(sessionRef, sessionData);

    // Return the generated Session ID so the UI can show the active link
    return sessionRef.id;
}

/**
 * Revoke an active interview link immediately
 */
export async function revokeInterviewSession(sessionId: string): Promise<void> {
    const sessionRef = doc(db, "interview_sessions", sessionId);
    await updateDoc(sessionRef, {
        status: "revoked",
        expires_at: new Date() // Expire it immediately
    });
}
