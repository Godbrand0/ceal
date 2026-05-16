"use client";
import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { BadgeCheck, Zap, ExternalLink, LogOut, Edit3, Trophy } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useProfile } from "@/hooks/useProfile";
import { useUserMatches } from "@/hooks/useMatches";
import { usePremium } from "@/hooks/usePremium";
import { getProfile, type DbProfile } from "@/lib/supabase";
import { ipfsToHttp } from "@/lib/ipfs";
import { truncateAddress } from "@/lib/app-utils";

export default function ProfilePage() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { tokenId, isVerified, hasProfile } = useProfile();
  const { matchIds } = useUserMatches();
  const { isBoosted } = usePremium();

  const [dbProfile, setDbProfile] = useState<DbProfile | null>(null);

  useEffect(() => {
    if (!address) return;
    getProfile(address).then(setDbProfile);
  }, [address]);

  const photo = dbProfile?.photos?.[0] ? ipfsToHttp(dbProfile.photos[0]) : null;

  const stats = [
    { label: "Matches",     value: (matchIds as bigint[]).length },
    { label: "Token ID",    value: tokenId ? `#${tokenId}` : "—" },
    { label: "Status",      value: isVerified ? "Verified ✓" : "Unverified" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="pt-14 px-5 pb-4 flex items-center justify-between border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">Profile</h1>
        <button
          onClick={() => disconnect()}
          className="text-gray-500 hover:text-gray-300 transition p-1"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-6">
        <div className="relative">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-800 border-4 border-gray-700
                          shadow-xl">
            {photo ? (
              <img src={photo} alt={dbProfile?.name ?? ""} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl
                              bg-gradient-to-br from-rose-900/60 to-gray-800">
                🧑
              </div>
            )}
          </div>
          {isBoosted && (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-yellow-500
                            flex items-center justify-center border-2 border-gray-950">
              <Zap size={14} className="text-white" />
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-2xl font-bold text-white">
              {dbProfile?.name ?? truncateAddress(address ?? "")}
            </h2>
            {isVerified && <BadgeCheck size={22} className="text-blue-400" />}
          </div>
          {dbProfile && (
            <p className="text-gray-400 text-sm mt-0.5">
              {dbProfile.age} · {dbProfile.city}
            </p>
          )}
          <p className="text-gray-600 text-xs mt-1 font-mono">
            {truncateAddress(address ?? "")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-gray-800 mx-5 rounded-2xl overflow-hidden mb-6">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-gray-900 flex flex-col items-center py-4 gap-1">
            <span className="text-white font-bold text-lg">{value}</span>
            <span className="text-gray-500 text-xs">{label}</span>
          </div>
        ))}
      </div>

      {/* Bio */}
      {dbProfile?.bio && (
        <div className="mx-5 mb-5">
          <p className="text-gray-400 text-sm leading-relaxed">{dbProfile.bio}</p>
        </div>
      )}

      {/* NFT card */}
      {hasProfile && (
        <div className="mx-5 mb-5 rounded-2xl bg-gradient-to-br from-rose-900/30 to-gray-800
                        border border-rose-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <Trophy size={22} className="text-rose-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">ProfileNFT #{tokenId?.toString()}</p>
              <p className="text-gray-500 text-xs">Soulbound · Non-transferable</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mx-5 space-y-3">
        <a
          href={`https://sepolia.celoscan.io/address/${address}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between w-full bg-gray-800 rounded-2xl px-4 py-4
                     hover:bg-gray-700 transition"
        >
          <span className="text-gray-300 text-sm">View on CeloScan</span>
          <ExternalLink size={16} className="text-gray-500" />
        </a>

        {dbProfile?.talent_profile_id ? (
          <div className="flex items-center justify-between bg-gray-800 rounded-2xl px-4 py-4">
            <span className="text-gray-300 text-sm">Talent Protocol</span>
            <span className="text-emerald-400 text-xs">Linked ✓</span>
          </div>
        ) : (
          <a
            href="https://talentprotocol.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between w-full bg-gray-800 rounded-2xl px-4 py-4
                       hover:bg-gray-700 transition"
          >
            <span className="text-gray-300 text-sm">Link Talent Protocol</span>
            <ExternalLink size={16} className="text-gray-500" />
          </a>
        )}

        {!isVerified && (
          <a
            href="https://self.xyz"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between w-full bg-gray-800 rounded-2xl px-4 py-4
                       hover:bg-gray-700 transition"
          >
            <div>
              <span className="text-gray-300 text-sm block">Verify with Self Protocol</span>
              <span className="text-gray-600 text-xs">Get a verified badge on your profile</span>
            </div>
            <ExternalLink size={16} className="text-gray-500 shrink-0" />
          </a>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
