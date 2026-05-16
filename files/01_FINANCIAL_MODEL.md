# Spark — Financial Model

---

## Overview

Spark generates protocol revenue through **cUSD-denominated premium features** and **platform fees** on escrow flows. All revenue is collected in cUSD (Mento stablecoin) and flows into a protocol treasury wallet on Celo. This model is designed to be sustainable at a small user base — 500 MAU is enough to generate meaningful cUSD volume for the Proof-of-Ship scoring criteria.

---

## Revenue Streams

### 1. Premium Features (Direct cUSD Payments)

Users pay cUSD for optional premium interactions. These are **per-use** payments, not subscriptions, which fits MiniPay's micro-payment philosophy.

| Feature | Price (cUSD) | Notes |
|---|---|---|
| Boost Profile | 0.5 cUSD | 24hr priority visibility in discovery |
| Super Like | 0.3 cUSD | Notifies target user, shows up highlighted |
| Unlock Extra Swipes | 0.2 cUSD | Default: 20 free swipes/day; 20 more per top-up |

**Protocol cut:** 100% of premium feature payments go to protocol treasury. No split — these are direct service purchases.

---

### 2. Gift Platform Fee

When a user sends a cUSD gift to a match, Spark takes a **10% protocol fee** on every gift. The remaining 90% goes directly to the recipient's wallet via MiniPay.

| Gift Tier | Sender Pays | Recipient Gets | Protocol Earns |
|---|---|---|---|
| 👋 Icebreaker | 0.3 cUSD | 0.27 cUSD | 0.03 cUSD |
| ☕ Coffee | 0.5 cUSD | 0.45 cUSD | 0.05 cUSD |
| 🎵 Song dedication | 1.0 cUSD | 0.90 cUSD | 0.10 cUSD |
| 🍫 Chocolate box | 2.0 cUSD | 1.80 cUSD | 0.20 cUSD |
| 🥂 Cocktail night | 3.0 cUSD | 2.70 cUSD | 0.30 cUSD |
| 🌹 Red rose | 5.0 cUSD | 4.50 cUSD | 0.50 cUSD |
| ✏️ Custom | User-set | 90% | 10% |

**Why 10%?** Low enough that users don't feel taxed, high enough to matter at volume. MiniPay's sub-cent Celo fees mean no gas cost erodes this.

---

### 3. Premium Message Fee

Users can attach a cUSD tip to a message for emphasis (think "super message"). Spark takes **15%** of this tip.

| Message Tier | Tip Amount | Protocol Earns |
|---|---|---|
| Highlighted message | 0.5 cUSD | 0.075 cUSD |
| Priority message | 1.0 cUSD | 0.15 cUSD |
| Custom | User-set | 15% |

---

### 4. Date Pledge Protocol Fee

When both users lock cUSD into the Date Pledge escrow, Spark charges a **5% entry fee** on the combined locked amount at the point of locking.

**Example:** Both users lock 1 cUSD each (2 cUSD total). Protocol earns 0.10 cUSD (5% of 2 cUSD) at lock time. Regardless of outcome (confirmed or ghosted), this fee is non-refundable.

| Pledge Size (each) | Total Locked | Protocol Fee | Net in Escrow |
|---|---|---|---|
| 0.5 cUSD | 1.0 cUSD | 0.05 cUSD | 0.95 cUSD |
| 1.0 cUSD | 2.0 cUSD | 0.10 cUSD | 1.90 cUSD |
| 2.0 cUSD | 4.0 cUSD | 0.20 cUSD | 3.80 cUSD |

**Ghost resolution:** If one party ghosts, the non-ghoster receives the full net escrow (1.90 cUSD in the 1 cUSD example). Spark has already taken its 5% at entry.

---

## cUSD Flow Diagram

```
USER
  │
  ├─── Premium Feature Payment (Boost / Super Like / Swipes)
  │         └──── 100% → Protocol Treasury
  │
  ├─── Gift Sent
  │         ├──── 90% → Recipient Wallet (MiniPay transfer)
  │         └──── 10% → Protocol Treasury
  │
  ├─── Premium Message
  │         ├──── 85% → Recipient Wallet
  │         └──── 15% → Protocol Treasury
  │
  └─── Date Pledge Lock
            ├──── 95% → Escrow Contract (claimable on outcome)
            └──── 5%  → Protocol Treasury
```

---

## Revenue Projections

### Assumptions

| Metric | Conservative | Moderate | Optimistic |
|---|---|---|---|
| Monthly Active Users | 200 | 500 | 1,500 |
| Match rate (% of users) | 20% | 30% | 40% |
| Gifts per matched pair/month | 1.5 | 2.5 | 4 |
| Avg gift size (cUSD) | 1.0 | 1.5 | 2.0 |
| Premium purchases per user/month | 0.5 | 1.2 | 2.0 |
| Date pledges per 10 matched pairs | 1 | 2 | 3 |

### Monthly Revenue Estimate (cUSD)

#### Conservative (200 MAU)

| Stream | Calculation | Revenue |
|---|---|---|
| Gifts (fee) | 200 × 20% matches × 1.5 gifts × 1.0 avg × 10% | 6.00 cUSD |
| Premium features | 200 × 0.5 purchases × avg 0.35 cUSD | 35.00 cUSD |
| Date pledges (fee) | 4 pledges × 2 cUSD locked × 5% | 0.40 cUSD |
| Premium messages | 200 × 20% × 0.5 messages × 0.75 avg × 15% | 2.25 cUSD |
| **Total** | | **~44 cUSD/month** |

#### Moderate (500 MAU)

| Stream | Calculation | Revenue |
|---|---|---|
| Gifts (fee) | 500 × 30% × 2.5 × 1.5 × 10% | 56.25 cUSD |
| Premium features | 500 × 1.2 × 0.35 | 210.00 cUSD |
| Date pledges | 15 pledges × 2 cUSD × 5% | 1.50 cUSD |
| Premium messages | 500 × 30% × 1 × 0.75 × 15% | 16.88 cUSD |
| **Total** | | **~285 cUSD/month** |

#### Optimistic (1,500 MAU)

| Stream | Calculation | Revenue |
|---|---|---|
| Gifts (fee) | 1500 × 40% × 4 × 2.0 × 10% | 480.00 cUSD |
| Premium features | 1500 × 2.0 × 0.35 | 1,050.00 cUSD |
| Date pledges | 90 pledges × 2 cUSD × 5% | 9.00 cUSD |
| Premium messages | 1500 × 40% × 1.5 × 0.75 × 15% | 101.25 cUSD |
| **Total** | | **~1,640 cUSD/month** |

---

## Proof-of-Ship Transaction Volume Scoring

The Proof-of-Ship scoring system rewards **transaction count and user count** on-chain. Here's how Spark's model generates both:

| Event | Transactions Generated | Frequency |
|---|---|---|
| Profile NFT mint | 1 per new user | Once |
| Match NFT mint | 1 per mutual match | Per match |
| Gift | 1 per gift sent | Daily potential |
| Date pledge lock | 2 per pledge (one each) | Per date arranged |
| Date pledge confirm | 2 per pledge | Per date completed |
| Boost profile | 1 per purchase | As needed |
| Super like | 1 per use | As needed |
| Unlock swipes | 1 per top-up | Daily potential |
| Self Protocol verify | 1 per user | Once |

**At 200 MAU**, realistic monthly on-chain transactions:
- 40 new profile mints
- ~30 match NFT mints
- ~60 gifts
- ~10 date pledges = 40 txns
- ~80 premium purchases
- **Total: ~210 transactions/month** — strong signal for AI scoring agents

---

## Protocol Treasury Usage

Revenue collected in protocol treasury wallet can be used for:

1. **Liquidity / operational costs** — covering contract deployment, IPFS pinning fees
2. **Community rewards** — distributing a portion back to the most active/gifting users
3. **Future development** — funding additional feature sprints beyond Proof-of-Ship

---

## Notes on MiniPay Economics

- Celo transaction fees are sub-cent — gifting 0.3 cUSD does not get eaten by gas
- cUSD is stable against USD — no volatility risk for users or protocol
- MiniPay users are already comfortable with small cUSD transactions (used for airtime, data, P2P)
- Gift floor of 0.3 cUSD is deliberately set above Celo's dust threshold
