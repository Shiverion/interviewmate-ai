import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "@radix-ui/react-icons";
export default function HomePage() {
  return (
    <div className="wm-page">
      <section className="wm-hero-grid">
        <div>
          <p className="wm-eyebrow">A considered first conversation</p>
          <h1>
            Meet the person.
            <br />
            <span className="text-primary-500">Find the evidence.</span>
          </h1>
          <p className="wm-subtitle">
            A space for thoughtful interviews and clearer hiring reviews. Talk
            naturally, revisit the answers, and keep the final judgment with
            your team.
          </p>
          <div className="wm-actions mt-8">
            <Link className="wm-button" href="/demo">
              Try a voice interview <ArrowRightIcon />
            </Link>
            <Link className="wm-button secondary" href="/dashboard">
              Open workspace
            </Link>
          </div>
          <p className="wm-subtitle mt-5 text-xs">
            Demo access · Sign in first; no personal API key is required
          </p>
        </div>
        <div className="wm-hero-panel">
          <div className="flex justify-between items-center">
            <span className="wm-eyebrow">Inside the conversation</span>
            <span className="wm-tag">Illustrative preview</span>
          </div>
          <div className="wm-wave my-7" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <p className="text-2xl leading-snug tracking-tight">
            “Walk me through a tradeoff you made, and what happened next.”
          </p>
          <p className="wm-subtitle mt-4">
            One question. Room to think. Evidence to return to.
          </p>
          <div className="border-t border-[var(--border)] mt-8 pt-5 space-y-3">
            {[
              "A conversation in English or Indonesian",
              "Clear pauses and recoverable sessions",
              "An evaluation for a human to review",
            ].map((t) => (
              <p className="flex items-center gap-3 text-sm" key={t}>
                <CheckIcon className="text-primary-500" />
                {t}
              </p>
            ))}
          </div>
        </div>
      </section>
      <section className="border-t border-[var(--border)] grid md:grid-cols-[1fr_1.3fr] gap-10 pt-10">
        <div>
          <p className="wm-eyebrow">From first answer to next step</p>
          <h2 className="wm-heading">
            Less switching.
            <br />
            More understanding.
          </h2>
          <p className="wm-subtitle">
            Built as an HR product sprint prototype. Explore the experience,
            inspect its limits, and tell us what needs to improve.
          </p>
        </div>
        <div>
          {[
            [
              "01",
              "Set the context",
              "Choose the role and language. Use a fictional profile to explore the demo.",
            ],
            [
              "02",
              "Have the conversation",
              "A live voice interview with visible rules, a paused timer and a path back after interruption.",
            ],
            [
              "03",
              "Review with care",
              "Read the transcript and compare evaluation models. Treat scores as prompts for review, not hiring decisions.",
            ],
          ].map(([n, t, d]) => (
            <div className="wm-feature" key={n}>
              <span className="wm-num">{n}</span>
              <div>
                <h3 className="text-lg">{t}</h3>
                <p>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t border-[var(--border)] mt-16 pt-6 flex flex-wrap gap-5 justify-between text-xs text-[var(--muted)]">
        <span>InterviewMate · HR product sprint</span>
        <span>Designed for exploration. Human judgment stays central.</span>
      </footer>
    </div>
  );
}
