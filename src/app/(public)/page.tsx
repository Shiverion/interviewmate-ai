import Link from "next/link";

export default function HomePage() {
    return (
        <div className="relative overflow-hidden">
            {/* Hero section */}
            <section className="relative mx-auto max-w-7xl px-4 pt-20 pb-32 sm:px-6 lg:px-8">
                {/* Background gradient blobs */}
                <div className="absolute top-0 left-1/4 -z-10 h-72 w-72 rounded-full bg-primary-500/20 blur-[100px]" />
                <div className="absolute top-20 right-1/4 -z-10 h-64 w-64 rounded-full bg-accent-500/15 blur-[80px]" />

                <div className="text-center animate-fade-in">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-sm font-medium text-primary-400 mb-8">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse-soft" />
                        AI-Powered Screening
                    </div>

                    {/* Heading */}
                    <h1 className="text-4xl font-bold font-heading tracking-tight sm:text-5xl lg:text-6xl">
                        Meet Your Virtual
                        <br />
                        <span className="gradient-text">Interview Assistant</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted)] leading-relaxed">
                        Automate first-round candidate screening with an interactive AI
                        avatar. Voice conversations, smart evaluation, instant results.
                    </p>

                    {/* CTA Buttons */}
                    <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5"
                        >
                            Get Started
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
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
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-8 py-3.5 text-base font-semibold text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-elevated)] hover:-translate-y-0.5"
                        >
                            Learn More
                        </Link>
                    </div>
                </div>

                {/* Feature cards */}
                <div
                    id="features"
                    className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
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
                        <div
                            key={feature.title}
                            className={`glass-card p-6 animate-slide-up delay-${(i + 1) * 100} hover:shadow-[var(--shadow-dramatic)] transition-shadow duration-300`}
                        >
                            <div className="text-3xl mb-4">{feature.icon}</div>
                            <h3 className="text-lg font-semibold font-heading mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-[var(--muted)] leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
