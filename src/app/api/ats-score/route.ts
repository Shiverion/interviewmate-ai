import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { doc, updateDoc } from "firebase/firestore";

export const dynamic = 'force-dynamic';

// Common English stop words to exclude from keyword extraction
const STOP_WORDS = new Set([
    "a","an","the","and","or","but","in","on","at","to","for","of","with","by","from","as","is","was",
    "are","were","be","been","being","have","has","had","do","does","did","will","would","could","should",
    "may","might","shall","can","need","dare","ought","used","it","its","this","that","these","those",
    "i","we","you","he","she","they","me","us","him","her","them","my","our","your","his","their",
    "what","which","who","whom","whose","when","where","why","how","all","each","every","both","few",
    "more","most","other","some","such","no","nor","not","only","own","same","so","than","too","very",
    "just","about","above","after","before","between","during","into","through","up","down","out","off",
    "over","under","again","further","then","once","here","there","any","also","well","new","good","work",
    "strong","excellent","ability","skills","experience","knowledge","understanding","proficiency","working",
    "using","including","including","across","within","related","relevant","required","preferred","plus",
    "etc","per","via","e.g","i.e","provide","ensure","support","help","team","company","role","position",
    "candidate","opportunity","join","looking","seeking","responsibilities","qualifications","requirements"
]);

// Technology and domain keywords that should always be treated as significant
const TECH_BIGRAMS = [
    "machine learning","deep learning","natural language","computer vision","data science","software engineering",
    "full stack","front end","back end","open source","rest api","graphql api","ci cd","continuous integration",
    "continuous deployment","unit testing","integration testing","test driven","behavior driven","object oriented",
    "functional programming","design patterns","microservices architecture","event driven","distributed systems",
    "cloud native","real time","high availability","fault tolerance","load balancing","api gateway",
    "version control","agile methodology","scrum framework","product management","project management",
    "data structures","algorithms design","system design","code review","technical leadership","team leadership"
];

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^\w\s\+\#\.]/g, " ")
        .split(/\s+/)
        .map(t => t.replace(/^[.\-_]+|[.\-_]+$/g, ""))
        .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

function extractBigrams(text: string): string[] {
    const lower = text.toLowerCase();
    return TECH_BIGRAMS.filter(bg => lower.includes(bg));
}

function extractKeywords(jdText: string): { keywords: string[]; techTerms: string[] } {
    const tokens = tokenize(jdText);
    const bigrams = extractBigrams(jdText);

    // Count token frequency to identify JD-specific important terms
    const freq: Record<string, number> = {};
    for (const t of tokens) {
        if (!STOP_WORDS.has(t)) freq[t] = (freq[t] || 0) + 1;
    }

    // Keep tokens that appear at least once and are meaningful (length >= 2)
    // Prioritise tech-looking tokens: contain digits, dots, capitals, or are > 3 chars
    const isTechTerm = (t: string) =>
        /\d/.test(t) ||             // has number (e.g. "python3", "es2022")
        /[+#]/.test(t) ||           // C++, C#
        t === t.toUpperCase() ||     // acronyms: SQL, AWS, API
        t.length >= 4;               // general meaningful words

    const unigrams = Object.keys(freq).filter(t => isTechTerm(t) && freq[t] >= 1);

    const allKeywords = [...new Set([...bigrams, ...unigrams])];

    // Separate tech-specific terms (tools, languages, frameworks) from general terms
    const techPattern = /^(python|javascript|typescript|java|golang|go|rust|ruby|php|swift|kotlin|scala|r\b|c\+\+|c#|sql|nosql|mongodb|postgresql|mysql|redis|elasticsearch|kafka|rabbitmq|docker|kubernetes|k8s|aws|gcp|azure|terraform|ansible|jenkins|github|gitlab|bitbucket|react|nextjs|vue|angular|svelte|node|express|fastapi|django|flask|spring|rails|laravel|graphql|rest|grpc|html|css|sass|tailwind|webpack|vite|jest|pytest|cypress|selenium|linux|unix|bash|git|figma|jira|confluence|notion|slack|vercel|netlify|firebase|supabase|openai|llm|gpt|bert|transformers|pytorch|tensorflow|keras|scikit|pandas|numpy|spark|hadoop|airflow|dbt|snowflake|bigquery|looker|tableau|powerbi)$/i;
    const techTerms = allKeywords.filter(k => techPattern.test(k) || bigrams.includes(k));

    return { keywords: allKeywords.slice(0, 60), techTerms };
}

function scoreMatch(resumeText: string, keywords: string[]): { matched: string[]; missing: string[] } {
    const resumeLower = resumeText.toLowerCase();
    const matched: string[] = [];
    const missing: string[] = [];

    for (const kw of keywords) {
        // Check exact and word-boundary match
        const pattern = new RegExp(`\\b${kw.replace(/[+#.]/g, "\\$&")}\\b`, "i");
        if (pattern.test(resumeLower)) {
            matched.push(kw);
        } else {
            missing.push(kw);
        }
    }

    return { matched, missing };
}

function detectRedFlags(resumeText: string): string[] {
    const flags: string[] = [];
    const lower = resumeText.toLowerCase();

    // No dates in experience sections
    const hasYears = /\b(19|20)\d{2}\b/.test(resumeText);
    if (!hasYears) flags.push("No employment dates found — ATS may flag missing timeline");

    // Very short resume
    if (resumeText.split(/\s+/).length < 150) flags.push("Resume appears very short — may lack detail for ATS parsing");

    // No contact info signals
    if (!/\b[\w.+-]+@[\w-]+\.\w+\b/.test(resumeText)) flags.push("No email address detected in resume");

    // Keyword stuffing risk (same term repeated many times)
    const words = lower.split(/\s+/);
    const wordCount: Record<string, number> = {};
    for (const w of words) { wordCount[w] = (wordCount[w] || 0) + 1; }
    const stuffed = Object.entries(wordCount).filter(([w, c]) => c > 15 && w.length > 4);
    if (stuffed.length > 0) flags.push(`Possible keyword stuffing detected (overused: ${stuffed[0][0]}) — may trigger ATS spam filters`);

    // No skills section
    if (!/(skills|technologies|tech stack|tools|languages)/i.test(resumeText)) {
        flags.push("No dedicated Skills section — ATS keyword extractors rely on this section");
    }

    return flags.slice(0, 4);
}

function extractStrengths(resumeText: string, matched: string[], techTerms: string[]): string[] {
    const strengths: string[] = [];
    const lower = resumeText.toLowerCase();
    const matchedTech = techTerms.filter(t => matched.includes(t));

    if (matchedTech.length >= 5) strengths.push(`Strong tech keyword coverage: ${matchedTech.slice(0, 5).join(", ")}`);
    if (/\b(led|managed|architected|designed|built|launched|shipped|owned)\b/i.test(resumeText)) {
        strengths.push("Resume uses strong action verbs signalling ownership and leadership");
    }
    if (/\b\d+[%x]\b|\breduced|\bimproved|\bincreased|\bgrew|\bsaved/i.test(resumeText)) {
        strengths.push("Quantified achievements found — ATS and recruiters rank these highly");
    }
    if (/(github|portfolio|open.source|contributed)/i.test(lower)) {
        strengths.push("Portfolio/open-source presence mentioned — positive signal for technical roles");
    }
    if (matched.length >= Math.ceil(matchedTech.length * 0.7)) {
        strengths.push("Good alignment with core job description keywords");
    }

    return strengths.slice(0, 5);
}

function estimateExperienceAlignment(resumeText: string, jdText: string): number {
    const seniorSignals = /(senior|staff|principal|lead|architect|director|head of|vp |10\+|8\+|7\+)/i;
    const midSignals = /(mid.?level|3\+|4\+|5\+ years)/i;
    const jdLevel = seniorSignals.test(jdText) ? "senior" : midSignals.test(jdText) ? "mid" : "junior";

    const resumeLevel = seniorSignals.test(resumeText) ? "senior" : midSignals.test(resumeText) ? "mid" : "junior";

    if (jdLevel === resumeLevel) return 85;
    if ((jdLevel === "senior" && resumeLevel === "mid") || (jdLevel === "mid" && resumeLevel === "junior")) return 55;
    if (jdLevel === "junior" && resumeLevel !== "junior") return 75; // overqualified is fine
    return 40;
}

export async function POST(req: Request) {
    try {
        const { resumeText, jobTitle, jobDescription, sessionId } = await req.json() as {
            resumeText: string;
            jobTitle: string;
            jobDescription: string;
            sessionId?: string;
        };

        if (!resumeText || !jobDescription) {
            return NextResponse.json({ error: "resumeText and jobDescription are required" }, { status: 400 });
        }

        // Extract keywords from JD
        const { keywords, techTerms } = extractKeywords(jobDescription);

        // Score resume against JD keywords
        const { matched, missing } = scoreMatch(resumeText, keywords);
        const { matched: matchedTech } = scoreMatch(resumeText, techTerms);

        // Compute scores
        const keyword_match = keywords.length > 0 ? Math.round((matched.length / keywords.length) * 100) : 0;
        const skills_coverage = techTerms.length > 0 ? Math.round((matchedTech.length / techTerms.length) * 100) : keyword_match;
        const experience_alignment = estimateExperienceAlignment(resumeText, jobDescription);

        // Overall = weighted blend
        const overall_match = Math.round(keyword_match * 0.4 + skills_coverage * 0.35 + experience_alignment * 0.25);

        const red_flags = detectRedFlags(resumeText);
        const strengths = extractStrengths(resumeText, matched, techTerms);

        const matchLabel = overall_match >= 75 ? "strong" : overall_match >= 50 ? "moderate" : "weak";
        const summary = `This resume shows a ${matchLabel} ATS match (${overall_match}%) against the ${jobTitle || "role"} description. ` +
            `${matched.length} of ${keywords.length} key terms were found, with ${matchedTech.length} of ${techTerms.length} technical skill matches. ` +
            (missing.length > 0 ? `Consider adding: ${missing.slice(0, 4).join(", ")}.` : "Strong keyword coverage across all requirement areas.");

        const atsData = {
            overall_match,
            keyword_match,
            experience_alignment,
            skills_coverage,
            matched_keywords: matched.slice(0, 30),
            missing_keywords: missing.slice(0, 20),
            red_flags,
            strengths,
            summary
        };

        console.log(`[ATS-SCORE] Done (no-key). Overall: ${overall_match}% | matched ${matched.length}/${keywords.length}`);

        // Persist to Firestore if sessionId provided
        if (sessionId && !sessionId.startsWith("demo-")) {
            try {
                const sessionRef = doc(db, "interview_sessions", sessionId);
                await updateDoc(sessionRef, { ats_score: atsData });
            } catch (e) {
                console.warn("[ATS-SCORE] Failed to persist, continuing anyway:", e);
            }
        }

        return NextResponse.json({ success: true, ats_score: atsData }, { status: 200 });

    } catch (error: unknown) {
        console.error("ATS Score Error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
