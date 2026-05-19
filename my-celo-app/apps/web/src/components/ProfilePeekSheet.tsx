"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Github, Shield, X, MapPin, ExternalLink } from "lucide-react";
import { ipfsToHttp } from "@/lib/ipfs";
import { getReputationScore } from "@/lib/supabase";
import type { DbProfile } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface GitHubMeta { profileUrl: string; publicRepos: number }

function useGitHubMeta(username: string | null): GitHubMeta | null {
  const [meta, setMeta] = useState<GitHubMeta | null>(null);
  useEffect(() => {
    if (!username) return;
    fetch(`/api/github-activity?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setMeta({ profileUrl: d.profileUrl, publicRepos: d.publicRepos }); })
      .catch(() => {});
  }, [username]);
  return meta;
}

export function useReputation(address: string) {
  const [data, setData] = useState<{ badge: "Trusted" | "Good" | "New" | null; score: number }>({
    badge: null, score: 0,
  });
  useEffect(() => {
    getReputationScore(address).then((r) => setData({ badge: r.badge, score: r.score }));
  }, [address]);
  return data;
}

interface ProfilePeekSheetProps {
  profile: DbProfile;
  onClose: () => void;
}

export function ProfilePeekSheet({ profile, onClose }: ProfilePeekSheetProps) {
  const { badge: reputationBadge, score: reputationScore } = useReputation(profile.address);
  const githubMeta = useGitHubMeta(profile.github_username ?? null);
  const photo = profile.photos?.[0] ? ipfsToHttp(profile.photos[0]) : null;

  const badgeColor =
    reputationBadge === "Trusted" ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" :
    reputationBadge === "Good"    ? "text-blue-400 bg-blue-500/15 border-blue-500/30" :
    "text-gray-400 bg-gray-700/50 border-gray-600";

  const barColor =
    reputationScore >= 80 ? "bg-emerald-500" :
    reputationScore >= 50 ? "bg-blue-500" : "bg-amber-500";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 400 }}
        animate={{ y: 0 }}
        exit={{ y: 400 }}
        transition={{ type: "spring", damping: 30 }}
        className="w-full max-w-[430px] bg-gray-900 rounded-t-3xl border-t border-gray-800
                   max-h-[85vh] overflow-y-auto"
      >
        {/* Photo header */}
        <div className="relative h-56">
          {photo ? (
            <img src={photo} alt={profile.name} className="w-full h-full object-cover rounded-t-3xl" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br
                            from-rose-900/60 to-gray-800 rounded-t-3xl text-6xl">🧑</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent rounded-t-3xl" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 flex items-center
                       justify-center text-white hover:bg-black/70 transition"
          >
            <X size={16} />
          </button>
          <div className="absolute bottom-4 left-5">
            <h2 className="text-2xl font-bold text-white">{profile.name}, {profile.age}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin size={12} className="text-gray-400" />
              <p className="text-gray-300 text-sm">{profile.city}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {profile.bio && (
            <p className="text-gray-300 text-sm leading-relaxed">{profile.bio}</p>
          )}

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2">
            {profile.is_verified && (
              <div className="flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30
                              px-3 py-1.5 rounded-full text-blue-300 text-xs font-medium">
                <BadgeCheck size={12} /> Age Verified
              </div>
            )}
            {profile.talent_profile_id && (
              <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30
                              px-3 py-1.5 rounded-full text-amber-300 text-xs font-medium">
                ⚡ Talent Protocol
              </div>
            )}
            {profile.github_username && (
              <a
                href={githubMeta?.profileUrl ?? `https://github.com/${profile.github_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-white/10 border border-white/20
                           px-3 py-1.5 rounded-full text-white text-xs font-medium
                           hover:bg-white/20 transition"
              >
                <Github size={12} />
                @{profile.github_username}
                {githubMeta && <span className="text-gray-400">· {githubMeta.publicRepos} repos</span>}
                <ExternalLink size={10} className="text-gray-400" />
              </a>
            )}
          </div>

          {/* Reputation */}
          <div className="bg-gray-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-medium">Date Reputation</span>
              <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border", badgeColor)}>
                {reputationBadge === "Trusted" ? "🛡 Trusted" :
                 reputationBadge === "Good"    ? "⭐ Good" : "✨ New"}
              </span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${reputationScore}%` }} />
            </div>
            <p className="text-gray-500 text-xs">{reputationScore}% confirmed dates</p>
          </div>

          {/* Wallet */}
          <div className="bg-gray-800 rounded-xl px-4 py-3">
            <p className="text-gray-500 text-xs mb-0.5">Wallet</p>
            <p className="text-gray-300 text-xs font-mono break-all">{profile.address}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
