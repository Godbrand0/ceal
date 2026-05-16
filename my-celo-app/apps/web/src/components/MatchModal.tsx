"use client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle } from "lucide-react";
import { ipfsToHttp } from "@/lib/ipfs";
import type { DbProfile } from "@/lib/supabase";

interface MatchModalProps {
  profile: DbProfile;
  matchId?: string;
  onClose: () => void;
}

export function MatchModal({ profile, matchId, onClose }: MatchModalProps) {
  const router = useRouter();
  const photo  = profile.photos?.[0] ? ipfsToHttp(profile.photos[0]) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm mx-4 text-center"
      >
        {/* Hearts burst */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ duration: 0.5 }}
          className="text-6xl mb-4"
        >
          💘
        </motion.div>

        <h2 className="text-3xl font-bold text-white mb-1">It&apos;s a Match!</h2>
        <p className="text-gray-400 text-sm mb-8">
          You and {profile.name} liked each other
        </p>

        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-rose-500 shadow-lg shadow-rose-500/30">
            {photo ? (
              <img src={photo} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-rose-700 to-pink-900 flex items-center justify-center text-3xl">
                🧑
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 px-4">
          {matchId && (
            <button
              onClick={() => { onClose(); router.push(`/matches/${matchId}`); }}
              className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 transition
                         font-semibold text-white flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} />
              Send a message
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 transition
                       font-semibold text-gray-300"
          >
            Keep swiping
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
