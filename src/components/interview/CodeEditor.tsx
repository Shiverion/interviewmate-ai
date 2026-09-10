"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePanelSync, panelSyncMessage } from "./usePanelSync";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface CodeEditorProps {
    sessionId: string;
    isCandidate: boolean;
}

const SYNC_INTERVAL_MS = 2000;

export default function CodeEditor({ sessionId, isCandidate }: CodeEditorProps) {
    const [code, setCode] = useState("// Start coding here...\n");
    const [language, setLanguage] = useState("javascript");
    const sync = usePanelSync(sessionId, "code_workspace", isCandidate, SYNC_INTERVAL_MS);

    const displayedCode = !isCandidate && typeof sync.data?.code === "string" ? sync.data.code : code;
    const displayedLanguage = !isCandidate && typeof sync.data?.language === "string" ? sync.data.language : language;

    const syncToFirestore = (code: string, language: string) => {
        sync.save({ code, language, updated_at: new Date().toISOString() });
    };

    const handleEditorChange = (value: string | undefined) => {
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
                    {!isCandidate && sync.status === "live" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/20 text-accent-400 border border-accent-500/30 font-medium">LIVE</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
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
                        <span className="text-xs text-gray-400 font-mono">{displayedLanguage}</span>
                    )}
                </div>
            </div>

            <p role="status" className="px-4 py-2 text-xs text-gray-400">
                {panelSyncMessage(sync.status, isCandidate)}
            </p>
            {/* Editor */}
            <div className="flex-1 min-h-0">
                <MonacoEditor
                    height="100%"
                    language={displayedLanguage}
                    value={displayedCode}
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
