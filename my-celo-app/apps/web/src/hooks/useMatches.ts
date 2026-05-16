"use client";
import { useReadContract, useAccount } from "wagmi";
import { CONTRACT_ADDRESSES, ABIS } from "@/lib/contracts";
import type { MatchData } from "@/lib/types";

export function useUserMatches() {
  const { address } = useAccount();

  const { data: matchIds, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.matchNFT,
    abi: ABIS.matchNFT,
    functionName: "getUserMatches",
    args: [address!],
    query: { enabled: !!address },
  });

  return { matchIds: (matchIds as bigint[] | undefined) ?? [], refetch };
}

export function useMatchData(matchId: bigint | undefined) {
  const { data, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.matchNFT,
    abi: ABIS.matchNFT,
    functionName: "getMatch",
    args: [matchId!],
    query: { enabled: !!matchId },
  });

  return { match: data as MatchData | undefined, refetch };
}
