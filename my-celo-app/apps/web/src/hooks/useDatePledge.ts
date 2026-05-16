"use client";
import { useWriteContract, useReadContract, useAccount } from "wagmi";
import { parseEther, type Address } from "viem";
import { CONTRACT_ADDRESSES, ABIS, ERC20_ABI } from "@/lib/contracts";
import type { PledgeData } from "@/lib/types";

export function useDatePledge(pledgeId?: bigint) {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const { data: pledgeRaw, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.datePledge,
    abi: ABIS.datePledge,
    functionName: "getPledge",
    args: [pledgeId!],
    query: { enabled: !!pledgeId },
  });

  const pledge = pledgeRaw as PledgeData | undefined;

  const { data: allowance } = useReadContract({
    address: CONTRACT_ADDRESSES.cUSD,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, CONTRACT_ADDRESSES.datePledge],
    query: { enabled: !!address },
  });

  const ensureApproval = async (amount: bigint) => {
    const al = allowance as bigint | undefined;
    if (!al || al < amount) {
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.cUSD,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.datePledge, amount],
      });
    }
  };

  const propose = async (matchId: bigint, amountEth: string, scheduledAt: bigint) => {
    const amount = parseEther(amountEth);
    await ensureApproval(amount);
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "propose",
      args: [matchId, amount, scheduledAt],
    });
  };

  const accept = async (id: bigint) =>
    writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "accept",
      args: [id],
    });

  const lock = async (id: bigint, amountEth: string) => {
    const amount = parseEther(amountEth);
    await ensureApproval(amount);
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "lock",
      args: [id],
    });
  };

  const confirm = async (id: bigint) =>
    writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "confirm",
      args: [id],
    });

  const claimGhost = async (id: bigint) =>
    writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "claimGhost",
      args: [id],
    });

  const cancel = async (id: bigint) =>
    writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "cancel",
      args: [id],
    });

  return { pledge, propose, accept, lock, confirm, claimGhost, cancel, isPending, refetch };
}
