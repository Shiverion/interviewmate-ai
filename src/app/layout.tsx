import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
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
  ],
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
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
