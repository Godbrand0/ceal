import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, decodeEventLog } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import MatchNFTAbi from "@/abis/MatchNFT.json";

const MATCH_NFT = (process.env.NEXT_PUBLIC_MATCH_NFT_ADDRESS ?? "") as `0x${string}`;
const RPC       = process.env.CELO_RPC_URL || "https://forno.celo.org";

export async function POST(req: NextRequest) {
  try {
    const { user1, user2 }: { user1: string; user2: string } = await req.json();

    if (!user1 || !user2) {
      return NextResponse.json({ error: "user1 and user2 required" }, { status: 400 });
    }

    const oracleKey = process.env.ORACLE_PRIVATE_KEY as `0x${string}` | undefined;
    if (!oracleKey) {
      return NextResponse.json({ error: "ORACLE_PRIVATE_KEY not set" }, { status: 500 });
    }

    const account   = privateKeyToAccount(oracleKey);
    const transport = http(RPC);

    const walletClient = createWalletClient({ account, chain: celo, transport });
    const publicClient = createPublicClient({ chain: celo, transport });

    const txHash = await walletClient.writeContract({
      address: MATCH_NFT,
      abi: MatchNFTAbi,
      functionName: "mint",
      args: [user1 as `0x${string}`, user2 as `0x${string}`],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    // Pull matchId from the Matched(uint256 indexed matchId, ...) event
    let onChainMatchId: string | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: MatchNFTAbi, data: log.data, topics: log.topics });
        if (decoded.eventName === "Matched") {
          onChainMatchId = String((decoded.args as unknown as { matchId: bigint }).matchId);
          break;
        }
      } catch {
        // not this log
      }
    }

    return NextResponse.json({ txHash, onChainMatchId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mint-match]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
