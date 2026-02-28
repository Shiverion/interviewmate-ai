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
    default: "InterviewMate AI",
    template: "%s | InterviewMate AI",
  },
  description:
    "AI-powered candidate screening platform with interactive voice interviews and a virtual assistant.",
  keywords: [
    "AI interview",
    "candidate screening",
    "hiring automation",
    "virtual interviewer",
    "recruitment software"
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "InterviewMate AI | The Future of Hiring",
    description: "Automate your top-of-funnel candidate screening with interactive, bilingual AI voice interviews.",
    siteName: "InterviewMate AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "InterviewMate AI",
    description: "AI-powered candidate screening platform with interactive voice interviews.",
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
