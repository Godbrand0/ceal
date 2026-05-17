"use client";
import { useWriteContract, useReadContract, useAccount, useSwitchChain } from "wagmi";
import { celoSepolia } from "wagmi/chains";
import { type Address } from "viem";
import { CONTRACT_ADDRESSES, ABIS, ERC20_ABI } from "@/lib/contracts";

export function usePremium() {
  const { address, chain } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const { data: boostExpiresAt, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.premiumFeatures,
    abi: ABIS.premiumFeatures,
    functionName: "isBoosted",
    args: [address!],
    chainId: celoSepolia.id,
    query: { enabled: !!address },
  });

  const { data: boostPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.premiumFeatures,
    abi: ABIS.premiumFeatures,
    functionName: "boostPrice",
    chainId: celoSepolia.id,
  });

  const { data: superLikePrice } = useReadContract({
    address: CONTRACT_ADDRESSES.premiumFeatures,
    abi: ABIS.premiumFeatures,
    functionName: "superLikePrice",
    chainId: celoSepolia.id,
  });

  const { data: swipeUnlockPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.premiumFeatures,
    abi: ABIS.premiumFeatures,
    functionName: "swipeUnlockPrice",
    chainId: celoSepolia.id,
  });

  const ensureChain = async () => {
    if (chain?.id !== celoSepolia.id) {
      await switchChainAsync({ chainId: celoSepolia.id });
    }
  };

  const approveAndCall = async (price: bigint, fn: () => Promise<`0x${string}`>) => {
    await ensureChain();
    await writeContractAsync({
      address: CONTRACT_ADDRESSES.cUSD,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.premiumFeatures, price],
      chainId: celoSepolia.id,
    });
    return fn();
  };

  const boost = async () => {
    if (!boostPrice) return;
    await ensureChain();
    await writeContractAsync({
      address: CONTRACT_ADDRESSES.cUSD,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.premiumFeatures, boostPrice as bigint],
      chainId: celoSepolia.id,
    });
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.premiumFeatures,
      abi: ABIS.premiumFeatures,
      functionName: "boostProfile",
      chainId: celoSepolia.id,
    });
  };

  const superLike = async (target: Address) => {
    if (!superLikePrice) return;
    await ensureChain();
    await writeContractAsync({
      address: CONTRACT_ADDRESSES.cUSD,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.premiumFeatures, superLikePrice as bigint],
      chainId: celoSepolia.id,
    });
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.premiumFeatures,
      abi: ABIS.premiumFeatures,
      functionName: "superLike",
      args: [target],
      chainId: celoSepolia.id,
    });
  };

  const unlockSwipes = async () => {
    if (!swipeUnlockPrice) return;
    await ensureChain();
    await writeContractAsync({
      address: CONTRACT_ADDRESSES.cUSD,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.premiumFeatures, swipeUnlockPrice as bigint],
      chainId: celoSepolia.id,
    });
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.premiumFeatures,
      abi: ABIS.premiumFeatures,
      functionName: "unlockSwipes",
      chainId: celoSepolia.id,
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
