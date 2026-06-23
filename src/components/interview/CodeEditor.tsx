"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { db } from "@/lib/firebase/config";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface CodeEditorProps {
    sessionId: string;
    isCandidate: boolean;
}

const SYNC_INTERVAL_MS = 2000;

export default function CodeEditor({ sessionId, isCandidate }: CodeEditorProps) {
    const [code, setCode] = useState("// Start coding here...\n");
    const [language, setLanguage] = useState("javascript");
    const [isSaving, setIsSaving] = useState(false);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isRemoteUpdate = useRef(false);
    const isDemoSession = sessionId.startsWith("demo-");

    // Listen for remote updates (recruiter watching live)
    useEffect(() => {
        if (isDemoSession) return;
        const codeRef = doc(db, "interview_code", sessionId);
        const unsub = onSnapshot(codeRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            if (data.language && data.language !== language) setLanguage(data.language);
            if (data.code !== undefined && isCandidate === false) {
                // Recruiter receiving live updates
                isRemoteUpdate.current = true;
                setCode(data.code);
            }
        });
        return () => unsub();
    }, [sessionId, isDemoSession, isCandidate, language]);

    const syncToFirestore = (newCode: string, newLang: string) => {
        if (isDemoSession || !isCandidate) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            setIsSaving(true);
            try {
                const codeRef = doc(db, "interview_code", sessionId);
                await setDoc(codeRef, {
                    code: newCode,
                    language: newLang,
                    updated_at: new Date().toISOString()
                }, { merge: true });
            } catch (e) {
                console.error("Code sync error:", e);
            } finally {
                setIsSaving(false);
            }
        }, SYNC_INTERVAL_MS);
    };

    const handleEditorChange = (value: string | undefined) => {
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }
        const newCode = value ?? "";
        setCode(newCode);
        syncToFirestore(newCode, language);
    };

    const handleLanguageChange = (lang: string) => {
        setLanguage(lang);
        syncToFirestore(code, lang);
    };

    const languages = [
        "javascript", "typescript", "python", "java", "cpp", "go", "rust",
        "sql", "html", "css", "bash", "json"
    ];

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] rounded-xl overflow-hidden border border-[var(--border)]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3d3d3d] shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Code Editor</span>
                    {!isCandidate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/20 text-accent-400 border border-accent-500/30 font-medium">LIVE</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {isSaving && (
                        <span className="text-[10px] text-gray-500 animate-pulse">syncing...</span>
                    )}
                    {isCandidate && (
                        <select
                            value={language}
                            onChange={e => handleLanguageChange(e.target.value)}
                            className="text-xs bg-[#3d3d3d] text-gray-300 border border-[#4d4d4d] rounded px-2 py-1 outline-none focus:border-primary-500 transition-colors"
                        >
                            {languages.map(l => (
                                <option key={l} value={l}>{l}</option>
                            ))}
                        </select>
                    )}
                    {!isCandidate && (
                        <span className="text-xs text-gray-400 font-mono">{language}</span>
                    )}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 min-h-0">
                <MonacoEditor
                    height="100%"
                    language={language}
                    value={code}
                    theme="vs-dark"
                    onChange={handleEditorChange}
                    options={{
                        readOnly: !isCandidate,
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        wordWrap: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 12 },
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        smoothScrolling: true
                    }}
                />
            </div>
        </div>
    );
}
