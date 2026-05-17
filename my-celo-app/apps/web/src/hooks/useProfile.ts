"use client";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { CONTRACT_ADDRESSES, ABIS } from "@/lib/contracts";

export function useProfile(address?: `0x${string}`) {
  const { address: self } = useAccount();
  const target = address ?? self;

  const { data: tokenId, refetch, isLoading: isLoadingProfile, isError: isProfileError } = useReadContract({
    address: CONTRACT_ADDRESSES.profileNFT,
    abi: ABIS.profileNFT,
    functionName: "profileOf",
    args: [target!],
    query: { enabled: !!target },
  });

  const tid = tokenId as bigint | undefined;

  const { data: metadataURI } = useReadContract({
    address: CONTRACT_ADDRESSES.profileNFT,
    abi: ABIS.profileNFT,
    functionName: "metadataURI",
    args: [tid!],
    query: { enabled: !!tid && tid > 0n },
  });

  const { data: isVerified } = useReadContract({
    address: CONTRACT_ADDRESSES.profileNFT,
    abi: ABIS.profileNFT,
    functionName: "isVerified",
    args: [target!],
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

  const mint = async (ipfsURI: string) =>
    writeContractAsync({
      address: CONTRACT_ADDRESSES.profileNFT,
      abi: ABIS.profileNFT,
      functionName: "mint",
      args: [ipfsURI],
    });

  return { mint, isPending };
}

export function useUpdateMetadata() {
  const { writeContractAsync, isPending } = useWriteContract();

  const update = async (newURI: string) =>
    writeContractAsync({
      address: CONTRACT_ADDRESSES.profileNFT,
      abi: ABIS.profileNFT,
      functionName: "updateMetadata",
      args: [newURI],
    });

  return { update, isPending };
}
