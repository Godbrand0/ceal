"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { MessageCircle, Heart } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useUserMatches } from "@/hooks/useMatches";
import { getProfile, type DbProfile, type DbMatch } from "@/lib/supabase";
import { ipfsToHttp } from "@/lib/ipfs";
import { truncateAddress } from "@/lib/app-utils";
import { AuthGuard } from "@/components/AuthGuard";

function MatchRow({ match }: { match: DbMatch }) {
  const router = useRouter();
  const { address } = useAccount();
  const [otherProfile, setOtherProfile] = useState<DbProfile | null>(null);

  useEffect(() => {
    if (!address) return;
    const other = address.toLowerCase() === match.user1.toLowerCase() ? match.user2 : match.user1;
    getProfile(other).then(setOtherProfile);
  }, [match, address]);

  const photo = otherProfile?.photos?.[0] ? ipfsToHttp(otherProfile.photos[0]) : null;
  const name  = otherProfile?.name ?? truncateAddress(
    address?.toLowerCase() === match.user1.toLowerCase() ? match.user2 : match.user1
  );

  return (
    <button
      onClick={() => router.push(`/matches/${match.id}`)}
      className="flex items-center gap-4 w-full px-5 py-4 hover:bg-gray-800/60 transition
                 border-b border-gray-800/60"
    >
      <div className="relative shrink-0">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700">
          {photo ? (
            <img src={photo} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-rose-900/60 to-gray-800">
              🧑
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 text-left">
        <p className="text-white font-medium text-sm truncate">{name}</p>
        <p className="text-gray-500 text-xs mt-0.5">
          {match.last_message ?? "Tap to say hi 👋"}
        </p>
      </div>

      <MessageCircle size={18} className="text-gray-600 shrink-0" />
    </button>
  );
}

export default function MatchesPage() {
  const { matches } = useUserMatches();

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col min-h-screen pb-20">
        {/* Header */}
        <div className="pt-14 pb-4 px-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Heart size={22} className="text-rose-400" />
            <h1 className="text-xl font-bold text-white">Matches</h1>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="text-5xl">💘</div>
            <h2 className="text-lg font-semibold text-white">No matches yet</h2>
            <p className="text-gray-500 text-sm">Keep swiping — your matches appear here when someone likes you back.</p>
          </div>
        ) : (
          <div className="flex-1">
            {matches.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        )}

        <BottomNav />
      </div>
    </AuthGuard>
  );
}
