"use client";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { BadgeCheck, Zap } from "lucide-react";
import { ipfsToHttp } from "@/lib/ipfs";
import type { DbProfile } from "@/lib/supabase";

interface SwipeCardProps {
  profile: DbProfile;
  onSwipeLeft:  () => void;
  onSwipeRight: () => void;
  onSuperLike?: () => void;
  isBoosted?:   boolean;
}

export function SwipeCard({ profile, onSwipeLeft, onSwipeRight, onSuperLike, isBoosted }: SwipeCardProps) {
  const x        = useMotionValue(0);
  const y        = useMotionValue(0);
  const rotate   = useTransform(x, [-200, 200], [-20, 20]);
  const opacity  = useTransform(x, [-250, -100, 0, 100, 250], [0, 1, 1, 1, 0]);

  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, -20], [1, 0]);
  const superOpacity = useTransform(y, [-120, -20], [1, 0]);

  function handleDragEnd(_: any, info: PanInfo) {
    if (info.offset.x > 100)      onSwipeRight();
    else if (info.offset.x < -100) onSwipeLeft();
    else if (info.offset.y < -100 && onSuperLike) onSuperLike();
  }

  const photo = profile.photos?.[0] ? ipfsToHttp(profile.photos[0]) : null;

  return (
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
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-10 left-6 border-4 border-emerald-400 text-emerald-400
                     font-black text-3xl px-3 py-1 rounded-xl rotate-[-20deg] tracking-widest"
        >
          LIKE
        </motion.div>

        {/* NOPE badge */}
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute top-10 right-6 border-4 border-rose-500 text-rose-500
                     font-black text-3xl px-3 py-1 rounded-xl rotate-[20deg] tracking-widest"
        >
          NOPE
        </motion.div>

        {/* SUPER badge */}
        <motion.div
          style={{ opacity: superOpacity }}
          className="absolute top-10 left-1/2 -translate-x-1/2 border-4 border-yellow-400 text-yellow-400
                     font-black text-2xl px-3 py-1 rounded-xl tracking-widest"
        >
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

        {/* Profile info */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white">
                  {profile.name}, {profile.age}
                </h2>
                {profile.is_verified && (
                  <BadgeCheck size={22} className="text-blue-400" />
                )}
              </div>
              <p className="text-gray-300 text-sm mt-0.5">{profile.city}</p>
              {profile.bio && (
                <p className="text-gray-400 text-sm mt-2 line-clamp-2">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
