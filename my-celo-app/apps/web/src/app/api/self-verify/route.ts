import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoSepolia, celo } from "viem/chains";
import ProfileNFTAbi from "@/abis/ProfileNFT.json";

// Self Protocol posts here when a proof is verified.
// Body contains at minimum: userId (the wallet address we passed as userId in SelfAppBuilder).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Self Protocol sends the userId we configured (wallet address as hex)
    const userId: string | undefined = body?.userId ?? body?.publicSignals?.userId;

    if (!userId || !userId.startsWith("0x")) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const userAddress = userId as `0x${string}`;

    const privateKey = process.env.SELF_VERIFIER_PRIVATE_KEY;
    if (!privateKey) {
      // No server wallet configured — return success so onSuccess still fires.
      // The frontend will call setVerified with the user's wallet on testnet.
      return NextResponse.json({ ok: true, message: "no_server_wallet" });
    }

    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? "11142220");
    const rpcUrl  = process.env.CELO_RPC_URL ?? (chainId === 42220
      ? "https://forno.celo.org"
      : "https://sepolia-forno.celo-testnet.org");

    const chain   = chainId === 42220 ? celo : celoSepolia;
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });
    const profileNFTAddress = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS as `0x${string}`;

    if (!profileNFTAddress || profileNFTAddress === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json({ ok: true, message: "contract_not_deployed" });
    }

    const txHash = await wallet.writeContract({
      address: profileNFTAddress,
      abi: ProfileNFTAbi,
      functionName: "setVerified",
      args: [userAddress],
    });

    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return NextResponse.json({ ok: true, txHash });
  } catch (err: any) {
    console.error("self-verify error:", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
