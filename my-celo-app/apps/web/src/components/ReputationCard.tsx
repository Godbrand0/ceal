"use client";
import { useEffect, useState } from "react";
import { Shield, Star, Sparkles } from "lucide-react";
import { getReputationScore } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface ReputationCardProps {
  address: string;
}

const BADGE_CONFIG = {
  Trusted: { label: "Trusted Dater", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
  Good:    { label: "Good Track Record", icon: Star, color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" },
  New:     { label: "New Member", icon: Sparkles, color: "text-gray-400", bg: "bg-gray-700/50 border-gray-600" },
};

export function ReputationCard({ address }: ReputationCardProps) {
  const [data, setData] = useState<{
    score: number;
    confirmedDates: number;
    cancelledDates: number;
    badge: "Trusted" | "Good" | "New" | null;
  } | null>(null);

  useEffect(() => {
    getReputationScore(address).then(setData);
  }, [address]);

  if (!data) {
    return (
      <div className="bg-gray-800 rounded-2xl p-4 animate-pulse h-24" />
    );
  }

  const badgeKey = data.badge ?? "New";
  const cfg = BADGE_CONFIG[badgeKey];
  const Icon = cfg.icon;

  const barColor =
    data.score >= 80 ? "bg-emerald-500" :
    data.score >= 50 ? "bg-blue-500" :
    "bg-amber-500";

  return (
    <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-white text-sm font-semibold">Date Reputation</span>
        <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium", cfg.bg, cfg.color)}>
          <Icon size={12} />
          {cfg.label}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-gray-400 text-xs">Score</span>
          <span className="text-white text-xs font-bold">{data.score}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${data.score}%` }}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 bg-emerald-500/10 rounded-xl px-3 py-2 text-center">
          <p className="text-emerald-400 text-lg font-bold">{data.confirmedDates}</p>
          <p className="text-gray-500 text-xs">Confirmed</p>
        </div>
        <div className="flex-1 bg-rose-500/10 rounded-xl px-3 py-2 text-center">
          <p className="text-rose-400 text-lg font-bold">{data.cancelledDates}</p>
          <p className="text-gray-500 text-xs">Cancelled</p>
        </div>
      </div>
    </div>
  );
}
