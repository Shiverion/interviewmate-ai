"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MixerHorizontalIcon,
  MoonIcon,
  SunIcon,
  ExitIcon,
} from "@radix-ui/react-icons";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { isWorkspaceAdmin } from "@/lib/firebase/access";
export default function Header() {
  const path = usePathname();
  const { user } = useAuthContext();
  const { theme, toggleTheme } = useTheme();
  const admin = isWorkspaceAdmin(user);
  const links = !user
    ? [
        ["Overview", "/"],
        ["Demo", "/demo"],
        ["Resume check", "/ats-check"],
      ]
    : admin
      ? [
          ["Workspace", "/dashboard"],
          ["Pipeline", "/pipeline"],
          ["Candidates", "/candidates"],
          ["Interview history", "/interviews"],
          ["Feedback", "/feedback"],
          ["Resume check", "/ats-check"],
          ["Models & access", "/settings"],
        ]
      : [
          ["Overview", "/"],
          ["Demo", "/demo"],
          ["Resume check", "/ats-check"],
        ];
  return (
    <header className="wm-header">
      <div className="wm-header-inner">
        <Link
          href={user ? "/dashboard" : "/"}
          className="wm-brand"
        >
          <span className="wm-mark">
            <MixerHorizontalIcon />
          </span>
          interviewmate<span className="wm-tag">Studio</span>
        </Link>
        <nav className="wm-nav" aria-label="Main navigation">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="wm-actions">
          <button
            className="wm-icon"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
          {user ? (
            <button
              className="wm-icon"
              aria-label="Sign out"
              onClick={async () => {
                const { auth } = await import("@/lib/firebase/config");
                const { signOut } = await import("firebase/auth");
                await signOut(auth);
                window.location.href = "/login";
              }}
            >
              <ExitIcon />
            </button>
          ) : (
            <Link href="/login" className="wm-button secondary">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
