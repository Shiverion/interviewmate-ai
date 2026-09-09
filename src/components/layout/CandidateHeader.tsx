"use client";
import { MixerHorizontalIcon, MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "@/components/providers/ThemeProvider";
export default function CandidateHeader() {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="wm-header">
      <div className="wm-header-inner">
        <div className="wm-brand">
          <span className="wm-mark">
            <MixerHorizontalIcon />
          </span>
          interviewmate
        </div>
        <div className="wm-actions">
          <span className="wm-tag">Interview room</span>
          <button
            className="wm-icon"
            aria-label="Change color theme"
            onClick={toggleTheme}
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}
