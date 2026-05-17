"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useProfile } from "@/hooks/useProfile";
import { Flame, ShieldCheck, Gift, Calendar, Loader2 } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { hasProfile, tokenId, isLoadingProfile, isProfileError } = useProfile();

  const [phase, setPhase] = useState<"idle" | "connecting" | "checking">("idle");

  // Auto-redirect if wallet already connected on load (e.g. MiniPay)
  useEffect(() => {
    if (!isConnected || !address) {
      if (phase === "checking") setPhase("idle");
      return;
    }
    setPhase("checking");
    
    if (isLoadingProfile) return; // Wait for contract read to finish
    
    // If the contract reverts (no profile exists) or explicitly has no token
    if (isProfileError || !hasProfile) {
      router.replace("/onboarding");
    } else if (hasProfile) {
      router.replace("/discover");
    }
  }, [isConnected, address, hasProfile, isLoadingProfile, isProfileError, router]);

  function handleConnect() {
    setPhase("connecting");
    connect({ connector: injected() });
  }

  const features = [
    {
      icon: <ShieldCheck size={20} className="text-blue-400" />,
      title: "Verified identity",
      desc: "ZK age proofs via Self Protocol — no fake profiles",
    },
    {
      icon: <Gift size={20} className="text-rose-400" />,
      title: "Meaningful gifts",
      desc: "Send cUSD gifts to express real interest",
    },
    {
      icon: <Calendar size={20} className="text-amber-400" />,
      title: "Date Pledge",
      desc: "Lock cUSD before a date — ghost and lose it",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 overflow-y-auto">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-6 pt-20 pb-12 text-center">
        {/* Logo mark */}
        <div className="mb-6 relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-rose-700
                          flex items-center justify-center shadow-2xl shadow-rose-500/30">
            <Flame size={40} className="text-white" />
          </div>
          <div className="absolute -inset-2 rounded-3xl bg-rose-500/15 blur-xl -z-10" />
        </div>

        <h1 className="text-5xl font-black text-white tracking-tight mb-2">CEAL</h1>
        <p className="text-rose-400 font-medium text-xs uppercase tracking-widest mb-4">
          On-chain dating on Celo
        </p>
        <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
          Every match is minted. Every gift means something.
          Ghost a date and lose your deposit.
        </p>

        {/* CTA */}
        <div className="mt-10 w-full max-w-xs space-y-3">
          {phase === "idle" ? (
            <button
              onClick={handleConnect}
              className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95
                         font-bold text-white text-base transition-all shadow-lg shadow-rose-500/25"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 size={20} className="animate-spin text-rose-400" />
              <span className="text-gray-400 text-sm">
                {phase === "connecting"
                  ? "Waiting for wallet…"
                  : hasProfile
                  ? "Welcome back…"
                  : "Checking profile…"}
              </span>
            </div>
          )}

          <p className="text-gray-600 text-xs">
            Works with MetaMask · MiniPay · any injected wallet
          </p>
        </div>
      </div>

      {/* Feature cards */}
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
        Built on Celo · Powered by cUSD
      </p>
    </div>
  );
}
