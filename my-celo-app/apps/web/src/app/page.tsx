"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useProfile } from "@/hooks/useProfile";
import {
  Flame, ShieldCheck, Gift, Calendar, Loader2,
  Smartphone, UserCircle2, Heart, Trophy,
  ChevronDown, ChevronUp, HelpCircle, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    desc: "Connect with your wallet — one tap, no password, no email.",
  },
  {
    icon: <UserCircle2 size={20} className="text-amber-400" />,
    title: "Create your profile",
    desc: "Add your photo, interests, and a short bio. You instantly own a profile — it's yours forever.",
  },
  {
    icon: <Gift size={20} className="text-rose-400" />,
    title: "Swipe, match & send gifts",
    desc: "Like profiles, match with people, and send a small digital gift to show you're serious.",
  },
  {
    icon: <Heart size={20} className="text-pink-400" />,
    title: "Own your connections",
    desc: "Every match mints a shared keepsake — a digital token you and your match both own.",
  },
];

const features = [
  {
    icon: <ShieldCheck size={20} className="text-blue-400" />,
    title: "Real people only",
    desc: "Age-verified by Self Protocol — no bots, no fake accounts, no catfishing.",
  },
  {
    icon: <Gift size={20} className="text-rose-400" />,
    title: "Gift & be gifted",
    desc: "Send a small digital gift when you like someone. Receive gifts from admirers. It means a lot more than a swipe.",
  },
  {
    icon: <Trophy size={20} className="text-amber-400" />,
    title: "You own your story",
    desc: "Sign up and get a profile you own. Match with someone and you both get a shared keepsake — automatically.",
  },
  {
    icon: <Calendar size={20} className="text-emerald-400" />,
    title: "No more ghosting",
    desc: "Lock in a small deposit before a date. Show up and get it back. Ghost and lose it.",
  },
];

const faqs = [
  {
    q: "What is CEAL?",
    a: "CEAL is a dating app where every profile is real and every action means something. Sign up and you own your profile. Match with someone and you both get a shared digital keepsake. Send gifts, commit to dates, and build a reputation you actually earn.",
  },
  {
    q: "Do I need crypto to use CEAL?",
    a: "You need a digital wallet (like MetaMask or MiniPay) to sign in, but you don't need tokens to browse or match. You only need stablecoins (USDm, USDC, or USDT) if you want to send gifts or lock a date pledge.",
  },
  {
    q: "How does the date pledge work?",
    a: "Before a date, both parties lock a small stablecoin deposit in a smart contract. If the date happens and both confirm it with a photo, both get their full deposit back — no fee. If one person cancels before the date, they get a full refund too. If a mutual cancel is requested after the date (for example, one person didn't show), the platform keeps 20% as a no-show fee.",
  },
  {
    q: "What happens if someone ghosts me?",
    a: "After the date time has passed, if the other party has confirmed but you haven't, you can request a mutual cancel. Both parties must sign. If the other party doesn't respond within 7 days, anyone can trigger a timeout resolution — the funds are split with a 20% platform fee.",
  },
  {
    q: "Can I get a refund if plans change before the date?",
    a: "Yes — if the date hasn't happened yet, either party can unstake and both get a 100% refund with no penalty.",
  },
  {
    q: "How is my identity verified?",
    a: "We use Self Protocol for age verification — it confirms you're 18+ without storing any of your documents or personal data. Once verified, a badge appears on your profile.",
  },
  {
    q: "What do I own when I sign up?",
    a: "When you create a profile, a digital token is issued to your wallet. It represents your identity on CEAL, holds your reputation and verified status, and cannot be transferred — it's uniquely yours.",
  },
  {
    q: "What is the GitHub integration for?",
    a: "You can optionally link your GitHub username to show your commit activity on your profile and SwipeCard. It's a trust signal — people who actively build software tend to be real humans with real identities.",
  },
  {
    q: "How is the reputation score calculated?",
    a: "Your date reputation score is based on your confirmed vs. cancelled dates: (confirmed dates ÷ total dates) × 100. Confirmed dates are photo-verified by AI. A score of 80%+ earns you the 'Trusted Dater' badge which shows on your SwipeCard.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-900/50 transition"
      >
        <span className="text-white text-sm font-medium pr-4">{q}</span>
        {open ? (
          <ChevronUp size={16} className="text-gray-500 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-gray-500 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-gray-400 text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { hasProfile, isLoadingProfile } = useProfile();
  const [isRouting, setIsRouting] = useState(false);
  const { connect } = useConnect();

  // Auto-connect silently inside MiniPay — no button needed
  useEffect(() => {
    if (typeof window !== "undefined" && (window.ethereum as any)?.isMiniPay) {
      connect({ connector: injected() });
    }
  }, [connect]);

  function handleDiscover() {
    setIsRouting(true);
    if (!isLoadingProfile) {
      router.push(hasProfile ? "/discover" : "/onboarding");
    }
  }

  // Handle routing if profile finishes loading after click
  useEffect(() => {
    if (isRouting && !isLoadingProfile) {
      router.push(hasProfile ? "/discover" : "/onboarding");
    }
  }, [isRouting, isLoadingProfile, hasProfile, router]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 overflow-y-auto">

      {/* Hero */}
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
          Sign up and own your profile. Match and own the moment.
          Gift someone you like, and receive gifts in return. No fakes, no ghosting.
        </p>
        <div className="mt-10 w-full max-w-xs space-y-3">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== "loading";
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus || authenticationStatus === "authenticated");

              if (!ready) {
                return (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <Loader2 size={20} className="animate-spin text-rose-400" />
                    <span className="text-gray-400 text-sm">Loading…</span>
                  </div>
                );
              }

              if (!connected) {
                return (
                  <>
                    <button
                      onClick={openConnectModal}
                      className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95
                                 font-bold text-white text-base transition-all shadow-lg shadow-rose-500/25"
                    >
                      Connect Wallet
                    </button>
                    <p className="text-gray-600 text-xs">
                      Sign in with MetaMask, MiniPay, or any digital wallet
                    </p>
                  </>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-left flex flex-col gap-2">
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold">Connected Wallet</p>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-mono text-sm font-medium">
                        {account.displayName}
                      </span>
                      <button
                        onClick={openAccountModal}
                        className="text-xs font-medium text-gray-400 hover:text-rose-400 transition"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleDiscover}
                    disabled={isRouting}
                    className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95
                               font-bold text-white text-base transition-all shadow-lg shadow-rose-500/25
                               disabled:opacity-70 disabled:cursor-wait"
                  >
                    {isRouting || (isRouting && isLoadingProfile) ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={18} className="animate-spin" /> Checking profile…
                      </span>
                    ) : (
                      "Discover"
                    )}
                  </button>
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 pb-10 max-w-sm mx-auto w-full">
        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ value, label }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-5 text-center">
              <p className="text-2xl font-black text-rose-400 mb-1">{value}</p>
              <p className="text-gray-500 text-xs leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="px-6 pb-10 max-w-sm mx-auto w-full">
        <p className="text-gray-600 text-xs uppercase tracking-widest text-center mb-5">How it works</p>
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

      {/* Why CEAL */}
      <div className="px-6 pb-16 space-y-3 max-w-sm mx-auto w-full">
        <p className="text-gray-600 text-xs uppercase tracking-widest text-center mb-5">Why CEAL is different</p>
        {features.map(({ icon, title, desc }) => (
          <div key={title}
            className="flex items-start gap-4 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
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

      {/* FAQ */}
      <div className="px-6 pb-10 max-w-sm mx-auto w-full">
        <div className="flex items-center gap-2 justify-center mb-5">
          <HelpCircle size={16} className="text-gray-500" />
          <p className="text-gray-600 text-xs uppercase tracking-widest">Frequently asked questions</p>
        </div>
        <div className="space-y-2">
          {faqs.map((faq) => (
            <FaqItem key={faq.q} {...faq} />
          ))}
        </div>
      </div>

      {/* Support link */}
      <div className="px-6 pb-16 max-w-sm mx-auto w-full">
        <a href="/support"
          className="flex items-center justify-between w-full bg-gray-900 border border-gray-800
                     rounded-2xl px-4 py-4 hover:bg-gray-800 transition group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <MessageCircle size={18} className="text-rose-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Need help?</p>
              <p className="text-gray-500 text-xs">Contact our support team</p>
            </div>
          </div>
          <span className="text-gray-600 text-xs group-hover:text-gray-400 transition">Support →</span>
        </a>
      </div>

      <p className="pb-10 text-center text-gray-700 text-xs">Safe · Verified · Free to join</p>
    </div>
  );
}
