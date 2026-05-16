import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Celo Mainnet cUSD
const CUSD_MAINNET = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
// Celo Sepolia cUSD (test token — update after faucet/deploy)
const CUSD_SEPOLIA = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

const CEALModule = buildModule("CEALModule", (m) => {
  const network   = m.getParameter("network", "sepolia");
  const cUSDAddr  = network === "mainnet" ? CUSD_MAINNET : CUSD_SEPOLIA;

  const treasury   = m.getParameter("treasury",   "0x0000000000000000000000000000000000000001");
  const oracle     = m.getParameter("oracle",     "0x0000000000000000000000000000000000000001");
  const selfVerifier = m.getParameter("selfVerifier", "0x0000000000000000000000000000000000000001");

  const profileNFT = m.contract("ProfileNFT", [selfVerifier]);
  const matchNFT   = m.contract("MatchNFT",   [oracle]);

  const giftRouter = m.contract("GiftRouter", [cUSDAddr, treasury, matchNFT]);
  const datePledge = m.contract("DatePledge", [cUSDAddr, treasury, matchNFT]);
  const premium    = m.contract("PremiumFeatures", [cUSDAddr, treasury]);

  // Wire GiftRouter and DatePledge into MatchNFT
  m.call(matchNFT, "setRouters", [giftRouter, datePledge]);

  return { profileNFT, matchNFT, giftRouter, datePledge, premium };
});

export default CEALModule;
