import { type Address } from "viem";
import ProfileNFTAbi from "@/abis/ProfileNFT.json";
import MatchNFTAbi from "@/abis/MatchNFT.json";
import GiftRouterAbi from "@/abis/GiftRouter.json";
import DatePledgeAbi from "@/abis/DatePledge.json";
import PremiumFeaturesAbi from "@/abis/PremiumFeatures.json";

// cUSD on Celo Mainnet
export const CUSD_MAINNET = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as Address;
// cUSD on Celo Sepolia
export const CUSD_SEPOLIA = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1" as Address;

export const CUSD_ADDRESS =
  process.env.NEXT_PUBLIC_CHAIN_ID === "42220" ? CUSD_MAINNET : CUSD_SEPOLIA;

export const CONTRACT_ADDRESSES = {
  profileNFT:      (process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS  ?? "0x0000000000000000000000000000000000000000") as Address,
  matchNFT:        (process.env.NEXT_PUBLIC_MATCH_NFT_ADDRESS    ?? "0x0000000000000000000000000000000000000000") as Address,
  giftRouter:      (process.env.NEXT_PUBLIC_GIFT_ROUTER_ADDRESS  ?? "0x0000000000000000000000000000000000000000") as Address,
  datePledge:      (process.env.NEXT_PUBLIC_DATE_PLEDGE_ADDRESS  ?? "0x0000000000000000000000000000000000000000") as Address,
  premiumFeatures: (process.env.NEXT_PUBLIC_PREMIUM_ADDRESS      ?? "0x0000000000000000000000000000000000000000") as Address,
  cUSD:            (process.env.NEXT_PUBLIC_CUSD_ADDRESS         ?? CUSD_SEPOLIA) as Address,
} as const;

export const ABIS = {
  profileNFT:      ProfileNFTAbi,
  matchNFT:        MatchNFTAbi,
  giftRouter:      GiftRouterAbi,
  datePledge:      DatePledgeAbi,
  premiumFeatures: PremiumFeaturesAbi,
} as const;

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
