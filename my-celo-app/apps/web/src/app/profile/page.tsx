"use client";
import { useState, useEffect, useCallback } from "react";
import { useAccount, useDisconnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  BadgeCheck, Zap, ExternalLink, LogOut, Trophy, Star, Loader2, ShieldCheck
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SelfVerificationModal } from "@/components/SelfVerificationModal";
import { useProfile } from "@/hooks/useProfile";
import { useUserMatches } from "@/hooks/useMatches";
import { usePremium } from "@/hooks/usePremium";
import { getProfile, updateProfileTalent, type DbProfile } from "@/lib/supabase";
import { ipfsToHttp } from "@/lib/ipfs";
import { truncateAddress } from "@/lib/app-utils";
import { CONTRACT_ADDRESSES, ABIS } from "@/lib/contracts";

interface TalentPassport {
  score: number;
  activity_score: number;
  identity_score: number;
  skills_score: number;
  passport_id: number;
}

export default function ProfilePage() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { tokenId, isVerified, hasProfile, refetch } = useProfile();
  const { matchIds } = useUserMatches();
  const { isBoosted } = usePremium();

  const [dbProfile, setDbProfile]       = useState<DbProfile | null>(null);
  const [showSelfModal, setShowSelfModal] = useState(false);

  // Talent Protocol
  const [talentPassport, setTalentPassport]   = useState<TalentPassport | null>(null);
  const [talentLoading, setTalentLoading]     = useState(false);
  const [talentLinking, setTalentLinking]     = useState(false);
  const [talentManualId, setTalentManualId]   = useState("");

  const { writeContract, data: talentTxHash, isPending: talentPending } = useWriteContract();
  const { isSuccess: talentTxDone } = useWaitForTransactionReceipt({ hash: talentTxHash });

  const loadProfile = useCallback(() => {
    if (!address) return;
    getProfile(address).then(setDbProfile);
  }, [address]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Fetch Talent Protocol passport by wallet address (requires TALENT_PROTOCOL_API_KEY env var)
  useEffect(() => {
    if (!address) return;
    setTalentLoading(true);
    fetch(`/api/talent-protocol?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error === "api_key_not_configured") return; // skip silently
        setTalentPassport(d.passport ?? null);
      })
      .catch(() => {})
      .finally(() => setTalentLoading(false));
  }, [address]);

  // After on-chain linkTalentProtocol confirms, update Supabase
  useEffect(() => {
    if (!talentTxDone || !address || !talentPassport) return;
    setTalentLinking(false);
    updateProfileTalent(address, String(talentPassport.passport_id))
      .then(loadProfile)
      .catch(console.error);
  }, [talentTxDone, address, talentPassport, loadProfile]);

  function handleLinkTalent() {
    const profileId = talentPassport ? String(talentPassport.passport_id) : talentManualId.trim();
    if (!profileId || !address) return;
    setTalentLinking(true);
    writeContract({
      address: CONTRACT_ADDRESSES.profileNFT,
      abi: ABIS.profileNFT,
      functionName: "linkTalentProtocol",
      args: [profileId],
    });
  }

  function handleVerified() {
    setShowSelfModal(false);
    refetch();
    loadProfile();
  }

  const photo = dbProfile?.photos?.[0] ? ipfsToHttp(dbProfile.photos[0]) : null;
  const talentLinked = !!dbProfile?.talent_profile_id;  // true if already stored in Supabase

  const stats = [
    { label: "Matches", value: (matchIds as bigint[]).length },
    { label: "Token ID", value: tokenId ? `#${tokenId}` : "—" },
    { label: "Status",   value: isVerified ? "Verified ✓" : "Unverified" },
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
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-800 border-4 border-gray-700 shadow-xl">
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

      {/* Talent Protocol card — only after profile is created */}
      {hasProfile && (<div className="mx-5 mb-3">
        {talentLinked ? (
          <div className="flex items-center gap-3 bg-gray-800 rounded-2xl px-4 py-4">
            <Star size={18} className="text-amber-400" />
            <div>
              <p className="text-white text-sm font-medium">Talent Protocol</p>
              <p className="text-emerald-400 text-xs">
                Linked · ID {dbProfile?.talent_profile_id} ✓
              </p>
            </div>
          </div>
        ) : talentLoading ? (
          <div className="flex items-center gap-3 bg-gray-800 rounded-2xl px-4 py-4">
            <Loader2 size={16} className="text-gray-500 animate-spin" />
            <span className="text-gray-500 text-sm">Looking up builder score…</span>
          </div>
        ) : talentPassport ? (
          /* Auto-fetched passport (requires Talent+ API key) */
          <div className="bg-gray-800 rounded-2xl px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star size={18} className="text-amber-400" />
                <span className="text-white font-medium text-sm">Talent Protocol</span>
              </div>
              <button
                onClick={handleLinkTalent}
                disabled={talentPending || talentLinking}
                className="text-xs text-rose-400 font-medium disabled:opacity-50"
              >
                {talentPending || talentLinking
                  ? <Loader2 size={12} className="animate-spin" />
                  : "Link on-chain"}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Builder",  value: talentPassport.score },
                { label: "Activity", value: talentPassport.activity_score },
                { label: "Identity", value: talentPassport.identity_score },
                { label: "Skills",   value: talentPassport.skills_score },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-900 rounded-xl p-2 text-center">
                  <p className="text-white font-bold text-base">{value ?? "—"}</p>
                  <p className="text-gray-500 text-[10px]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Manual entry fallback — no API key needed */
          <div className="bg-gray-800 rounded-2xl px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Star size={18} className="text-amber-400" />
              <span className="text-white font-medium text-sm">Link Talent Protocol</span>
            </div>
            <p className="text-gray-500 text-xs mb-3">
              Enter your Talent Protocol passport ID to link your builder score on-chain.{" "}
              <a
                href="https://talentprotocol.com"
                target="_blank"
                rel="noreferrer"
                className="text-rose-400 underline"
              >
                Get yours
              </a>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={talentManualId}
                onChange={(e) => setTalentManualId(e.target.value)}
                placeholder="e.g. 12345"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2
                           text-white text-sm placeholder-gray-600 focus:outline-none
                           focus:border-rose-500 transition"
              />
              <button
                onClick={handleLinkTalent}
                disabled={!talentManualId.trim() || talentPending || talentLinking}
                className="px-4 py-2 bg-rose-500 rounded-xl text-white text-sm font-medium
                           disabled:opacity-40 transition"
              >
                {talentPending || talentLinking
                  ? <Loader2 size={14} className="animate-spin" />
                  : "Link"}
              </button>
            </div>
          </div>
        )}
      </div>)}

      {/* Self Protocol verification — only after profile is created */}
      {hasProfile && !isVerified && (
        <div className="mx-5 mb-3">
          <button
            onClick={() => setShowSelfModal(true)}
            className="flex items-center justify-between w-full bg-gray-800 rounded-2xl px-4 py-4
                       hover:bg-gray-700 transition"
          >
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="text-blue-400 mt-0.5 shrink-0" />
              <div className="text-left">
                <span className="text-gray-300 text-sm block">Verify with Self Protocol</span>
                <span className="text-gray-600 text-xs">Prove you&apos;re 18+ — adds a verified badge</span>
              </div>
            </div>
            <span className="text-gray-600 text-xs shrink-0 ml-2">ZK proof</span>
          </button>
        </div>
      )}

      {/* CeloScan link */}
      <div className="mx-5">
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
      </div>

      <BottomNav />

      {showSelfModal && (
        <SelfVerificationModal
          onClose={() => setShowSelfModal(false)}
          onVerified={handleVerified}
        />
      )}
    </div>
  );
}
