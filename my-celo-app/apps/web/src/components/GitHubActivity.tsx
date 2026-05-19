"use client";
import { useEffect, useState } from "react";
import { Github, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommitDay {
  date: string;
  count: number;
}

interface GitHubData {
  username: string;
  name: string;
  avatarUrl: string;
  publicRepos: number;
  followers: number;
  profileUrl: string;
  totalCommits: number;
  grid: CommitDay[];
  topRepos: { name: string; commits: number }[];
}

interface GitHubActivityProps {
  username: string;
  isOwn?: boolean;
}

function commitColor(count: number): string {
  if (count === 0) return "bg-gray-800";
  if (count < 3)   return "bg-emerald-900";
  if (count < 6)   return "bg-emerald-700";
  if (count < 10)  return "bg-emerald-500";
  return "bg-emerald-400";
}

export function GitHubActivity({ username, isOwn }: GitHubActivityProps) {
  const [data, setData] = useState<GitHubData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetch(`/api/github-activity?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="bg-gray-800 rounded-2xl h-20 animate-pulse" />
        <div className="bg-gray-800 rounded-2xl h-32 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 text-center">
        <Github size={32} className="mx-auto text-gray-600 mb-2" />
        <p className="text-gray-500 text-sm">{error || "GitHub profile not found"}</p>
      </div>
    );
  }

  // Group grid into weeks (columns of 7)
  const weeks: CommitDay[][] = [];
  for (let i = 0; i < data.grid.length; i += 7) {
    weeks.push(data.grid.slice(i, i + 7));
  }

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="bg-gray-800 rounded-2xl p-4 flex items-center gap-4">
        <img
          src={data.avatarUrl}
          alt={data.username}
          className="w-12 h-12 rounded-full border-2 border-gray-700"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold truncate">{data.name}</p>
            <Github size={14} className="text-gray-400 shrink-0" />
          </div>
          <p className="text-gray-400 text-xs">@{data.username}</p>
        </div>
        <a
          href={data.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-white transition shrink-0"
        >
          <ExternalLink size={16} />
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Repos", value: data.publicRepos },
          { label: "Followers", value: data.followers },
          { label: "Commits (90d)", value: data.totalCommits },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl px-3 py-2.5 text-center">
            <p className="text-white font-bold text-lg">{value}</p>
            <p className="text-gray-500 text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="bg-gray-800 rounded-2xl p-4">
        <p className="text-gray-400 text-xs mb-3">Commit activity (last 90 days)</p>
        <div className="flex gap-[3px] w-full">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px] flex-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} commit${day.count !== 1 ? "s" : ""}`}
                  className={cn("w-full aspect-square rounded-[2px]", commitColor(day.count))}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="text-gray-600 text-xs">Less</span>
          {[0, 1, 5, 9, 12].map((n) => (
            <div key={n} className={cn("w-2.5 h-2.5 rounded-[2px]", commitColor(n))} />
          ))}
          <span className="text-gray-600 text-xs">More</span>
        </div>
      </div>

      {/* Top repos */}
      {data.topRepos.length > 0 && (
        <div className="bg-gray-800 rounded-2xl p-4 space-y-2">
          <p className="text-gray-400 text-xs mb-2">Most active repos (90d)</p>
          {data.topRepos.map(({ name, commits }) => {
            const repoPath = name.includes("/") ? name : `${data.username}/${name}`;
            return (
              <a
                key={name}
                href={`https://github.com/${repoPath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-1 hover:opacity-80 transition"
              >
                <span className="text-white text-sm truncate">{name.split("/").pop()}</span>
                <span className="text-gray-500 text-xs shrink-0 ml-2">{commits} commits</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
