import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// cUSD (USDm) token addresses
const CUSD_MAINNET = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
const CUSD_SEPOLIA = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

const CEALModule = buildModule("CEALModule", (m) => {
  const network    = m.getParameter("network",      "sepolia");
  const cUSDAddr   = network === "mainnet" ? CUSD_MAINNET : CUSD_SEPOLIA;

  // Your wallet that receives protocol fees
  const treasury   = m.getParameter("treasury",     "0x0000000000000000000000000000000000000001");
  // Server wallet that calls matchNFT.mintMatch() after mutual likes
  const oracle     = m.getParameter("oracle",       "0x0000000000000000000000000000000000000001");
  // Self Protocol verifier address
  const selfVerifier = m.getParameter("selfVerifier", "0x0000000000000000000000000000000000000001");
  // Dedicated hot wallet that calls faucet.claimFor() — keeps FAUCET_RELAYER_PRIVATE_KEY in .env
  const relayer    = m.getParameter("relayer",      "0x0000000000000000000000000000000000000001");

  // ── Core contracts ─────────────────────────────────────────────────────────
  const profileNFT = m.contract("ProfileNFT",      [selfVerifier]);
  const matchNFT   = m.contract("MatchNFT",        [oracle]);
  const giftRouter = m.contract("GiftRouter",      [cUSDAddr, treasury, matchNFT]);
  const datePledge = m.contract("DatePledge",      [cUSDAddr, treasury, matchNFT]);
  const premium    = m.contract("PremiumFeatures", [cUSDAddr, treasury]);

  // Wire GiftRouter and DatePledge addresses into MatchNFT
  m.call(matchNFT, "setRouters", [giftRouter, datePledge]);

  // ── Faucet ────────────────────────────────────────────────────────────────
  // Deployed with a relayer address that is allowed to call claimFor().
  // After deployment, send CELO to the faucet contract address to fund it.
  const faucet = m.contract("CealFaucet", [relayer]);

  return { profileNFT, matchNFT, giftRouter, datePledge, premium, faucet };
});

export default CEALModule;
