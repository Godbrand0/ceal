"use client";
import { useWriteContract, useReadContract, useAccount, useSwitchChain } from "wagmi";
import { celoSepolia } from "wagmi/chains";
import { parseEther, type Address } from "viem";
import { CONTRACT_ADDRESSES, ABIS, ERC20_ABI } from "@/lib/contracts";

export const GIFT_TYPES = [
  { id: 0, emoji: "👋", label: "Icebreaker", price: "0.3" },
  { id: 1, emoji: "☕", label: "Coffee",     price: "0.5" },
  { id: 2, emoji: "🎵", label: "Song",       price: "0.5" },
  { id: 3, emoji: "🍫", label: "Chocolate",  price: "1.0" },
  { id: 4, emoji: "🥂", label: "Cocktail",   price: "2.0" },
  { id: 5, emoji: "🌹", label: "Red Rose",   price: "5.0" },
  { id: 6, emoji: "✏️", label: "Custom",     price: ""   },
] as const;

export function useGift() {
  const { address, chain } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const { data: allowance } = useReadContract({
    address: CONTRACT_ADDRESSES.cUSD,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, CONTRACT_ADDRESSES.giftRouter],
    chainId: celoSepolia.id,
    query: { enabled: !!address },
  });

  const sendGift = async ({
    matchId,
    recipient,
    amountEth,
    giftType,
    message,
  }: {
    matchId: bigint;
    recipient: Address;
    amountEth: string;
    giftType: number;
    message: string;
  }) => {
    if (chain?.id !== celoSepolia.id) {
      await switchChainAsync({ chainId: celoSepolia.id });
    }

    const amount = parseEther(amountEth);

    // Approve if needed
    if (!allowance || allowance < amount) {
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.cUSD,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.giftRouter, amount],
        chainId: celoSepolia.id,
      });
    }

    return writeContractAsync({
      address: CONTRACT_ADDRESSES.giftRouter,
      abi: ABIS.giftRouter,
      functionName: "sendGift",
      args: [matchId, recipient, amount, giftType, message],
      chainId: celoSepolia.id,
    });
  };

  return { sendGift, isPending };
}
