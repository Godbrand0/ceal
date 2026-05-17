"use client";
import { useWriteContract, useReadContract, useAccount, useSwitchChain } from "wagmi";
import { celoAlfajores } from "wagmi/chains";
import { parseEther, type Address } from "viem";
import { CONTRACT_ADDRESSES, ABIS, ERC20_ABI } from "@/lib/contracts";
import type { PledgeData } from "@/lib/types";

export function useDatePledge(pledgeId?: bigint) {
  const { address, chain } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const { data: pledgeRaw, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.datePledge,
    abi: ABIS.datePledge,
    functionName: "getPledge",
    args: [pledgeId!],
    chainId: celoAlfajores.id,
    query: { enabled: !!pledgeId },
  });

  const pledge = pledgeRaw as PledgeData | undefined;

  const { data: allowance } = useReadContract({
    address: CONTRACT_ADDRESSES.cUSD,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, CONTRACT_ADDRESSES.datePledge],
    chainId: celoAlfajores.id,
    query: { enabled: !!address },
  });

  const ensureChain = async () => {
    if (chain?.id !== celoAlfajores.id) {
      await switchChainAsync({ chainId: celoAlfajores.id });
    }
  };

  const ensureApproval = async (amount: bigint) => {
    const al = allowance as bigint | undefined;
    if (!al || al < amount) {
      await ensureChain();
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.cUSD,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.datePledge, amount],
        chainId: celoAlfajores.id,
      });
    }
  };

  const propose = async (matchId: bigint, amountEth: string, scheduledAt: bigint) => {
    const amount = parseEther(amountEth);
    await ensureApproval(amount);
    await ensureChain();
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "propose",
      args: [matchId, amount, scheduledAt],
      chainId: celoAlfajores.id,
    });
  };

  const accept = async (id: bigint) => {
    await ensureChain();
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "accept",
      args: [id],
      chainId: celoAlfajores.id,
    });
  };

  const lock = async (id: bigint, amountEth: string) => {
    const amount = parseEther(amountEth);
    await ensureApproval(amount);
    await ensureChain();
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "lock",
      args: [id],
      chainId: celoAlfajores.id,
    });
  };

  const confirm = async (id: bigint) => {
    await ensureChain();
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "confirm",
      args: [id],
      chainId: celoAlfajores.id,
    });
  };

  const claimGhost = async (id: bigint) => {
    await ensureChain();
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "claimGhost",
      args: [id],
      chainId: celoAlfajores.id,
    });
  };

  const cancel = async (id: bigint) => {
    await ensureChain();
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "cancel",
      args: [id],
      chainId: celoAlfajores.id,
    });
  };

  return { pledge, propose, accept, lock, confirm, claimGhost, cancel, isPending, refetch };
}
