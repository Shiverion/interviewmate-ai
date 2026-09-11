"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRightIcon,
  CheckCircledIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GearIcon,
  LightningBoltIcon,
  PersonIcon,
} from "@radix-ui/react-icons";

const phases = [
  {
    number: "01",
    label: "Discovery",
    title: "Find the evidence bottleneck",
    body: "A recruiter needs a concise, job-specific record from CVs and first-screen answers. The sprint started with desk research and kept the problem statement explicit as a hypothesis.",
    output: "Problem statement, target user, workflow map and baseline measurement protocol.",
  },
  {
    number: "02",
    label: "Solution design",
    title: "Connect CV intake to a reviewable conversation",
    body: "The product decision was to extend the existing InterviewMate foundation instead of starting another prototype. The key design boundary separates transcription, conversation and evidence assessment.",
    output: "UX flow, shared configuration, prompt boundaries, evidence contract and data governance notes.",
  },
  {
    number: "03",
    label: "Prototype",
    title: "Build the smallest useful workflow",
    body: "Recruiters upload a batch of CVs, inspect ATS results, select candidates and create invitation links. Candidates speak, review the draft, send it explicitly and receive an interpretable evidence result.",
    output: "Deployed Next.js prototype with voice + text interview, recovery, history and feedback.",
  },
  {
    number: "04",
    label: "Evaluation",
    title: "Test behavior with synthetic and builder data",
    body: "Authored transcripts, ten fictional CVs, English-first checks and Indonesian examples exposed duplicate openings, transcript resets, completion timing and persistence failures.",
    output: "Regression cases, builder acceptance notes, release checks and disclosed evidence limits.",
  },
  {
    number: "05",
    label: "Handoff",
    title: "Make the next build understandable",
    body: "The handoff states what is implemented, how the score is calculated, where data is stored, what the APIs return and what remains unmeasured before real-candidate use.",
    output: "Case study, PRD, source map, runbook, demo script and future privacy-aware learning plan.",
  },
];

const workflow = [
  ["Role brief", "Enter one job description for the entire CV batch."],
  ["Batch CV intake", "Parse names, emails and resume text from multiple PDFs."],
  ["ATS ranking", "Show deterministic match signals before the recruiter selects candidates."],
  ["Invitation setup", "Set language, duration, turn budget and validity window."],
  ["Candidate interview", "Combine voice and typing, with an editable transcript draft."],
  ["Evidence review", "Validate exact candidate quotes and show a percentage score."],
  ["Recruiter history", "Keep ATS, assessment, timestamps and feedback reviewable."],
];

const metrics = [
  ["Evidence score", "0-100", "A normalized view of supported competency evidence, not a hiring probability."],
  ["Coverage", "x / y", "How many configured competencies have eligible candidate evidence."],
  ["ATS match", "0-100", "A deterministic CV/JD signal used to prioritize recruiter review."],
  ["Feedback", "1-5", "Experience ratings for clarity, transcription, relevance and reliability."],
];

const handoffItems = [
  ["What is deterministic", "ATS matching, evidence percentage math, transcript quote validation, access boundaries and session recovery state."],
  ["What uses a model", "Voice conversation, transcription and structured evidence interpretation. Provider output is validated before it can become a score."],
  ["What remains human", "Candidate selection, evidence interpretation, hiring judgment, baseline measurement and approval of any future learning dataset."],
  ["What is deliberately deferred", "Automatic rejection, covert monitoring, OCR, HRIS/email integration and fine-tuning on raw candidate data."],
];

const walkthrough = [
  {
    label: "Role brief",
    eyebrow: "01 · Define the signal",
    title: "Start with one role brief",
    body: "The recruiter enters the job description once. It becomes the shared context for ATS ranking, interview prompts and the evidence rubric.",
    chips: ["Data Scientist", "Fraud detection", "Evidence-first"],
  },
  {
    label: "CV batch",
    eyebrow: "02 · Inspect the batch",
    title: "See the shortlist before inviting",
    body: "CVs are parsed into candidate records, ranked against the role and kept visible for human selection. Email and name extraction remove repetitive data entry.",
    chips: ["Aisha Rahman · 91 ATS", "Bima Santoso · 74 ATS", "Clara Nguyen · 46 ATS"],
  },
  {
    label: "Invite",
    eyebrow: "03 · Configure once",
    title: "Create a focused interview link",
    body: "Select candidates, set the language and turn budget, then create links in one batch. The candidate only receives their own session.",
    chips: ["English baseline", "10 minute window", "Voice + text"],
  },
  {
    label: "Interview",
    eyebrow: "04 · Let the candidate stay in control",
    title: "Speak, edit, then send",
    body: "Voice transcription remains a draft until the candidate sends it. The interviewer waits for the answer and uses the role and CV context to ask the next useful question.",
    chips: ["Editable transcript", "No hidden auto-send", "Recovery-aware"],
  },
  {
    label: "Evidence",
    eyebrow: "05 · Review the record",
    title: "Finish with a score people can explain",
    body: "The result shows a percentage, competency coverage and cited quotes. Recruiters can inspect the record before making a human decision.",
    chips: ["Evidence 61 / 100", "Coverage 7 / 7", "Human review required"],
  },
];

export default function CaseStudyExplorer() {
  const [activePhase, setActivePhase] = useState(0);
  const [activeStage, setActiveStage] = useState(0);
  const [activeWalkthrough, setActiveWalkthrough] = useState(0);
  const currentWalkthrough = walkthrough[activeWalkthrough];

  return (
    <div className="cs-page">
      <div className="cs-standalone-bar">
        <a href="#overview" className="cs-standalone-brand"><span>INTERVIEWMATE</span><small>PRODUCT BRIEF · 2026</small></a>
        <nav aria-label="Case study sections">
          <a href="#sprint">Sprint</a>
          <a href="#hands-on">Walkthrough</a>
          <a href="#evaluation">Evidence</a>
          <a href="#handoff">Handoff</a>
        </nav>
        <Link className="cs-standalone-demo" href="/demo">Open demo <ArrowRightIcon /></Link>
      </div>
      <section className="cs-hero" id="overview">
        <div className="cs-hero-copy">
          <p className="wm-eyebrow">Interactive product sprint case study</p>
          <h1>From CV intake to evidence worth reviewing.</h1>
          <p className="cs-lede">
            InterviewMate turns batch resume screening and first-screen interviews into one traceable recruiter workflow. This page explains the product decision, the AI boundaries and the evidence behind the MVP.
          </p>
          <div className="cs-actions">
            <a className="wm-button" href="#hands-on">
              Try the product brief <ArrowRightIcon />
            </a>
            <Link className="wm-button" href="/demo">
              Try the live demo <ArrowRightIcon />
            </Link>
            <a className="wm-button secondary" href="/InterviewMate-Submission-Package.pdf" download>
              Download full PDF <FileTextIcon />
            </a>
          </div>
          <p className="cs-meta">Deployed prototype · English baseline · Bahasa Indonesia extension · Human review stays central</p>
        </div>
        <div className="cs-hero-card" aria-label="Case study at a glance">
          <div className="cs-card-topline">
            <span>At a glance</span>
            <span className="cs-status"><CheckCircledIcon /> MVP deployed</span>
          </div>
          <div className="cs-signal-grid">
            <div><strong>7</strong><span>connected workflow stages</span></div>
            <div><strong>50</strong><span>CVs per batch</span></div>
            <div><strong>100</strong><span>evidence score scale</span></div>
            <div><strong>5</strong><span>sprint phases documented</span></div>
          </div>
          <div className="cs-hero-line"><span /> <span /> <span /> <span /> <span /></div>
          <p>Role brief → CV ranking → interview → evidence → recruiter history</p>
        </div>
      </section>

      <section className="cs-section cs-phase-section" id="sprint">
        <div className="cs-section-intro">
          <p className="wm-eyebrow">The five-day arc</p>
          <h2>Every phase leaves a usable decision behind.</h2>
          <p>Choose a phase to see the question it answered and the artifact it produced.</p>
        </div>
        <div className="cs-phase-layout">
          <div className="cs-phase-rail" role="tablist" aria-label="Sprint phases">
            {phases.map((phase, index) => (
              <button
                className={`cs-phase-tab ${index === activePhase ? "is-active" : ""}`}
                key={phase.number}
                onClick={() => setActivePhase(index)}
                role="tab"
                aria-selected={index === activePhase}
                aria-controls={`phase-panel-${phase.number}`}
              >
                <span>{phase.number}</span>
                <strong>{phase.label}</strong>
              </button>
            ))}
          </div>
          <div className="cs-phase-panel" id={`phase-panel-${phases[activePhase].number}`} role="tabpanel">
            <span className="cs-panel-kicker">Phase {phases[activePhase].number}</span>
            <h3>{phases[activePhase].title}</h3>
            <p>{phases[activePhase].body}</p>
            <div className="cs-output"><CheckCircledIcon /><div><span>Expected output</span><strong>{phases[activePhase].output}</strong></div></div>
          </div>
        </div>
      </section>

      <section className="cs-section" id="workflow">
        <div className="cs-section-intro split">
          <div><p className="wm-eyebrow">The product loop</p><h2>One workflow, with a clear handoff at every step.</h2></div>
          <p>Recruiters can stop after ATS ranking or continue through invitations. Candidates only see their own session; the workspace keeps the review record.</p>
        </div>
        <div className="cs-workflow">
          <div className="cs-workflow-list" role="tablist" aria-label="Workflow stages">
            {workflow.map(([title, description], index) => (
              <button
                className={`cs-workflow-item ${index === activeStage ? "is-active" : ""}`}
                key={title}
                onClick={() => setActiveStage(index)}
                role="tab"
                aria-selected={index === activeStage}
                aria-controls={`workflow-panel-${index}`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span><strong>{title}</strong><ArrowRightIcon />
              </button>
            ))}
          </div>
          <div className="cs-workflow-detail" id={`workflow-panel-${activeStage}`} role="tabpanel">
            <span className="cs-panel-kicker">Stage {String(activeStage + 1).padStart(2, "0")}</span>
            <h3>{workflow[activeStage][0]}</h3>
            <p>{workflow[activeStage][1]}</p>
            <div className="cs-detail-line"><LightningBoltIcon /><span>Designed to keep the next decision visible instead of hiding it inside the model.</span></div>
          </div>
        </div>
      </section>

      <section className="cs-section cs-hands-on-section" id="hands-on">
        <div className="cs-section-intro split">
          <div><p className="wm-eyebrow">Hands-on product brief</p><h2>Walk the workflow before you read the report.</h2></div>
          <p>This small, self-contained walkthrough uses fictional data. Choose a step, inspect the decision it exposes and then open the live prototype when you want to try the real interaction.</p>
        </div>
        <div className="cs-hands-on">
          <div className="cs-hands-on-steps" role="tablist" aria-label="Hands-on workflow">
            {walkthrough.map((item, index) => (
              <button
                className={`cs-hands-on-step ${index === activeWalkthrough ? "is-active" : ""}`}
                key={item.label}
                onClick={() => setActiveWalkthrough(index)}
                role="tab"
                aria-selected={index === activeWalkthrough}
                aria-controls={`hands-on-panel-${index}`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.label}</strong>
                {index < activeWalkthrough ? <CheckCircledIcon /> : <ArrowRightIcon />}
              </button>
            ))}
          </div>
          <div className="cs-hands-on-preview" id={`hands-on-panel-${activeWalkthrough}`} role="tabpanel">
            <div className="cs-preview-topline"><span>Sample workspace</span><span className="cs-preview-live"><span /> Interactive brief</span></div>
            <span className="cs-panel-kicker">{currentWalkthrough.eyebrow}</span>
            <h3>{currentWalkthrough.title}</h3>
            <p>{currentWalkthrough.body}</p>
            <div className="cs-preview-chips">
              {currentWalkthrough.chips.map((chip) => <span key={chip}>{chip}</span>)}
            </div>
            <div className="cs-preview-footer">
              <span>Step {activeWalkthrough + 1} of {walkthrough.length}</span>
              <div>
                <button className="cs-preview-button quiet" onClick={() => setActiveWalkthrough(Math.max(0, activeWalkthrough - 1))} disabled={activeWalkthrough === 0}>Back</button>
                <button className="cs-preview-button" onClick={() => setActiveWalkthrough(Math.min(walkthrough.length - 1, activeWalkthrough + 1))} disabled={activeWalkthrough === walkthrough.length - 1}>{activeWalkthrough === walkthrough.length - 1 ? "Complete" : "Next step"}<ArrowRightIcon /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cs-section cs-dark-section" id="logic">
        <div className="cs-section-intro split">
          <div><p className="wm-eyebrow">AI logic</p><h2>Models assist the conversation. Rules protect the record.</h2></div>
          <p>The implementation separates speech, transcription and evaluation. A generated answer cannot become a saved assessment until its structure and candidate quotations pass validation.</p>
        </div>
        <div className="cs-logic-grid">
          <div className="cs-logic-column"><span className="cs-number">01</span><GearIcon /><h3>Bounded context</h3><p>Role brief, validated CV text and relevant GitHub context are limited before they reach the interview or evaluator.</p></div>
          <div className="cs-logic-column"><span className="cs-number">02</span><PersonIcon /><h3>Candidate control</h3><p>Speech becomes an editable draft. The candidate chooses when to send it, and the draft clears after submission.</p></div>
          <div className="cs-logic-column"><span className="cs-number">03</span><CheckCircledIcon /><h3>Evidence validation</h3><p>Exact candidate quotes, turn references and competency levels are checked before the percentage is displayed.</p></div>
        </div>
      </section>

      <section className="cs-section" id="evaluation">
        <div className="cs-section-intro"><p className="wm-eyebrow">Evaluation and limits</p><h2>Readable scores, explicit uncertainty.</h2><p>The score describes supported interview evidence under a rubric. It is not a hiring recommendation or a probability of success.</p></div>
        <div className="cs-metric-grid">
          {metrics.map(([label, value, description]) => <div className="cs-metric" key={label}><span>{label}</span><strong>{value}</strong><p>{description}</p></div>)}
        </div>
        <div className="cs-limit-grid">
          <div><span className="cs-panel-kicker">What we tested</span><h3>Authored transcripts, ten fictional CVs and builder-led English/Indonesian checks.</h3><p>They were useful for detecting behavior regressions and validating the workflow. They do not establish recruiter time savings, inter-rater reliability or model accuracy.</p></div>
          <div><span className="cs-panel-kicker">What remains open</span><h3>Measure manual versus assisted review before claiming productivity.</h3><p>Use comparable synthetic cases, record corrections and independently inspect quotes and competency levels. Keep the gap visible in the submission.</p></div>
        </div>
      </section>

      <section className="cs-section" id="handoff">
        <div className="cs-section-intro split"><div><p className="wm-eyebrow">Engineering handoff</p><h2>Enough detail to build the next version without guessing.</h2></div><p>The full PDF contains the source map, API contract, persistence boundaries, runbook and selected reports. The interactive view keeps the key decisions easy to scan.</p></div>
        <div className="cs-handoff-list">
          {handoffItems.map(([title, body]) => <details key={title}><summary>{title}<ChevronDownIcon /></summary><p>{body}</p></details>)}
        </div>
      </section>

      <section className="cs-cta" id="resources">
        <div><p className="wm-eyebrow">Continue the review</p><h2>Open the prototype, then keep the evidence close.</h2><p>Use the live demo for the experience and the PDF for the complete case study and supporting reports.</p></div>
        <div className="cs-actions"><Link className="wm-button" href="/demo">Open the demo <ArrowRightIcon /></Link><a className="wm-button secondary" href="/InterviewMate-Submission-Package.pdf" download>Download PDF <FileTextIcon /></a></div>
      </section>

      <footer className="cs-footer"><span>InterviewMate · HR product sprint</span><span>Built for human review, with model limits visible.</span><a href="https://interviewmate-ai.shiverion.com/" target="_blank" rel="noreferrer">Production site <ExternalLinkIcon /></a></footer>
    </div>
  );
}
