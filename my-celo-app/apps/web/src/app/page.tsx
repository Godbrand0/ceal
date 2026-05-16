"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useProfile } from "@/hooks/useProfile";
import { Flame } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { hasProfile } = useProfile();

  useEffect(() => {
    if (!isConnected) return;
    if (hasProfile) {
      router.replace("/discover");
    } else {
      router.replace("/onboarding");
    }
  }, [isConnected, hasProfile, router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 min-h-screen
                    bg-gradient-to-b from-rose-950 via-gray-950 to-gray-950">
      <div className="flex items-center gap-3">
        <div className="p-4 rounded-2xl bg-rose-500/20 backdrop-blur">
          <Flame size={48} className="text-rose-400" />
        </div>
      </div>
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white">CEAL</h1>
        <p className="text-gray-400 mt-2 text-sm">On-chain dating on Celo</p>
      </div>
      <p className="text-gray-500 text-sm animate-pulse">Connecting wallet…</p>
    </div>
  );
}
