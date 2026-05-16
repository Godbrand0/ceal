"use client";
import { useWriteContract, useReadContract, useAccount } from "wagmi";
import { type Address } from "viem";
import { CONTRACT_ADDRESSES, ABIS, ERC20_ABI } from "@/lib/contracts";

export function usePremium() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const { data: boostExpiresAt, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.premiumFeatures,
    abi: ABIS.premiumFeatures,
    functionName: "isBoosted",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: boostPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.premiumFeatures,
    abi: ABIS.premiumFeatures,
    functionName: "boostPrice",
  });

  const { data: superLikePrice } = useReadContract({
    address: CONTRACT_ADDRESSES.premiumFeatures,
    abi: ABIS.premiumFeatures,
    functionName: "superLikePrice",
  });

  const { data: swipeUnlockPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.premiumFeatures,
    abi: ABIS.premiumFeatures,
    functionName: "swipeUnlockPrice",
  });

  const approveAndCall = async (price: bigint, fn: () => Promise<`0x${string}`>) => {
    const { data: allowance } = {} as any; // read inline
    await writeContractAsync({
      address: CONTRACT_ADDRESSES.cUSD,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.premiumFeatures, price],
    });
    return fn();
  };

  const boost = async () => {
    if (!boostPrice) return;
    await writeContractAsync({
      address: CONTRACT_ADDRESSES.cUSD,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.premiumFeatures, boostPrice as bigint],
    });
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.premiumFeatures,
      abi: ABIS.premiumFeatures,
      functionName: "boostProfile",
    });
  };

  const superLike = async (target: Address) => {
    if (!superLikePrice) return;
    await writeContractAsync({
      address: CONTRACT_ADDRESSES.cUSD,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.premiumFeatures, superLikePrice as bigint],
    });
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.premiumFeatures,
      abi: ABIS.premiumFeatures,
      functionName: "superLike",
      args: [target],
    });
  };

  const unlockSwipes = async () => {
    if (!swipeUnlockPrice) return;
    await writeContractAsync({
      address: CONTRACT_ADDRESSES.cUSD,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.premiumFeatures, swipeUnlockPrice as bigint],
    });
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.premiumFeatures,
      abi: ABIS.premiumFeatures,
      functionName: "unlockSwipes",
    });
  };

  return {
    isBoosted: !!boostExpiresAt,
    boostPrice,
    superLikePrice,
    swipeUnlockPrice,
    boost,
    superLike,
    unlockSwipes,
    isPending,
    refetch,
  };
}
