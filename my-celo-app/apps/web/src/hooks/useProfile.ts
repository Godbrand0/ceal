"use client";
import { useReadContract, useWriteContract, useAccount, useSwitchChain } from "wagmi";
import { celo } from "wagmi/chains";
import { CONTRACT_ADDRESSES, ABIS } from "@/lib/contracts";
import { isMiniPay } from "@/lib/minipay";

export function useProfile(address?: `0x${string}`) {
  const { address: self } = useAccount();
  const target = address ?? self;

  const { data: tokenId, refetch, isLoading: isLoadingProfile, isError: isProfileError } = useReadContract({
    address: CONTRACT_ADDRESSES.profileNFT,
    abi: ABIS.profileNFT,
    functionName: "profileOf",
    args: [target!],
    chainId: celo.id,
    query: { enabled: !!target },
  });

  const tid = tokenId as bigint | undefined;

  const { data: metadataURI } = useReadContract({
    address: CONTRACT_ADDRESSES.profileNFT,
    abi: ABIS.profileNFT,
    functionName: "metadataURI",
    args: [tid!],
    chainId: celo.id,
    query: { enabled: !!tid && tid > 0n },
  });

  const { data: isVerified } = useReadContract({
    address: CONTRACT_ADDRESSES.profileNFT,
    abi: ABIS.profileNFT,
    functionName: "isVerified",
    args: [target!],
    chainId: celo.id,
    query: { enabled: !!target },
  });

  const hasProfile = !!tid && tid > 0n;

  return {
    tokenId: tid,
    metadataURI: metadataURI as string | undefined,
    isVerified: isVerified as boolean | undefined,
    hasProfile,
    isLoadingProfile,
    isProfileError,
    refetch,
  };
}

export function useMintProfile() {
  const { writeContractAsync, isPending } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const { chain } = useAccount();

  const mint = async (ipfsURI: string) => {
    if (chain?.id !== celo.id) {
      await switchChainAsync({ chainId: celo.id });
    }
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.profileNFT,
      abi: ABIS.profileNFT,
      functionName: "mint",
      args: [ipfsURI],
      chainId: celo.id,
      ...(isMiniPay() && { feeCurrency: CONTRACT_ADDRESSES.cUSD }),
    });
  };

  return { mint, isPending };
}

export function useUpdateMetadata() {
  const { writeContractAsync, isPending } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const { chain } = useAccount();

  const update = async (newURI: string) => {
    if (chain?.id !== celo.id) {
      await switchChainAsync({ chainId: celo.id });
    }
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.profileNFT,
      abi: ABIS.profileNFT,
      functionName: "updateMetadata",
      args: [newURI],
      chainId: celo.id,
      ...(isMiniPay() && { feeCurrency: CONTRACT_ADDRESSES.cUSD }),
    });
  };

  return { update, isPending };
}
