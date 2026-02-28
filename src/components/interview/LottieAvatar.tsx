"use client";

import { useEffect, useState, useMemo } from "react";
import Lottie from "lottie-react";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

interface LottieAvatarProps {
    state: AvatarState;
    className?: string;
}

export default function LottieAvatar({ state, className = "" }: LottieAvatarProps) {
    const [animations, setAnimations] = useState<Record<string, unknown>>({});
    const [isLoading, setIsLoading] = useState(true);

    // Fetch all 4 animations on mount so transitions are instant
    useEffect(() => {
        let mounted = true;

        async function loadAnimations() {
            try {
                const [idle, listening, thinking, speaking] = await Promise.all([
                    fetch("/animations/idle.json").then((r) => r.json()),
                    fetch("/animations/listening.json").then((r) => r.json()),
                    fetch("/animations/thinking.json").then((r) => r.json()),
                    fetch("/animations/speaking.json").then((r) => r.json()),
                ]);

                if (mounted) {
                    setAnimations({
                        idle,
                        listening,
                        thinking,
                        speaking,
                    });
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Failed to load Lottie animations:", err);
            }
        }

        loadAnimations();

        return () => {
            mounted = false;
        };
    }, []);

    if (isLoading) {
        return (
            <div className={`relative flex items-center justify-center ${className}`}>
                <div className="h-32 w-32 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden flex items-center justify-center ${className}`}>
            {/* 
        We render all 4 states on top of each other and fade between them.
        This completely eliminates the "flicker" that occurs when swapping animationData dynamically.
      */}
            {(Object.keys(animations) as AvatarState[]).map((animState) => {
                const isActive = state === animState;
                return (
                    <div
                        key={animState}
                        className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${isActive ? "opacity-100 z-10" : "opacity-0 z-0"
                            }`}
                    >
                        <Lottie
                            animationData={animations[animState]}
                            loop={true}
                            autoplay={isActive}
                            className="w-full h-full"
                        />
                    </div>
                );
            })}
        </div>
    );
}
