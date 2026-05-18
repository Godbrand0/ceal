"use client";
import { motion } from "framer-motion";
import { X, Zap, Star, RefreshCw, Loader2, Sun, Moon } from "lucide-react";
import { formatEther } from "viem";
import { usePremium } from "@/hooks/usePremium";
import { useTheme } from "@/lib/theme";
import type { Address } from "viem";

interface PremiumModalProps {
  targetAddress?: Address;
  onClose: () => void;
}

export function PremiumModal({ targetAddress, onClose }: PremiumModalProps) {
  const { isBoosted, boostPrice, superLikePrice, swipeUnlockPrice, boost, superLike, unlockSwipes, isPending } =
    usePremium();
  const { theme, toggleTheme } = useTheme();

  const features = [
    {
      icon: <Zap size={24} className="text-yellow-400" />,
      label: "Boost Profile",
      desc: "Show at the top of discovery for 24 hours",
      price: boostPrice,
      active: isBoosted,
      action: boost,
      activeLabel: "Boosted ✓",
    },
    {
      icon: <Star size={24} className="text-blue-400" />,
      label: "Super Like",
      desc: "They'll know you really like them",
      price: superLikePrice,
      action: () => targetAddress ? superLike(targetAddress) : undefined,
      disabled: !targetAddress,
    },
    {
      icon: <RefreshCw size={24} className="text-rose-400" />,
      label: "Unlock Swipes",
      desc: "+20 swipes for this session",
      price: swipeUnlockPrice,
      action: unlockSwipes,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Premium Features</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-3">
          {features.map(({ icon, label, desc, price, action, active, activeLabel, disabled }) => (
            <div key={label} className="flex items-center gap-4 bg-gray-800 rounded-2xl p-4">
              <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center shrink-0">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{label}</p>
                <p className="text-gray-500 text-xs mt-0.5 truncate">{desc}</p>
              </div>
              <button
                disabled={isPending || active || disabled}
                onClick={action}
                className="shrink-0 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600
                           disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs
                           font-semibold transition whitespace-nowrap"
              >
                {active ? (activeLabel ?? "Active") : isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : price ? (
                  `${formatEther(price as bigint)} cUSD`
                ) : "—"}
              </button>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 my-4" />

        {/* Settings */}
        <p className="text-gray-600 text-xs uppercase tracking-widest mb-3">Settings</p>
        <div className="flex items-center justify-between bg-gray-800 rounded-2xl px-4 py-4">
          <div className="flex items-center gap-3">
            {theme === "dark"
              ? <Moon size={20} className="text-blue-400" />
              : <Sun size={20} className="text-amber-400" />}
            <div>
              <p className="text-white font-medium text-sm">
                {theme === "dark" ? "Dark mode" : "Light mode"}
              </p>
              <p className="text-gray-500 text-xs">Tap to switch appearance</p>
            </div>
          </div>
          {/* Toggle pill */}
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
              theme === "dark" ? "bg-blue-500" : "bg-amber-400"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
                          transition-transform duration-300 ${
                            theme === "dark" ? "translate-x-6" : "translate-x-0"
                          }`}
            />
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-5">
          Payments are made in cUSD via MiniPay
        </p>
      </motion.div>
    </motion.div>
  );
}
