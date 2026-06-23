"use client";

import { useEffect, useRef } from "react";

interface CodeReviewProps {
    diff: string;
}

export default function CodeReview({ diff }: CodeReviewProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !diff) return;

        import("diff2html").then(({ html }) => {
            const diffHtml = html(diff, {
                drawFileList: false,
                matching: "lines",
                outputFormat: "side-by-side",
                renderNothingWhenEmpty: false
            });
            if (containerRef.current) {
                containerRef.current.innerHTML = diffHtml;
            }
        });

        // Inject diff2html CSS dynamically
        const styleId = "diff2html-css";
        if (!document.getElementById(styleId)) {
            const link = document.createElement("link");
            link.id = styleId;
            link.rel = "stylesheet";
            link.href = "https://cdnjs.cloudflare.com/ajax/libs/diff2html/3.4.48/bundles/css/diff2html.min.css";
            document.head.appendChild(link);
        }
    }, [diff]);

    if (!diff) {
        return (
            <div className="flex items-center justify-center h-full text-[var(--muted)] italic text-sm">
                No code diff provided for this session.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[var(--background)] rounded-xl overflow-hidden border border-[var(--border)]">
            <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface-elevated)] border-b border-[var(--border)] shrink-0">
                <span className="text-xs font-mono text-[var(--muted)] uppercase tracking-wider">Code Review</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">Review & Critique</span>
            </div>
            <div
                ref={containerRef}
                className="flex-1 min-h-0 overflow-auto p-2 diff2html-wrapper"
                style={{ fontSize: "12px" }}
            />
        </div>
    );
}
