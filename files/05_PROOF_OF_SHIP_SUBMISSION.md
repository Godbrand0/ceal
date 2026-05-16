# Spark — Proof-of-Ship Submission Guide

---

## Overview

This document covers everything needed to maximize your Proof-of-Ship score: KarmaGAP setup, milestone structure, scoring criteria alignment, judging narrative, and the pitch deck outline.

---

## Proof-of-Ship Scoring Criteria

The Celo DevRel team + AI agents score projects on:

| Criterion | How Spark Scores |
|---|---|
| **Transaction count** | Profile mints, match NFTs, gifts, pledges, premium purchases — 200+ txns/month at modest usage |
| **User count** | Each profile mint = 1 unique on-chain user; targeted at 50+ users in month 1 |
| **GitHub README & commits** | Detailed README, frequent commits across 4 repos (contracts, frontend, subgraph, backend) |
| **Demo video quality** | Clear 4-min walkthrough showing full loop: profile → swipe → match → gift → date pledge |
| **Milestone quality** | KarmaGAP milestones tied to specific PRs and contract deployments |

---

## KarmaGAP Setup

### Step 1: Create Project on KarmaGAP
Go to [gap.karmahq.xyz](https://gap.karmahq.xyz) and create a project with:
- **Project name:** Spark — On-Chain Dating on Celo
- **Description:** A MiniPay-native dating mini app where mutual matches mint a shared NFT, users gift cUSD to express interest, and a Date Pledge escrow holds both parties accountable for arranged dates.
- **Tags:** `minipay`, `dating`, `nft`, `defi`, `celo`, `social`
- **GitHub:** link to your repo
- **Demo URL:** Vercel deployment link

### Step 2: Sign Up for Proof-of-Ship Season
In KarmaGAP, find the current **Proof-of-Ship season** program and click "Sign Up" — this is **required** to be eligible for prizes.

### Step 3: Select Tracks
- ✅ **MiniApps** (primary)
- ✅ **DeFi & Stablecoin Payments** (secondary — cUSD gifting + pledges)

---

## Milestone Structure

Post these milestones in KarmaGAP throughout the month. Attach PR links to each.

---

### Milestone 1 (End of Week 1) — Smart Contracts Deployed

**Title:** Core Smart Contracts Deployed to Alfajores

**Description:**
Deployed 5 smart contracts to Celo Alfajores testnet:
- `ProfileNFT.sol` — soulbound NFT for wallet-bound identity
- `MatchNFT.sol` — co-owned NFT minted on mutual match
- `GiftRouter.sol` — cUSD gift routing with 10% protocol fee
- `DatePledge.sol` — escrow contract for date accountability
- `PremiumFeatures.sol` — Boost, Super Like, Swipe Unlock payments

All contracts verified on Alfajores CeloScan.

**Links to attach:**
- PR: contracts repo
- CeloScan links for each contract
- Foundry test results screenshot

---

### Milestone 2 (End of Week 2) — Frontend Core Live

**Title:** MiniPay Mini App Frontend — Core Flows Live

**Description:**
Deployed Next.js mini app to Vercel with MiniPay wallet connection working on Alfajores. Implemented:
- Onboarding & profile creation (IPFS photo upload + ProfileNFT mint)
- Discovery/swipe screen with gesture animations
- Match modal with MatchNFT mint prompt
- Basic chat screen scaffolded

**Links to attach:**
- PR: frontend repo
- Vercel preview link
- Short Loom/video clip of swipe flow

---

### Milestone 3 (End of Week 3) — Gift + Date Pledge Live

**Title:** cUSD Gifting & Date Pledge Escrow Implemented

**Description:**
Core economic mechanics live on testnet:
- Gift modal with 6 tiers + custom amount (0.3–5+ cUSD)
- Animated gift card in chat UI
- Date Pledge proposal, lock, confirm, and ghost-claim flows
- Premium message with tip attachment
- 15+ test transactions on Alfajores

**Links to attach:**
- PR: gift + date pledge components
- Alfajores transaction hashes showing gift flows
- Screenshot of Date Pledge escrow in action

---

### Milestone 4 (End of Week 4) — Mainnet Deployment + Demo

**Title:** Spark Deployed to Celo Mainnet — Demo Ready

**Description:**
Full deployment to Celo Mainnet:
- All 5 contracts deployed and verified on CeloScan
- The Graph subgraph indexed and queryable
- Premium features (Boost, Super Like, Swipe Unlock) live
- Self Protocol verification integrated
- Talent Protocol badge display live
- Demo video recorded (4 min)
- 10+ real users onboarded

**Links to attach:**
- Mainnet contract addresses
- The Graph subgraph URL
- Demo video link
- Real txn hashes from mainnet users

---

## Farcaster Strategy

The AI tracking agents specifically monitor **Farcaster updates**. Post at each milestone:

**Post 1 (Week 1):**
> Just deployed 5 smart contracts for Spark 🔥 — an on-chain dating mini app on @celo
> Match → Mint an NFT together 💍
> Ghost a date → lose your cUSD deposit 👻
> Building for @minipay users in Lagos 🇳🇬
> #ProofOfShip #Celo #MiniPay
> [CeloScan link]

**Post 2 (Week 2):**
> The swipe screen for Spark is live 🎯
> Runs natively in @minipay — no app store needed
> Mutual like → Match NFT minted to both wallets on @Celo
> [Vercel link] [screen recording]
> #ProofOfShip

**Post 3 (Week 3):**
> Spark's Date Pledge is my favorite feature 🔒
> Both users lock 1 cUSD before a date
> Confirm → get it back
> Ghost → the other person gets both deposits
> Dating accountability, on-chain 🌍
> #Celo #ProofOfShip

**Post 4 (Week 4 / Final):**
> Spark is LIVE on @Celo Mainnet 🚀🔥
> ✅ Profile NFT (soulbound identity)
> ✅ Match NFT (co-owned connection artifact)
> ✅ cUSD gifts (0.3 → 5 cUSD via @minipay)
> ✅ Date Pledge escrow
> ✅ Boost / Super Like / Swipe Unlock
> Try it → [link]
> #ProofOfShip #Celo #MiniPay

---

## Final Submission Requirements

Per the Proof-of-Ship GitHub README, your submission must include:

### 1. Short Description (tweet-length)
> Spark is an on-chain dating mini app on Celo where mutual matches mint a shared NFT, users gift cUSD to express interest, and a Date Pledge escrow makes ghosting cost real money.

### 2. Assets
- App logo (512×512 PNG, gradient pink/rose)
- 3–5 app screenshots (swipe screen, match NFT, gift modal, date pledge)
- Contract architecture diagram (from `03_ARCHITECTURE.md`)

### 3. Demo Video (4 min max)
Suggested structure:
- 0:00–0:30 — Problem: dating apps have no stakes, ghosting is free
- 0:30–1:30 — Demo: profile creation → swipe → match → NFT minted
- 1:30–2:30 — Demo: gift flow (coffee gift → animated card in chat)
- 2:30–3:30 — Demo: date pledge → lock → confirm → NFT trait updated
- 3:30–4:00 — Architecture overview + Celo/MiniPay alignment

### 4. Presentation (10 slides max)

| Slide | Content |
|---|---|
| 1 | Title: Spark 🔥 — On-Chain Dating on Celo |
| 2 | Problem: Dating apps are weightless. Ghosting is free. |
| 3 | Solution: Micro-stakes at every meaningful moment |
| 4 | Core Mechanic 1: Match NFT — co-owned artifact of connection |
| 5 | Core Mechanic 2: cUSD gifting via MiniPay (gift tier table) |
| 6 | Core Mechanic 3: Date Pledge escrow — accountability on-chain |
| 7 | Premium features: Boost, Super Like, Swipe Unlock |
| 8 | Architecture: 5 contracts, Next.js MiniApp, The Graph |
| 9 | Traction: txn count, user count, on-chain activity |
| 10 | Why Celo: MiniPay = Africa-first mobile users, sub-cent fees, cUSD stability |

### 5. Milestones (GitHub PR links)
Link to the 4 KarmaGAP milestones above, each with their associated PRs.

### 6. Problem / Competition

**Competitors:**
| App | Gap |
|---|---|
| Tinder / Bumble | No on-chain identity; ghosting costs nothing; no asset ownership |
| Hinge | Same — purely Web2, no wallet |
| Lens Protocol dating apps | Exists but no gifting mechanics, no date pledge, not MiniPay-native |

**Spark's differentiation:** The Date Pledge escrow is genuinely novel — no dating app in Web2 or Web3 has implemented economic accountability for showing up to a date. The Match NFT as a co-owned evolving artifact is also new.

### 7. Architecture Summary
See `03_ARCHITECTURE.md` — paste the contract list and tech stack table.

---

## GitHub Repository Structure

```
spark/
├── packages/
│   ├── contracts/          # Foundry project — 5 Solidity contracts
│   ├── frontend/           # Next.js MiniPay mini app
│   ├── subgraph/           # The Graph subgraph
│   └── backend/            # Bun + Hono match oracle + chat backend
├── docs/
│   ├── 00_README.md
│   ├── 01_FINANCIAL_MODEL.md
│   ├── 02_USER_STORIES.md
│   ├── 03_ARCHITECTURE.md
│   ├── 04_IMPLEMENTATION_GUIDE.md
│   └── 05_PROOF_OF_SHIP_SUBMISSION.md
└── README.md               # Project overview for KarmaGAP + judges
```

---

## Judging Criteria Alignment

| Judging Criterion | Spark's Response |
|---|---|
| **Innovation** | Date Pledge (ghosting has economic cost) + Match NFT (co-owned evolving artifact) — both novel |
| **Technical execution** | 5 contracts, subgraph, MiniPay-native frontend — full-stack |
| **MiniPay fit** | Built exclusively for MiniPay browser; cUSD gifts start at 0.3 cUSD (MiniPay's micro-payment range) |
| **Real-world impact** | Dating is universal; Lagos/Africa market is massive and underserved by Web3 apps |
| **Celo ecosystem value** | Drives cUSD velocity; generates consistent on-chain transaction volume |
| **Presentation quality** | Clear problem/solution, working demo, documented architecture |

---

## Talent Protocol Integration

Create a Talent Protocol profile and link it to earn the **Builder badge** visible on your Spark profile.

1. Visit [talentprotocol.com](https://talentprotocol.com) and create a profile
2. Connect your Celo wallet
3. In Spark, tap "Link Talent Protocol" on your profile screen
4. This calls `ProfileNFT.linkTalentProtocol(profileId)` — one on-chain tx
5. Your Talent Protocol score appears as a badge on your Spark profile card

Also: create a Talent Protocol profile for **Spark as a project** to unlock the Proof-of-Ship score multiplier at [celo.builderscore.xyz](https://celo.builderscore.xyz).

---

## Self Protocol Integration

Self Protocol provides ZK-verified age and personhood proofs on Celo.

1. Visit [docs.self.xyz](https://docs.self.xyz) for the integration SDK
2. Add a "Verify with Self" button on the Spark onboarding screen
3. On successful verification, Self Protocol calls `ProfileNFT.setVerified(userAddress)`
4. The verified badge (✓) appears on the user's discovery card

This is also a **sponsored track** on Celo — Self Protocol by Celo has prize pools at some hackathons. Worth checking if active during your Proof-of-Ship season.
