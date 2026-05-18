import { NextRequest, NextResponse } from "next/server";

interface CommitDay {
  date: string;
  count: number;
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    "User-Agent": "CEAL-App",
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const [userRes, eventsRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers }),
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`, { headers }),
    ]);

    if (!userRes.ok) {
      return NextResponse.json({ error: "GitHub user not found" }, { status: 404 });
    }

    const user = await userRes.json();
    const events = eventsRes.ok ? await eventsRes.json() : [];

    // Build 90-day commit grid
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const commitsByDay: Record<string, number> = {};
    const repoCommits: Record<string, number> = {};

    for (const event of events) {
      if (event.type !== "PushEvent") continue;
      const eventDate = new Date(event.created_at);
      if (eventDate.getTime() < cutoff) continue;

      const day = eventDate.toISOString().split("T")[0];
      const count = event.payload?.commits?.length ?? 1;
      commitsByDay[day] = (commitsByDay[day] ?? 0) + count;

      const repo = event.repo?.name ?? "unknown";
      repoCommits[repo] = (repoCommits[repo] ?? 0) + count;
    }

    // Build 90-day grid (oldest → newest)
    const grid: CommitDay[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const day = d.toISOString().split("T")[0];
      grid.push({ date: day, count: commitsByDay[day] ?? 0 });
    }

    const totalCommits = Object.values(commitsByDay).reduce((a, b) => a + b, 0);

    const topRepos = Object.entries(repoCommits)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, commits]) => ({ name, commits }));

    return NextResponse.json(
      {
        username: user.login,
        name: user.name ?? user.login,
        avatarUrl: user.avatar_url,
        publicRepos: user.public_repos,
        followers: user.followers,
        profileUrl: user.html_url,
        totalCommits,
        grid,
        topRepos,
      },
      {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}
