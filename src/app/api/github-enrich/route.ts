import {
  rankRepositories,
  cleanReadme,
  type Repository,
} from "@/lib/github/relevance";
import { limitedJson } from "@/lib/demo/http";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    const { username, context } = await limitedJson(req, 9000);
    if (
      typeof username !== "string" ||
      typeof context !== "string" ||
      context.length > 6000
    )
      return Response.json(
        { error: "Invalid enrichment input." },
        { status: 400 }
      );
    const url = new URL(req.url);
    url.searchParams.set("username", username);
    url.searchParams.set("context", context);
    return GET(new Request(url));
  } catch {
    return Response.json(
      { error: "Invalid enrichment input." },
      { status: 400 }
    );
  }
}
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams,
    username = params.get("username") || "",
    context = (params.get("context") || "").slice(0, 6000);
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username))
    return Response.json(
      { error: "Enter a valid GitHub username." },
      { status: 400 }
    );
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  };
  const get = (url: string) =>
    fetch(url, {
      headers,
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
  try {
    const result = await get(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=50`
    );
    if (!result.ok)
      return Response.json(
        {
          success: false,
          error: "GitHub context unavailable. Continue without enrichment.",
        },
        { status: result.status === 403 || result.status === 429 ? 429 : 502 }
      );
    const repos: Repository[] = await result.json();
    const selected = rankRepositories(repos, context, username);
    const top = await Promise.all(
      selected.map(async (repo) => {
        let readme = "",
          readmeStatus = "unavailable";
        try {
          const r = await get(
            `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}/readme`
          );
          if (r.ok) {
            const body = await r.json();
            if (
              body.encoding === "base64" &&
              typeof body.content === "string" &&
              body.content.length < 200000
            ) {
              readme = cleanReadme(
                Buffer.from(body.content, "base64").toString("utf8")
              );
              readmeStatus = readme ? "read" : "empty";
            }
          }
        } catch {}
        return {
          name: repo.name,
          description: repo.description,
          language: repo.language,
          stars: repo.stargazers_count,
          topics: repo.topics || [],
          readme,
          readmeStatus,
          relevanceScore: repo.relevanceScore,
          reasons: repo.reasons,
        };
      })
    );
    return Response.json({
      success: true,
      enrichment: {
        profile: {
          name: null,
          bio: null,
          public_repos: repos.length,
          followers: 0,
          company: null,
        },
        top_repos: top,
        top_languages: [...new Set(top.map((r) => r.language).filter(Boolean))],
        github_url: `https://github.com/${username}`,
        selectionVersion: "relevance-v2",
        warning:
          "Public project context is not proof of the candidate's contribution.",
      },
    });
  } catch {
    return Response.json(
      {
        success: false,
        error: "GitHub context unavailable. Continue without enrichment.",
      },
      { status: 502 }
    );
  }
}
