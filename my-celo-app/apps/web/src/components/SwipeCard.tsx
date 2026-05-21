"use client";
import { useState } from "react";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { BadgeCheck, Zap, Github, Shield, Info } from "lucide-react";
import { ipfsToHttp } from "@/lib/ipfs";
import type { DbProfile } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ProfilePeekSheet, useReputation } from "@/components/ProfilePeekSheet";
// useReputation is used here for the in-card trust badge overlay

interface SwipeCardProps {
  profile: DbProfile;
  onSwipeLeft:  () => void;
  onSwipeRight: () => void;
  onSuperLike?: () => void;
  isBoosted?:   boolean;
}

// ── Swipe card ────────────────────────────────────────────────────────────────
export function SwipeCard({ profile, onSwipeLeft, onSwipeRight, onSuperLike, isBoosted }: SwipeCardProps) {
  const x        = useMotionValue(0);
  const y        = useMotionValue(0);
  const rotate   = useTransform(x, [-200, 200], [-20, 20]);
  const opacity  = useTransform(x, [-250, -100, 0, 100, 250], [0, 1, 1, 1, 0]);

  const likeOpacity  = useTransform(x, [20, 120], [0, 1]);
  const nopeOpacity  = useTransform(x, [-120, -20], [1, 0]);
  const superOpacity = useTransform(y, [-120, -20], [1, 0]);

  const { badge: reputationBadge, score: reputationScore } = useReputation(profile.address);
  const [showPeek, setShowPeek] = useState(false);

  function handleDragEnd(_: any, info: PanInfo) {
    if (info.offset.x > 100)       onSwipeRight();
    else if (info.offset.x < -100) onSwipeLeft();
    else if (info.offset.y < -100 && onSuperLike) onSuperLike();
  }

  const photo = profile.photos?.[0] ? ipfsToHttp(profile.photos[0]) : null;

  return (
    <>
      <motion.div
        style={{ x, y, rotate, opacity }}
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.9}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: "grabbing" }}
        className="absolute w-full select-none cursor-grab"
      >
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-800
                        border border-gray-700 mx-2" style={{ height: "72vh", maxHeight: 560 }}>
          {/* Photo */}
          {photo ? (
            <img src={photo} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br
                            from-rose-900/60 to-gray-800 text-6xl">
              🧑
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* LIKE badge */}
          <motion.div style={{ opacity: likeOpacity }}
            className="absolute top-10 left-6 border-4 border-emerald-400 text-emerald-400
                       font-black text-3xl px-3 py-1 rounded-xl rotate-[-20deg] tracking-widest">
            LIKE
          </motion.div>

          {/* NOPE badge */}
          <motion.div style={{ opacity: nopeOpacity }}
            className="absolute top-10 right-6 border-4 border-rose-500 text-rose-500
                       font-black text-3xl px-3 py-1 rounded-xl rotate-[20deg] tracking-widest">
            NOPE
          </motion.div>

          {/* SUPER badge */}
          <motion.div style={{ opacity: superOpacity }}
            className="absolute top-10 left-1/2 -translate-x-1/2 border-4 border-yellow-400 text-yellow-400
                       font-black text-2xl px-3 py-1 rounded-xl tracking-widest">
            SUPER ⭐
          </motion.div>

          {/* Boost indicator */}
          {isBoosted && (
            <div className="absolute top-4 right-4 bg-yellow-500/20 backdrop-blur px-2 py-1
                            rounded-full flex items-center gap-1 text-yellow-400 text-xs font-medium">
              <Zap size={12} />
              Boosted
            </div>
          )}

          {/* Trust badges — top left */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5">
            {profile.is_verified && (
              <div className="flex items-center gap-1 bg-blue-500/20 backdrop-blur px-2 py-1
                              rounded-full text-blue-300 text-xs font-medium">
                <BadgeCheck size={11} /> Age Verified
              </div>
            )}
            {profile.talent_profile_id && (
              <div className="flex items-center gap-1 bg-amber-500/20 backdrop-blur px-2 py-1
                              rounded-full text-amber-300 text-xs font-medium">
                ⚡ Talent Protocol
              </div>
            )}
            {profile.github_username && (
              <div className="flex items-center gap-1 bg-white/10 backdrop-blur px-2 py-1
                              rounded-full text-white text-xs font-medium">
                <Github size={11} /> GitHub
              </div>
            )}
            {reputationBadge === "Trusted" && (
              <div className="flex items-center gap-1 bg-emerald-500/20 backdrop-blur px-2 py-1
                              rounded-full text-emerald-300 text-xs font-medium">
                <Shield size={11} /> Trusted Dater
              </div>
            )}
          </div>

          {/* Profile info + info button */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-end justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-white">
                    {profile.name}, {profile.age}
                  </h2>
                  {profile.role && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium
                                     bg-rose-500/20 border border-rose-500/30 text-rose-300">
                      {profile.role}
                    </span>
                  )}
                </div>
                <p className="text-gray-300 text-sm mt-0.5">
                  {profile.city}
                  {profile.gender ? ` · ${profile.gender}` : ""}
                </p>
                {profile.bio && (
                  <p className="text-gray-400 text-sm mt-2 line-clamp-2">{profile.bio}</p>
                )}
                {profile.interests && profile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {profile.interests.slice(0, 4).map((interest) => (
                      <span
                        key={interest}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-medium
                                   bg-white/10 backdrop-blur text-white/80 border border-white/15"
                      >
                        {interest}
                      </span>
                    ))}
                    {profile.interests.length > 4 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium
                                       bg-white/10 backdrop-blur text-white/60 border border-white/15">
                        +{profile.interests.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Info button */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setShowPeek(true); }}
                className="shrink-0 w-10 h-10 rounded-full bg-white/15 backdrop-blur
                           border border-white/25 flex items-center justify-center
                           hover:bg-white/25 transition"
              >
                <Info size={18} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {showPeek && (
        <ProfilePeekSheet profile={profile} onClose={() => setShowPeek(false)} />
      )}
    </>
  );
}
