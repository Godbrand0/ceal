import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

const FAUCET_ABI = parseAbi([
  "function claimFor(address recipient) external",
  "function canClaim(address user) external view returns (bool)",
  "function nextClaimAt(address user) external view returns (uint256)",
  "function paused() external view returns (bool)",
  "function claimAmount() external view returns (uint256)",
]);

const FAUCET_ADDRESS = process.env.NEXT_PUBLIC_FAUCET_ADDRESS as `0x${string}`;
const RELAYER_PRIVATE_KEY = process.env.FAUCET_RELAYER_PRIVATE_KEY as `0x${string}`;

// Simple in-memory IP rate limit — one request per IP per minute to prevent spam.
// Cooldown enforcement happens on-chain; this is just a DoS guard.
const ipLastRequest = new Map<string, number>();
const IP_COOLDOWN_MS = 60_000;

export async function POST(req: NextRequest) {
  // ── Env checks ──────────────────────────────────────────────────────────────
  if (!FAUCET_ADDRESS || !RELAYER_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "Faucet not configured" },
      { status: 503 }
    );
  }

  // ── IP rate limit ────────────────────────────────────────────────────────────
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const lastReq = ipLastRequest.get(ip) ?? 0;
  if (now - lastReq < IP_COOLDOWN_MS) {
    return NextResponse.json(
      { error: "Too many requests. Wait a moment and try again." },
      { status: 429 }
    );
  }
  ipLastRequest.set(ip, now);

  // ── Parse body ───────────────────────────────────────────────────────────────
  let address: string;
  try {
    const body = await req.json();
    address = body.address;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  // ── On-chain checks ──────────────────────────────────────────────────────────
  const publicClient = createPublicClient({
    chain: celo,
    transport: http(),
  });

  const [isPaused, eligible, nextClaimAt] = await Promise.all([
    publicClient.readContract({ address: FAUCET_ADDRESS, abi: FAUCET_ABI, functionName: "paused" }),
    publicClient.readContract({ address: FAUCET_ADDRESS, abi: FAUCET_ABI, functionName: "canClaim", args: [address as `0x${string}`] }),
    publicClient.readContract({ address: FAUCET_ADDRESS, abi: FAUCET_ABI, functionName: "nextClaimAt", args: [address as `0x${string}`] }),
  ]);

  if (isPaused) {
    return NextResponse.json({ error: "Faucet is paused" }, { status: 503 });
  }

  if (!eligible) {
    const unlocksAt = new Date(Number(nextClaimAt) * 1000).toISOString();
    return NextResponse.json(
      { error: "Already claimed today", unlocksAt },
      { status: 429 }
    );
  }

  // ── Submit claimFor() — relayer pays the gas ─────────────────────────────────
  const account = privateKeyToAccount(RELAYER_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: http(),
  });

  try {
    const txHash = await walletClient.writeContract({
      address: FAUCET_ADDRESS,
      abi: FAUCET_ABI,
      functionName: "claimFor",
      args: [address as `0x${string}`],
    });

    return NextResponse.json({ success: true, txHash });
  } catch (err: any) {
    const message: string = err?.shortMessage ?? err?.message ?? "Transaction failed";

    if (message.includes("CooldownActive")) {
      return NextResponse.json({ error: "Already claimed today" }, { status: 429 });
    }
    if (message.includes("InsufficientBalance")) {
      return NextResponse.json({ error: "Faucet is empty — check back later" }, { status: 503 });
    }

    console.error("[faucet] claimFor failed:", message);
    return NextResponse.json({ error: "Transaction failed" }, { status: 500 });
  }
}
