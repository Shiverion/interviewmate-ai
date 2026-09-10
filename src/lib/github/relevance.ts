export type Repository = {
  name: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  fork?: boolean;
  archived?: boolean;
  pushed_at?: string;
  updated_at?: string;
  owner?: { login: string };
  size?: number;
};
const tokens = (text: string) =>
  new Set(text.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) || []);
export function rankRepositories(
  repos: Repository[],
  context: string,
  username: string,
  now = Date.now()
) {
  const wanted = tokens(context);
  return repos
    .map((repo) => {
      const content = tokens(
        [
          repo.name,
          repo.description,
          repo.language,
          ...(repo.topics || []),
        ].join(" ")
      );
      const overlap = [...content].filter((t) => wanted.has(t)).length;
      const recent =
        Number.isFinite(Date.parse(repo.pushed_at || repo.updated_at || "")) &&
        now - Date.parse(repo.pushed_at || repo.updated_at || "") <
          365 * 86400000;
      const own = repo.owner?.login.toLowerCase() === username.toLowerCase();
      const tutorial = /\b(tutorial|hello.world|todo|course|bootcamp)\b/i.test(
        repo.name + " " + repo.description
      );
      const score =
        overlap * 5 +
        (own ? 3 : 0) +
        (recent ? 2 : 0) +
        (repo.size && repo.size > 100 ? 1 : 0) +
        (repo.description ? 1 : 0) -
        (repo.fork ? 12 : 0) -
        (repo.archived ? 8 : 0) -
        (tutorial ? 8 : 0);
      return {
        ...repo,
        relevanceScore: score,
        reasons: [
          `${overlap} matching technology/context terms`,
          own
            ? "Repository owned by profile; personal contribution unverified"
            : "Ownership unverified",
          repo.fork ? "Fork penalty" : "Original repository",
          recent ? "Recently pushed" : "No recent push",
        ],
      };
    })
    .sort(
      (a, b) =>
        b.relevanceScore - a.relevanceScore || a.name.localeCompare(b.name)
    )
    .filter((r) => r.relevanceScore > 0)
    .slice(0, 3);
}
export function cleanReadme(text: string) {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/data:[^\s)]+/g, "")
    .slice(0, 3500)
    .trim();
}
