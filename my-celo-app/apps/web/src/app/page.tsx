"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useProfile } from "@/hooks/useProfile";
import {
  Flame, ShieldCheck, Gift, Calendar, Loader2,
  Smartphone, UserCircle2, Sparkles, Heart,
} from "lucide-react";

const stats = [
  { value: "100+", label: "Verified developers joined" },
  { value: "30+",  label: "Couples matched" },
  { value: "500+", label: "Gifts sent" },
  { value: "0",    label: "Fake profiles" },
];

const steps = [
  {
    icon: <Smartphone size={20} className="text-rose-400" />,
    title: "Sign in with your account",
    desc: "Connect with your existing crypto wallet — it takes just a tap, no password needed.",
  },
  {
    icon: <UserCircle2 size={20} className="text-amber-400" />,
    title: "Create your profile",
    desc: "Add your name, photo, and a short bio. Your profile is secured and uniquely yours.",
  },
  {
    icon: <Sparkles size={20} className="text-blue-400" />,
    title: "Get verified",
    desc: "Prove you're a real person and 18+ — no documents stored, just a quick check.",
  },
  {
    icon: <Heart size={20} className="text-rose-400" />,
    title: "Swipe, match & connect",
    desc: "Like profiles, match with people, and send a small gift to show you're serious.",
  },
];

const features = [
  {
    icon: <ShieldCheck size={20} className="text-blue-400" />,
    title: "Real people only",
    desc: "Age verified by Self Protocol — no bots, no fake accounts, no catfishing.",
  },
  {
    icon: <Gift size={20} className="text-rose-400" />,
    title: "Show genuine interest",
    desc: "Send a small digital gift when you like someone — it means a lot more than a swipe.",
  },
  {
    icon: <Calendar size={20} className="text-amber-400" />,
    title: "Serious about dates",
    desc: "Lock in a small deposit before a date. Show up or lose it — no more ghosting.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { hasProfile, isLoadingProfile, isProfileError } = useProfile();

  useEffect(() => {
    if (!isConnected || !address || isLoadingProfile) return;

    if (isProfileError || !hasProfile) {
      router.replace("/onboarding");
    } else {
      router.replace("/discover");
    }
  }, [isConnected, address, hasProfile, isLoadingProfile, isProfileError, router]);

  const isChecking = isConnected && isLoadingProfile;

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 overflow-y-auto">

      {/* ── Hero ── */}
      <div className="flex flex-col items-center justify-center px-6 pt-20 pb-10 text-center">
        <div className="mb-6 relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-rose-700
                          flex items-center justify-center shadow-2xl shadow-rose-500/30">
            <Flame size={40} className="text-white" />
          </div>
          <div className="absolute -inset-2 rounded-3xl bg-rose-500/15 blur-xl -z-10" />
        </div>

        <h1 className="text-5xl font-black text-white tracking-tight mb-2">CEAL</h1>
        <p className="text-rose-400 font-medium text-xs uppercase tracking-widest mb-4">
          Dating that actually means something
        </p>
        <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
          Every profile is real. Every gift is genuine.
          Stand someone up and you lose your deposit — no more ghosting.
        </p>

        {/* CTA */}
        <div className="mt-10 w-full max-w-xs space-y-3">
          {isChecking ? (
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 size={20} className="animate-spin text-rose-400" />
              <span className="text-gray-400 text-sm">
                {hasProfile ? "Welcome back…" : "Setting things up…"}
              </span>
            </div>
          ) : (
            <button
              onClick={() => openConnectModal?.()}
              className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95
                         font-bold text-white text-base transition-all shadow-lg shadow-rose-500/25"
            >
              Get Started — It's Free
            </button>
          )}

          <p className="text-gray-600 text-xs">
            Sign in with MetaMask, MiniPay, or any crypto wallet
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="px-6 pb-10 max-w-sm mx-auto w-full">
        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ value, label }) => (
            <div
              key={label}
              className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-5 text-center"
            >
              <p className="text-2xl font-black text-rose-400 mb-1">{value}</p>
              <p className="text-gray-500 text-xs leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="px-6 pb-10 max-w-sm mx-auto w-full">
        <p className="text-gray-600 text-xs uppercase tracking-widest text-center mb-5">
          How it works
        </p>
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-800" />
          <div className="space-y-6">
            {steps.map(({ icon, title, desc }, i) => (
              <div key={title} className="flex gap-4 relative">
                <div className="shrink-0 w-10 h-10 rounded-full bg-gray-900 border border-gray-700
                                flex items-center justify-center z-10">
                  {icon}
                </div>
                <div className="pt-1 pb-2">
                  <span className="text-gray-600 text-xs font-medium">Step {i + 1}</span>
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Why CEAL ── */}
      <div className="px-6 pb-16 space-y-3 max-w-sm mx-auto w-full">
        <p className="text-gray-600 text-xs uppercase tracking-widest text-center mb-5">
          Why CEAL is different
        </p>
        {features.map(({ icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-4 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4"
          >
            <div className="mt-0.5 shrink-0 w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center">
              {icon}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{title}</p>
              <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="pb-10 text-center text-gray-700 text-xs">
        Safe · Verified · Free to join
      </p>
    </div>
  );
}
