"use client";
import { useWriteContract, useReadContract, useAccount, useSwitchChain } from "wagmi";
import { celo } from "wagmi/chains";
import { parseEther } from "viem";
import { CONTRACT_ADDRESSES, ABIS, ERC20_ABI } from "@/lib/contracts";
import { isMiniPay } from "@/lib/minipay";
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
    chainId: celo.id,
    query: { enabled: !!pledgeId },
  });

  const pledge = pledgeRaw as PledgeData | undefined;

  const { data: allowance } = useReadContract({
    address: CONTRACT_ADDRESSES.cUSD,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, CONTRACT_ADDRESSES.datePledge],
    chainId: celo.id,
    query: { enabled: !!address },
  });

  const feeField = isMiniPay() ? { feeCurrency: CONTRACT_ADDRESSES.cUSD } : {};

  const ensureChain = async () => {
    if (chain?.id !== celo.id) {
      await switchChainAsync({ chainId: celo.id });
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
        chainId: celo.id,
        ...feeField,
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
      chainId: celo.id,
      ...feeField,
    });
  };

  const accept = async (id: bigint) => {
    await ensureChain();
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "accept",
      args: [id],
      chainId: celo.id,
      ...feeField,
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
      chainId: celo.id,
      ...feeField,
    });
  };

  const confirm = async (id: bigint) => {
    await ensureChain();
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "confirm",
      args: [id],
      chainId: celo.id,
      ...feeField,
    });
  };

  const unstake = async (id: bigint) => {
    await ensureChain();
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "unstake",
      args: [id],
      chainId: celo.id,
      ...feeField,
    });
  };

  const signMutualCancel = async (id: bigint) => {
    await ensureChain();
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "signMutualCancel",
      args: [id],
      chainId: celo.id,
      ...feeField,
    });
  };

  const resolveTimeout = async (id: bigint) => {
    await ensureChain();
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "resolveTimeout",
      args: [id],
      chainId: celo.id,
      ...feeField,
    });
  };

  const cancel = async (id: bigint) => {
    await ensureChain();
    return writeContractAsync({
      address: CONTRACT_ADDRESSES.datePledge,
      abi: ABIS.datePledge,
      functionName: "cancel",
      args: [id],
      chainId: celo.id,
      ...feeField,
    });
  };

  return { pledge, propose, accept, lock, confirm, unstake, signMutualCancel, resolveTimeout, cancel, isPending, refetch };
}
