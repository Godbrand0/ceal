"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { GIFT_TYPES, useGift } from "@/hooks/useGift";
import type { Address } from "viem";
import { cn } from "@/lib/utils";

interface GiftModalProps {
  matchId:   bigint;
  recipient: Address;
  onClose:   () => void;
  onSent:    (giftType: number, amount: string, message: string, txHash: string) => void;
}

export function GiftModal({ matchId, recipient, onClose, onSent }: GiftModalProps) {
  const { sendGift, isPending } = useGift();
  const [selected, setSelected]   = useState<number | null>(null);
  const [customAmt, setCustomAmt] = useState("");
  const [message, setMessage]     = useState("");
  const [error, setError]         = useState("");

  const activeGift = selected !== null ? GIFT_TYPES[selected] : null;
  const amount     = selected === 6 ? customAmt : activeGift?.price ?? "";

  async function handleSend() {
    if (!amount || !activeGift) return;
    setError("");
    try {
      const txHash = await sendGift({
        matchId,
        recipient,
        amountEth: amount,
        giftType: selected!,
        message,
      });
      onSent(selected!, amount, message, txHash);
      onClose();
    } catch (err: any) {
      setError(err?.shortMessage ?? err?.message ?? "Transaction failed");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        transition={{ type: "spring", damping: 28 }}
        className="w-full max-w-[430px] bg-gray-900 rounded-t-3xl border-t border-gray-800 p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Send a Gift</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={22} />
          </button>
        </div>

        {/* Gift grid */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {GIFT_TYPES.map((gift) => (
            <button
              key={gift.id}
              onClick={() => setSelected(gift.id)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-2xl border transition",
                selected === gift.id
                  ? "border-rose-500 bg-rose-500/20"
                  : "border-gray-700 bg-gray-800 hover:border-gray-600"
              )}
            >
              <span className="text-2xl">{gift.emoji}</span>
              <span className="text-[10px] text-gray-400 text-center leading-tight">{gift.label}</span>
              {gift.price && (
                <span className="text-[10px] text-rose-400 font-medium">{gift.price} cUSD</span>
              )}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        {selected === 6 && (
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Amount (cUSD)</label>
            <input
              type="number"
              min="0.3"
              step="0.1"
              value={customAmt}
              onChange={(e) => setCustomAmt(e.target.value)}
              placeholder="e.g. 1.5"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                         text-white placeholder-gray-500 focus:outline-none focus:border-rose-500
                         text-sm"
            />
          </div>
        )}

        {/* Message */}
        <div className="mb-5">
          <label className="block text-sm text-gray-400 mb-1">Message (optional)</label>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say something sweet…"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                       text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 text-sm"
          />
        </div>

        {error && (
          <p className="text-rose-400 text-sm bg-rose-500/10 rounded-xl px-4 py-3 mb-4">{error}</p>
        )}

        <button
          disabled={!activeGift || !amount || isPending}
          onClick={handleSend}
          className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50
                     disabled:cursor-not-allowed font-semibold text-white transition flex items-center
                     justify-center gap-2"
        >
          {isPending ? (
            <><Loader2 size={18} className="animate-spin" /> Sending…</>
          ) : (
            `Send ${activeGift?.emoji ?? ""} ${amount ? `(${amount} cUSD)` : ""}`
          )}
        </button>

        <p className="text-center text-xs text-gray-600 mt-3">10% protocol fee applied</p>
      </motion.div>
    </motion.div>
  );
}
