"use client";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

interface AIAvatarProps {
    state: AvatarState;
    className?: string;
}

export default function LottieAvatar({ state, className = "" }: AIAvatarProps) {
    // Instead of relying on brittle hand-crafted Lottie json, we use a robust 
    // CSS/SVG animated orb that clearly communicates the 4 states.

    return (
        <div className={`relative flex items-center justify-center ${className}`}>

            {/* Base glowing background */}
            <div className="absolute inset-0 rounded-full blur-3xl opacity-20 bg-primary-500" />

            {/* IDLE STATE */}
            <div className={`absolute inset-0 transition-opacity duration-700 ${state === 'idle' ? 'opacity-100' : 'opacity-0 z-0'}`}>
                <div className="w-full h-full rounded-full border-4 border-gray-400/30 flex items-center justify-center bg-gray-500/10 backdrop-blur-sm">
                    <div className="w-1/2 h-1/2 rounded-full bg-gray-400/50 animate-pulse-soft" />
                </div>
            </div>

            {/* LISTENING STATE */}
            <div className={`absolute inset-0 transition-opacity duration-700 ${state === 'listening' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                <div className="w-full h-full rounded-full border-4 border-primary-500/50 flex items-center justify-center bg-primary-500/10 backdrop-blur-sm shadow-[0_0_40px_rgba(var(--primary-500),0.3)]">
                    <div className="flex gap-2 items-center h-1/3">
                        <div className="w-3 h-full bg-primary-400 rounded-full animate-[bounce_1s_infinite]" />
                        <div className="w-3 h-2/3 bg-primary-400 rounded-full animate-[bounce_1s_infinite_0.2s]" />
                        <div className="w-3 h-1/2 bg-primary-400 rounded-full animate-[bounce_1s_infinite_0.4s]" />
                        <div className="w-3 h-2/3 bg-primary-400 rounded-full animate-[bounce_1s_infinite_0.2s]" />
                        <div className="w-3 h-full bg-primary-400 rounded-full animate-[bounce_1s_infinite]" />
                    </div>
                </div>
            </div>

            {/* THINKING STATE */}
            <div className={`absolute inset-0 transition-opacity duration-700 ${state === 'thinking' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                <div className="w-full h-full rounded-full border-4 border-accent-400/50 flex items-center justify-center bg-accent-400/10 backdrop-blur-sm">
                    <svg className="w-1/2 h-1/2 text-accent-400 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                </div>
            </div>

            {/* SPEAKING STATE */}
            <div className={`absolute inset-0 transition-opacity duration-300 ${state === 'speaking' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                <div className="w-full h-full rounded-full border-4 border-primary-500 flex items-center justify-center bg-primary-500/20 backdrop-blur-sm shadow-[0_0_60px_rgba(var(--primary-500),0.6)] animate-pulse">
                    {/* Center Audio Core */}
                    <div className="relative w-1/2 h-1/2 rounded-full bg-gradient-to-tr from-primary-600 to-accent-400 shadow-inner flex items-center justify-center">
                        <div className="w-full h-full rounded-full border border-white/40 animate-ping opacity-50 absolute" />
                        <div className="w-3/4 h-3/4 rounded-full bg-white/20 animate-pulse" />
                    </div>
                </div>
            </div>

        </div>
    );
}
