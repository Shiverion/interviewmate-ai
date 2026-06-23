import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

interface GitHubRepo {
    name: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    topics: string[];
    updated_at: string;
}

interface GitHubUser {
    name: string | null;
    bio: string | null;
    public_repos: number;
    followers: number;
    company: string | null;
    location: string | null;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const username = searchParams.get("username");

        if (!username) {
            return NextResponse.json({ error: "username is required" }, { status: 400 });
        }

        const headers: Record<string, string> = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        };

        // Use GitHub token from env if available to avoid rate limiting
        if (process.env.GITHUB_TOKEN) {
            headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
        }

        const [profileRes, reposRes] = await Promise.all([
            fetch(`https://api.github.com/users/${username}`, { headers }),
            fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=30`, { headers })
        ]);

        if (!profileRes.ok) {
            if (profileRes.status === 404) {
                return NextResponse.json({ error: "GitHub user not found" }, { status: 404 });
            }
            if (profileRes.status === 403) {
                return NextResponse.json({ error: "GitHub API rate limit exceeded" }, { status: 429 });
            }
            throw new Error(`GitHub API error: ${profileRes.status}`);
        }

        const profile: GitHubUser = await profileRes.json();
        const allRepos: GitHubRepo[] = reposRes.ok ? await reposRes.json() : [];

        // Pick top repos by stars + recency, skip forks
        const topRepos = allRepos
            .filter(r => r.description || r.language)
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, 7)
            .map(r => ({
                name: r.name,
                description: r.description,
                language: r.language,
                stars: r.stargazers_count,
                forks: r.forks_count,
                topics: r.topics?.slice(0, 5) || []
            }));

        // Extract top languages across all repos
        const langCounts: Record<string, number> = {};
        allRepos.forEach(r => {
            if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
        });
        const topLanguages = Object.entries(langCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([lang]) => lang);

        const enrichment = {
            profile: {
                name: profile.name,
                bio: profile.bio,
                public_repos: profile.public_repos,
                followers: profile.followers,
                company: profile.company,
                location: profile.location
            },
            top_repos: topRepos,
            top_languages: topLanguages,
            github_url: `https://github.com/${username}`
        };

        return NextResponse.json({ success: true, enrichment }, { status: 200 });

    } catch (error: unknown) {
        console.error("GitHub Enrich Error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
