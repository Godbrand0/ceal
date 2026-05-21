"use client";
import { useReadContract, useReadContracts } from "wagmi";
import { celo } from "wagmi/chains";
import { type Abi } from "viem";
import { CONTRACT_ADDRESSES, ABIS } from "@/lib/contracts";
import { truncateAddress } from "@/lib/app-utils";

export interface MatchNFTData {
  matchId: bigint;
  user1: `0x${string}`;
  user2: `0x${string}`;
  matchedAt: bigint;
  giftsExchanged: bigint;
  totalGiftValue: bigint;
  dateCompleted: boolean;
  burned: boolean;
  user1TokenId: bigint;
  user2TokenId: bigint;
  myTokenId: bigint;
  partnerAddress: string;
  partnerShort: string;
}

export function useMatchNFTs(address?: `0x${string}`) {
  const { data: rawMatchIds, isLoading: loadingIds } = useReadContract({
    address: CONTRACT_ADDRESSES.matchNFT,
    abi: ABIS.matchNFT,
    functionName: "getUserMatches",
    args: [address!],
    chainId: celo.id,
    query: { enabled: !!address },
  });

  const matchIds = (rawMatchIds as bigint[] | undefined) ?? [];

  const { data: matchResults, isLoading: loadingMatches } = useReadContracts({
    contracts: matchIds.map((id) => ({
      address: CONTRACT_ADDRESSES.matchNFT,
      abi: ABIS.matchNFT as Abi,
      functionName: "getMatch",
      args: [id],
      chainId: celo.id,
    })),
    query: { enabled: matchIds.length > 0 },
  });

  const matches: MatchNFTData[] = [];

  if (matchResults && address) {
    matchIds.forEach((matchId, i) => {
      const result = matchResults[i];
      if (!result || result.status !== "success") return;
      const d = result.result as {
        user1: `0x${string}`; user2: `0x${string}`;
        matchedAt: bigint; giftsExchanged: bigint; totalGiftValue: bigint;
        dateCompleted: boolean; burned: boolean;
        user1TokenId: bigint; user2TokenId: bigint;
      };
      if (d.burned) return;
      const isUser1 = address.toLowerCase() === d.user1.toLowerCase();
      const partnerAddress = isUser1 ? d.user2 : d.user1;
      matches.push({
        matchId,
        ...d,
        myTokenId: isUser1 ? d.user1TokenId : d.user2TokenId,
        partnerAddress,
        partnerShort: truncateAddress(partnerAddress),
      });
    });
  }

  return {
    matches,
    isLoading: loadingIds || (matchIds.length > 0 && loadingMatches),
  };
}
