import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
    return (
        <main className="relative overflow-hidden" aria-label="InterviewMate AI Landing Page">
            {/* Hero section */}
            <section className="relative mx-auto max-w-7xl px-4 pt-24 pb-32 sm:px-6 lg:px-8" aria-label="Hero Section">
                {/* Background gradient blobs */}
                <div className="absolute top-0 left-1/4 -z-10 h-72 w-72 rounded-full bg-primary-500/20 blur-[100px]" aria-hidden="true" />
                <div className="absolute top-20 right-1/4 -z-10 h-64 w-64 rounded-full bg-accent-500/15 blur-[80px]" aria-hidden="true" />

                <div className="text-center animate-fade-in flex flex-col items-center">
                    {/* Brand Logo */}
                    <div className="relative mb-8 animate-slide-down">
                        <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full" />
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] p-3 shadow-2xl border border-white/10 overflow-hidden">
                            <Image
                                src="/logo.png"
                                alt="InterviewMate Logo"
                                width={80}
                                height={80}
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-sm font-medium text-primary-400 mb-8" role="status">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse-soft" aria-hidden="true" />
                        AI-Powered Screening • Powered by GPT-4o
                    </div>

                    {/* Heading */}
                    <h1 className="text-4xl font-extrabold font-heading tracking-tight sm:text-6xl lg:text-7xl mb-6">
                        Meet Your Virtual
                        <br />
                        <span className="gradient-text">InterviewMate AI</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="mx-auto max-w-2xl text-lg text-[var(--muted)] leading-relaxed">
                        Automate first-round candidate screening with an interactive AI
                        interviewer. Natural voice conversations, objective evaluation, and instant results.
                    </p>

                    {/* CTA Buttons */}
                    <nav className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center" aria-label="Call to Action Navigation">
                        <Link
                            href="/dashboard"
                            aria-label="Get Started with InterviewMate AI Dashboard"
                            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5"
                        >
                            Get Started
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                                />
                            </svg>
                        </Link>
                        <Link
                            href="#features"
                            aria-label="Learn More about AI Features"
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-8 py-3.5 text-base font-semibold text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-elevated)] hover:-translate-y-0.5"
                        >
                            Learn More
                        </Link>
                    </nav>
                </div>

                {/* Feature cards */}
                <div
                    id="features"
                    className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    role="list"
                    aria-label="Core Features"
                >
                    {[
                        {
                            title: "AI Virtual Interviewer",
                            description:
                                "An animated 2D avatar conducts adaptive interviews with natural voice conversations.",
                            icon: "🎙️",
                        },
                        {
                            title: "Smart Evaluation",
                            description:
                                "Automatic scoring on communication, reasoning, and relevance with detailed rubric feedback.",
                            icon: "📊",
                        },
                        {
                            title: "Candidate Insights",
                            description:
                                "Ranked dashboard with transcripts, scores, and AI-generated summaries for every candidate.",
                            icon: "🏆",
                        },
                    ].map((feature, i) => (
                        <article
                            key={feature.title}
                            role="listitem"
                            className={`glass-card p-6 animate-slide-up delay-${(i + 1) * 100} hover:shadow-[var(--shadow-dramatic)] transition-shadow duration-300`}
                        >
                            <div className="text-3xl mb-4" aria-hidden="true">{feature.icon}</div>
                            <h3 className="text-lg font-semibold font-heading mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-[var(--muted)] leading-relaxed">
                                {feature.description}
                            </p>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
