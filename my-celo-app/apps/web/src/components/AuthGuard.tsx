"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isConnected, isConnecting } = useAccount();
  const { hasProfile, isLoadingProfile } = useProfile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isConnecting || isLoadingProfile) return;

    if (!isConnected) {
      router.replace("/");
    } else if (!hasProfile) {
      router.replace("/onboarding");
    }
  }, [mounted, isConnected, isConnecting, hasProfile, isLoadingProfile, router]);

  // Don't render children until we know the user's state securely
  if (!mounted || isConnecting || isLoadingProfile || !isConnected || !hasProfile) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 size={40} className="animate-spin text-rose-400" />
      </div>
    );
  }

  return <>{children}</>;
}
