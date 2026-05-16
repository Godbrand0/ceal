"use client";
import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Settings, X, Heart, Star } from "lucide-react";
import { SwipeCard } from "@/components/SwipeCard";
import { BottomNav } from "@/components/BottomNav";
import { MatchModal } from "@/components/MatchModal";
import { PremiumModal } from "@/components/PremiumModal";
import { getDiscoverProfiles, recordSwipe, checkMutualLike, type DbProfile } from "@/lib/supabase";

export default function DiscoverPage() {
  const { address } = useAccount();

  const [profiles, setProfiles]     = useState<DbProfile[]>([]);
  const [loading, setLoading]       = useState(true);
  const [matchedProfile, setMatchedProfile] = useState<DbProfile | null>(null);
  const [showPremium, setShowPremium]       = useState(false);
  const [swipesLeft, setSwipesLeft]         = useState(10);

  useEffect(() => {
    if (!address) return;
    getDiscoverProfiles(address).then((p) => {
      setProfiles(p);
      setLoading(false);
    });
  }, [address]);

  const currentProfile = profiles[profiles.length - 1] ?? null;

  const handleSwipe = useCallback(
    async (direction: "like" | "pass") => {
      if (!address || !currentProfile) return;

      setProfiles((prev) => prev.slice(0, -1));
      setSwipesLeft((n) => Math.max(0, n - 1));

      await recordSwipe(address, currentProfile.address, direction);

      if (direction === "like") {
        const isMutual = await checkMutualLike(address, currentProfile.address);
        if (isMutual) setMatchedProfile(currentProfile);
      }
    },
    [address, currentProfile]
  );

  const handleSuperLike = useCallback(() => {
    if (!currentProfile) return;
    setShowPremium(true);
  }, [currentProfile]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Flame size={40} className="text-rose-400 animate-pulse" />
          <p className="text-gray-400 text-sm">Finding matches…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <div className="flex items-center gap-2">
          <Flame size={24} className="text-rose-400" />
          <span className="text-xl font-bold text-white">CEAL</span>
        </div>
        <button onClick={() => setShowPremium(true)} className="text-gray-400 hover:text-white transition">
          <Settings size={22} />
        </button>
      </div>

      {/* Swipe area */}
      <div className="flex-1 relative px-4 flex flex-col">
        {profiles.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="text-5xl">🔥</div>
            <h2 className="text-xl font-semibold text-white">You&apos;re all caught up!</h2>
            <p className="text-gray-400 text-sm">No more profiles right now. Check back later.</p>
          </div>
        ) : (
          <>
            <div className="relative flex-1" style={{ minHeight: "72vh" }}>
              <AnimatePresence>
                {profiles.slice(-3).map((profile, idx, arr) => (
                  <motion.div
                    key={profile.address}
                    style={{
                      scale: 1 - (arr.length - 1 - idx) * 0.04,
                      y: (arr.length - 1 - idx) * -10,
                      zIndex: idx,
                    }}
                    className="absolute inset-0"
                  >
                    {idx === arr.length - 1 ? (
                      <SwipeCard
                        profile={profile}
                        onSwipeLeft={() => handleSwipe("pass")}
                        onSwipeRight={() => handleSwipe("like")}
                        onSuperLike={handleSuperLike}
                      />
                    ) : (
                      <div className="w-full mx-2 rounded-3xl bg-gray-800 border border-gray-700"
                           style={{ height: "72vh", maxHeight: 560 }} />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-6 py-6">
              <button
                onClick={() => handleSwipe("pass")}
                className="w-14 h-14 rounded-full bg-gray-800 border border-gray-700
                           flex items-center justify-center shadow-lg
                           hover:bg-rose-500/20 hover:border-rose-500 transition"
              >
                <X size={24} className="text-rose-400" />
              </button>

              <button
                onClick={handleSuperLike}
                className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700
                           flex items-center justify-center shadow-lg
                           hover:bg-yellow-500/20 hover:border-yellow-500 transition"
              >
                <Star size={20} className="text-yellow-400" />
              </button>

              <button
                onClick={() => handleSwipe("like")}
                className="w-14 h-14 rounded-full bg-rose-500 flex items-center
                           justify-center shadow-lg hover:bg-rose-600 transition"
              >
                <Heart size={24} className="text-white fill-white" />
              </button>
            </div>

            {/* Swipes counter */}
            {swipesLeft <= 3 && (
              <p className="text-center text-xs text-gray-500 pb-2">
                {swipesLeft} swipes left ·{" "}
                <button onClick={() => setShowPremium(true)} className="text-rose-400 underline">
                  Unlock more
                </button>
              </p>
            )}
          </>
        )}
      </div>

      {matchedProfile && (
        <MatchModal
          profile={matchedProfile}
          onClose={() => setMatchedProfile(null)}
        />
      )}

      {showPremium && (
        <PremiumModal
          targetAddress={currentProfile?.address as `0x${string}` | undefined}
          onClose={() => setShowPremium(false)}
        />
      )}

      <BottomNav />
    </div>
  );
}
