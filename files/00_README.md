# Spark 🔥 — On-Chain Dating Mini App on Celo

> *Where every match is minted, every date has stakes, and every gift means something.*

---

## What is Spark?

Spark is a **mobile-first dating mini app** built on MiniPay (Celo) that uses blockchain primitives to add real meaning to digital connection. Unlike Web2 dating apps where matching is weightless and ghosting is free, Spark creates **on-chain artifacts of connection** — making every match, gift, and date a verifiable, meaningful moment.

Built for the **Celo Proof-of-Ship** program, Spark targets the **MiniApps** and **DeFi & Stablecoin Payments** tracks simultaneously.

---

## The Problem

Modern dating apps are cheap — not in cost, but in stakes. Swiping is effortless, matching means nothing, and ghosting after a planned date costs the ghoster zero. The result: low-quality interactions, wasted time, and eroded trust. For users in emerging markets like Nigeria, this is compounded by limited access to premium features that are priced in USD.

---

## The Solution

Spark uses Celo's mobile-first stack to introduce **micro-stakes** at key moments of connection:

| Moment | Spark's Solution |
|---|---|
| Profile creation | Profile NFT minted to wallet — identity is real |
| Mutual match | Match NFT minted to both wallets — connection is recorded |
| Gifting | cUSD gifts via MiniPay (0.3–5 cUSD range) — interest is expressed with value |
| Planning a date | Date Pledge escrow — both parties commit cUSD; ghosting has a cost |
| Premium features | Boost, Super Like, extra swipes paid in cUSD — protocol earns revenue |

---

## Key Differentiators

- **Match NFT** — A co-owned on-chain artifact shared between two matched users. Evolves with relationship traits (gifts sent, date completed, streak).
- **Date Pledge** — Both users lock cUSD before a date. Confirm → get it back. Ghost → lose it to the other party.
- **MiniPay-native gifting** — Expressive gift tiers from 0.3 to 5 cUSD with a custom input option.
- **Self Protocol integration** — On-chain age and personhood verification for trust.
- **Talent Protocol badges** — Builder identity layer for Celo ecosystem users.

---

## Tech Stack (Summary)

| Layer | Technology |
|---|---|
| Blockchain | Celo Mainnet |
| Smart Contracts | Solidity (via Foundry) |
| Frontend | Next.js + MiniPay Mini App SDK |
| Wallet | MiniPay (injected `window.ethereum`) |
| Payments | cUSD (Mento stablecoin) |
| Profile Storage | IPFS (via Pinata/NFT.Storage) |
| Identity | Self Protocol, Talent Protocol |
| Indexing | The Graph (subgraph on Celo) |

---

## Documentation Index

| File | Description |
|---|---|
| `01_FINANCIAL_MODEL.md` | Revenue streams, fee structure, cUSD flows, projections |
| `02_USER_STORIES.md` | User personas, full journey flows, edge cases |
| `03_ARCHITECTURE.md` | Smart contracts, frontend, backend, data flows |
| `04_IMPLEMENTATION_GUIDE.md` | Week-by-week build plan, contract stubs, MiniPay setup |
| `05_PROOF_OF_SHIP_SUBMISSION.md` | KarmaGAP milestones, judging criteria alignment, pitch notes |

---

## Proof-of-Ship Tracks Targeted

- ✅ **MiniApps** — Built entirely as a MiniPay mini app; mobile-first UX
- ✅ **DeFi & Stablecoin Payments** — cUSD flows throughout (gifts, pledges, premium)
- ✅ **AI Powered** (bonus) — Potential for on-chain compatibility scoring agent

---

## Contact / Builder

Built by **Godbrand** — Full-stack blockchain developer, Lagos 🇳🇬  
Celo Proof-of-Ship Season · 2025
