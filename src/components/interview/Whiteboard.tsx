"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { db } from "@/lib/firebase/config";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

interface DrawPoint {
    x: number;
    y: number;
    type: "start" | "draw" | "end";
    color: string;
    size: number;
}

interface WhiteboardProps {
    sessionId: string;
    isCandidate: boolean;
}

const SYNC_INTERVAL_MS = 1500;
const COLORS = ["#e2e8f0", "#60a5fa", "#34d399", "#f87171", "#fbbf24", "#a78bfa", "#fb7185"];

export default function Whiteboard({ sessionId, isCandidate }: WhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState("#e2e8f0");
    const [brushSize, setBrushSize] = useState(3);
    const [tool, setTool] = useState<"pen" | "eraser">("pen");
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDemoSession = sessionId.startsWith("demo-");

    const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

    const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let clientX: number, clientY: number;
        if ("touches" in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const syncToFirestore = useCallback(() => {
        if (isDemoSession || !isCandidate || !canvasRef.current) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            try {
                const dataUrl = canvasRef.current?.toDataURL("image/png", 0.7) ?? "";
                const wbRef = doc(db, "interview_whiteboard", sessionId);
                await setDoc(wbRef, { snapshot: dataUrl, updated_at: new Date().toISOString() }, { merge: true });
            } catch (e) {
                console.error("Whiteboard sync error:", e);
            }
        }, SYNC_INTERVAL_MS);
    }, [sessionId, isDemoSession, isCandidate]);

    // Recruiter live view via Firestore snapshots
    useEffect(() => {
        if (isDemoSession || isCandidate) return;
        const wbRef = doc(db, "interview_whiteboard", sessionId);
        const unsub = onSnapshot(wbRef, (snap) => {
            if (!snap.exists()) return;
            const { snapshot } = snap.data();
            if (!snapshot || !canvasRef.current) return;
            const img = new Image();
            img.onload = () => {
                const ctx = getCtx();
                if (!ctx || !canvasRef.current) return;
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = snapshot;
        });
        return () => unsub();
    }, [sessionId, isDemoSession, isCandidate]);

    // Initialize canvas background
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isCandidate) return;
        e.preventDefault();
        const { x, y } = getCanvasPos(e);
        const ctx = getCtx();
        if (!ctx) return;
        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = tool === "eraser" ? "#1a1a2e" : color;
        ctx.lineWidth = tool === "eraser" ? 20 : brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !isCandidate) return;
        e.preventDefault();
        const { x, y } = getCanvasPos(e);
        const ctx = getCtx();
        if (!ctx) return;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const endDraw = () => {
        if (!isCandidate) return;
        setIsDrawing(false);
        syncToFirestore();
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!ctx || !canvas) return;
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        syncToFirestore();
    };

    return (
        <div className="flex flex-col h-full bg-[#1a1a2e] rounded-xl overflow-hidden border border-[var(--border)]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#16213e] border-b border-[#2a2a4e] shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Whiteboard</span>
                    {!isCandidate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/20 text-accent-400 border border-accent-500/30 font-medium">LIVE</span>
                    )}
                </div>

                {isCandidate && (
                    <div className="flex items-center gap-3">
                        {/* Color Swatches */}
                        <div className="flex items-center gap-1">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => { setColor(c); setTool("pen"); }}
                                    className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${color === c && tool === "pen" ? "border-white scale-110" : "border-transparent"}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>

                        {/* Brush sizes */}
                        <div className="flex items-center gap-1">
                            {[2, 4, 8].map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setBrushSize(s); setTool("pen"); }}
                                    className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${brushSize === s && tool === "pen" ? "bg-primary-500/30 border border-primary-500" : "hover:bg-white/10"}`}
                                >
                                    <div className="rounded-full bg-white" style={{ width: s * 1.5, height: s * 1.5 }} />
                                </button>
                            ))}
                        </div>

                        {/* Eraser */}
                        <button
                            onClick={() => setTool("eraser")}
                            className={`text-xs px-2 py-1 rounded transition-colors ${tool === "eraser" ? "bg-primary-500/30 text-primary-300 border border-primary-500" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                        >
                            Eraser
                        </button>

                        {/* Clear */}
                        <button
                            onClick={clearCanvas}
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/30"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Canvas */}
            <div className="flex-1 min-h-0 relative overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={1200}
                    height={800}
                    className="w-full h-full"
                    style={{ cursor: !isCandidate ? "default" : tool === "eraser" ? "cell" : "crosshair", touchAction: "none" }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                />
                {!isCandidate && (
                    <div className="absolute bottom-3 left-3 text-xs text-gray-500 bg-black/40 px-2 py-1 rounded">
                        Read-only — candidate is drawing
                    </div>
                )}
            </div>
        </div>
    );
}
