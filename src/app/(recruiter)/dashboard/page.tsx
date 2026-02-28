export default function DashboardPage() {
    return (
        <div className="animate-fade-in">
            {/* Page header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-heading tracking-tight">
                    Dashboard
                </h1>
                <p className="mt-2 text-[var(--muted)]">
                    Overview of your interview sessions and candidate pipeline.
                </p>
            </div>

            {/* Stats grid placeholder */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: "Active Interviews", value: "—", color: "primary" },
                    { label: "Candidates Screened", value: "—", color: "accent" },
                    { label: "Avg. Score", value: "—", color: "primary" },
                    { label: "Completion Rate", value: "—", color: "accent" },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="glass-card p-6 animate-slide-up"
                    >
                        <p className="text-sm font-medium text-[var(--muted)]">
                            {stat.label}
                        </p>
                        <p className="mt-2 text-3xl font-bold font-heading gradient-text">
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Recent activity placeholder */}
            <div className="mt-8 glass-card p-6 animate-slide-up delay-200">
                <h2 className="text-xl font-semibold font-heading mb-4">
                    Recent Activity
                </h2>
                <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)]">
                    <svg
                        className="h-12 w-12 mb-3 text-[var(--muted-foreground)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                        />
                    </svg>
                    <p className="text-sm">
                        No interviews yet. Create your first session to get started.
                    </p>
                </div>
            </div>
        </div>
    );
}
