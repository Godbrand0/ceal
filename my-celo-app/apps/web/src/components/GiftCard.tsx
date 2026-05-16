"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { GIFT_TYPES } from "@/hooks/useGift";

interface GiftCardProps {
  giftType:   number;
  amount:     string;
  message:    string;
  isReceived: boolean;
}

export function GiftCard({ giftType, amount, message, isReceived }: GiftCardProps) {
  const [opened, setOpened] = useState(!isReceived);
  const gift = GIFT_TYPES[giftType] ?? GIFT_TYPES[6];

  if (!opened) {
    return (
      <motion.div
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpened(true)}
        className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-4
                   cursor-pointer text-white text-center w-44 shadow-lg"
      >
        <div className="text-4xl mb-2">🎁</div>
        <div className="text-xs font-medium opacity-80">Tap to open</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-500/30
                 rounded-2xl p-4 w-44"
    >
      <div className="text-4xl text-center mb-2">{gift.emoji}</div>
      <div className="text-center font-semibold text-rose-300 text-sm">{gift.label}</div>
      <div className="text-center text-rose-400 text-xs mt-0.5">{amount} cUSD</div>
      {message && (
        <p className="text-gray-400 text-xs text-center mt-2 italic line-clamp-3">
          &ldquo;{message}&rdquo;
        </p>
      )}
    </motion.div>
  );
}
