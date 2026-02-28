import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { KeyProvider } from "@/components/providers/KeyProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://interviewmate-ai.vercel.app"),
  title: {
    default: "InterviewMate AI | Professional AI Screening",
    template: "%s | InterviewMate AI",
  },
  description:
    "Automate first-round candidate screening with interactive AI voice interviews, objective scoring, and ranked recruiter dashboards.",
  keywords: [
    "AI interview",
    "InterviewMate AI",
    "candidate screening",
    "hiring automation",
    "virtual interviewer",
    "recruitment software",
    "automated hiring",
    "GPT-4o interviews"
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "InterviewMate AI | The Future of Automated Hiring",
    description: "Scale your recruitment with interactive, AI-driven candidate screening. Natural voice conversations and instant evaluation.",
    siteName: "InterviewMate AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "InterviewMate AI",
    description: "Automate candidate screening with interactive AI voice interviews.",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} antialiased min-h-screen`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <KeyProvider>{children}</KeyProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
