# Spark — Architecture

---

## System Overview

Spark is composed of four layers:

```
┌─────────────────────────────────────────────────┐
│              MiniPay Mini App (Frontend)         │
│         Next.js + wagmi + viem + MiniPay SDK     │
└───────────────────────┬─────────────────────────┘
                        │ RPC / wallet calls
┌───────────────────────▼─────────────────────────┐
│              Smart Contract Layer                │
│    ProfileNFT | MatchNFT | DatePledge |          │
│    GiftRouter | PremiumFeatures                  │
│              (Celo Mainnet)                      │
└───────────────────────┬─────────────────────────┘
                        │ events / reads
┌───────────────────────▼─────────────────────────┐
│              Indexing Layer                      │
│         The Graph — Celo Subgraph                │
│   (profile queries, match history, leaderboard)  │
└───────────────────────┬─────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│              Off-chain Storage                   │
│   IPFS (Pinata) — profile photos, metadata       │
│   Lightweight backend — swipe events, chat msgs  │
└─────────────────────────────────────────────────┘
```

---

## Smart Contracts

### 1. `ProfileNFT.sol`

**Purpose:** Mints a wallet-bound NFT on profile creation. Stores an IPFS hash pointing to the user's profile metadata. One profile per address.

```solidity
// Key state
mapping(address => uint256) public profileOf;        // address → tokenId
mapping(uint256 => string)  public metadataURI;      // tokenId → IPFS URI
mapping(address => bool)    public isVerified;        // Self Protocol verified
mapping(address => string)  public talentProfile;     // Talent Protocol link

// Key functions
function mint(string calldata ipfsURI) external;
function updateMetadata(string calldata newURI) external;
function setVerified(address user, bytes calldata zkProof) external; // called by Self Protocol verifier
function linkTalentProtocol(string calldata profileId) external;
function burn() external; // profile deletion
```

**Events:**
```solidity
event ProfileMinted(address indexed user, uint256 tokenId, string ipfsURI);
event ProfileUpdated(address indexed user, string newURI);
event ProfileVerified(address indexed user);
```

**Notes:**
- Non-transferable (soulbound): `_beforeTokenTransfer` reverts if `from != address(0)` and `to != address(0)`
- One token per address enforced in `mint()`
- IPFS URI points to JSON: `{ name, bio, age, city, photos: [], preferences: {} }`

---

### 2. `MatchNFT.sol`

**Purpose:** Mints a shared NFT to both matched wallets when a mutual like is confirmed. Each pair gets the same token ID minted twice (one copy per user). Stores evolving relationship traits.

```solidity
// Key state
struct MatchData {
    address user1;
    address user2;
    uint256 matchedAt;
    uint256 giftsExchanged;
    uint256 totalGiftValue;   // in cUSD wei
    bool    dateCompleted;
    bool    burned;
}

mapping(uint256 => MatchData) public matches;          // matchId → data
mapping(address => uint256[]) public userMatches;      // address → matchIds
mapping(bytes32 => uint256)   public pairToMatch;      // keccak(addr1, addr2) → matchId

// Key functions
function mint(address user1, address user2) external returns (uint256 matchId);
function recordGift(uint256 matchId, uint256 amount) external;        // called by GiftRouter
function recordDateCompleted(uint256 matchId) external;               // called by DatePledge
function burn(uint256 matchId) external;                              // unmatch — burns both copies
```

**Events:**
```solidity
event Matched(uint256 indexed matchId, address user1, address user2, uint256 timestamp);
event MatchBurned(uint256 indexed matchId, address burnedBy);
event DateCompleted(uint256 indexed matchId);
```

**Notes:**
- `mint()` is callable only by an authorized `MatchOracle` address (backend service that confirms mutual likes off-chain before triggering on-chain mint). This prevents spam mints.
- `burn()` callable by either party — burns both copies atomically
- `pairToMatch` uses `keccak256(abi.encodePacked(min(a,b), max(a,b)))` to prevent duplicate pair mints

---

### 3. `DatePledge.sol`

**Purpose:** Escrow contract for the Date Pledge mechanic. Holds cUSD from both parties, distributes based on confirmation or ghost outcome.

```solidity
// Key state
enum PledgeStatus { PROPOSED, LOCKED_PARTIAL, LOCKED_FULL, CONFIRMED_PARTIAL, CONFIRMED_FULL, COMPLETED, GHOSTED, CANCELLED }

struct Pledge {
    uint256  matchId;
    address  proposer;
    address  acceptor;
    uint256  amountEach;      // cUSD amount each party locks
    uint256  proposerLocked;
    uint256  acceptorLocked;
    bool     proposerConfirmed;
    bool     acceptorConfirmed;
    uint256  scheduledAt;     // unix timestamp of planned date
    uint256  lockDeadline;    // proposer must lock within 24hrs of acceptance
    PledgeStatus status;
}

mapping(uint256 => Pledge) public pledges;
uint256 public pledgeCount;
uint256 public constant PROTOCOL_FEE_BPS = 500; // 5%
uint256 public constant GHOST_WINDOW = 48 hours;

IERC20 public immutable cUSD;
address public treasury;

// Key functions
function propose(uint256 matchId, uint256 amountEach, uint256 scheduledAt) external returns (uint256 pledgeId);
function accept(uint256 pledgeId) external;
function lock(uint256 pledgeId) external;           // each party calls separately
function confirm(uint256 pledgeId) external;        // each party calls after date
function claimGhost(uint256 pledgeId) external;     // non-ghoster calls after GHOST_WINDOW
function reschedule(uint256 pledgeId, uint256 newScheduledAt) external; // mutual rescheduling
function cancel(uint256 pledgeId) external;         // pre-date cancel, returns funds minus fee
```

**cUSD Flow in DatePledge:**

```
lock() called by each party:
  └── cUSD.transferFrom(msg.sender, address(this), amountEach)
  └── protocolFee = amountEach * 5% → transferred to treasury immediately
  └── netAmount = amountEach * 95% → stays in escrow

confirm() called by both:
  └── When both confirmed:
        └── each party receives their netAmount back
        └── MatchNFT.recordDateCompleted(matchId) called

claimGhost() called by non-ghoster after GHOST_WINDOW:
  └── Full net escrow (both parties' netAmount) → to claimant
```

**Events:**
```solidity
event PledgeProposed(uint256 indexed pledgeId, uint256 indexed matchId, address proposer, uint256 amount);
event PledgeLocked(uint256 indexed pledgeId, address locker);
event PledgeFullyLocked(uint256 indexed pledgeId);
event DateConfirmed(uint256 indexed pledgeId, address confirmer);
event PledgeCompleted(uint256 indexed pledgeId);
event GhostClaimed(uint256 indexed pledgeId, address claimant, uint256 amount);
```

---

### 4. `GiftRouter.sol`

**Purpose:** Routes cUSD gifts between matched users, takes protocol fee, records gift on MatchNFT.

```solidity
uint256 public constant GIFT_FEE_BPS = 1000; // 10%

IERC20  public immutable cUSD;
address public treasury;
IMatchNFT public matchNFT;

// Key functions
function sendGift(
    uint256 matchId,
    address recipient,
    uint256 amount,
    uint8   giftType,    // 0=icebreaker,1=coffee,2=song,3=chocolate,4=cocktail,5=rose,6=custom
    string  calldata message
) external;
```

**Flow in sendGift:**
```
cUSD.transferFrom(sender, address(this), amount)
fee = amount * 10%  → cUSD.transfer(treasury, fee)
net = amount * 90%  → cUSD.transfer(recipient, net)
matchNFT.recordGift(matchId, amount)
emit GiftSent(matchId, sender, recipient, giftType, amount, message)
```

**Events:**
```solidity
event GiftSent(uint256 indexed matchId, address sender, address recipient, uint8 giftType, uint256 amount, string message);
```

---

### 5. `PremiumFeatures.sol`

**Purpose:** Handles Boost, Super Like, and Swipe Unlock payments. All go to protocol treasury.

```solidity
uint256 public BOOST_PRICE    = 0.5e18;   // 0.5 cUSD (18 decimals)
uint256 public SUPER_LIKE_PRICE = 0.3e18; // 0.3 cUSD
uint256 public SWIPE_UNLOCK_PRICE = 0.2e18; // 0.2 cUSD

IERC20  public immutable cUSD;
address public treasury;

// Key functions
function boostProfile() external;                          // 24hr boost
function superLike(address target) external;               // sends notification
function unlockSwipes() external;                          // +20 swipes for session

// Admin
function setPrice(uint8 feature, uint256 newPrice) external onlyOwner;
```

**Events:**
```solidity
event ProfileBoosted(address indexed user, uint256 expiresAt);
event SuperLikeSent(address indexed from, address indexed to);
event SwipesUnlocked(address indexed user, uint256 amount);
```

---

## Contract Deployment Order

```
1. ProfileNFT.sol
2. MatchNFT.sol  (constructor takes: matchOracleAddress)
3. GiftRouter.sol  (constructor takes: cUSD address, treasury, MatchNFT address)
4. DatePledge.sol  (constructor takes: cUSD address, treasury, MatchNFT address)
5. PremiumFeatures.sol  (constructor takes: cUSD address, treasury)
```

**Celo Mainnet cUSD address:** `0x765DE816845861e75A25fCA122bb6898B8B1282a`

---

## Frontend Architecture

### Tech Stack

| Tool | Purpose |
|---|---|
| Next.js 14 (App Router) | Framework |
| wagmi v2 | Wallet / contract hooks |
| viem | Low-level Ethereum interactions |
| MiniPay Mini App SDK | MiniPay-specific utilities |
| Tailwind CSS | Styling |
| Framer Motion | Swipe animations, gift card animations |
| IPFS (via Pinata SDK) | Photo/metadata upload |
| The Graph client | Profile/match data queries |

### MiniPay Detection

```typescript
// lib/minipay.ts
export const isMiniPay = (): boolean => {
  if (typeof window === 'undefined') return false
  return !!(window.ethereum as any)?.isMiniPay
}

export const getMiniPayProvider = () => {
  if (!isMiniPay()) throw new Error('Not in MiniPay environment')
  return window.ethereum
}
```

### Folder Structure

```
spark/
├── app/
│   ├── page.tsx                  # Entry: redirect to /discover or /onboarding
│   ├── onboarding/
│   │   └── page.tsx              # Profile creation flow
│   ├── discover/
│   │   └── page.tsx              # Swipe cards
│   ├── matches/
│   │   ├── page.tsx              # Matches list
│   │   └── [matchId]/
│   │       └── page.tsx          # Individual chat + gift + date pledge
│   ├── profile/
│   │   └── page.tsx              # Own profile + NFTs
│   └── nft/
│       └── [matchId]/
│           └── page.tsx          # Match NFT viewer
│
├── components/
│   ├── SwipeCard.tsx             # Profile card with swipe gesture
│   ├── MatchModal.tsx            # Match celebration + NFT mint prompt
│   ├── GiftModal.tsx             # Gift tier selector
│   ├── GiftCard.tsx              # Animated gift card in chat
│   ├── DatePledgeModal.tsx       # Date proposal + lock flow
│   ├── PremiumModal.tsx          # Boost / Super Like / Swipes
│   └── MatchNFTCard.tsx          # NFT display with traits
│
├── hooks/
│   ├── useProfile.ts             # Profile NFT read/write
│   ├── useMatches.ts             # Match NFT + match list
│   ├── useGift.ts                # Gift sending
│   ├── useDatePledge.ts          # Pledge flows
│   └── usePremium.ts             # Boost, super like, swipes
│
├── lib/
│   ├── contracts.ts              # Contract addresses + ABIs
│   ├── ipfs.ts                   # Pinata upload helpers
│   ├── graph.ts                  # Subgraph queries
│   └── minipay.ts                # MiniPay helpers
│
└── abis/
    ├── ProfileNFT.json
    ├── MatchNFT.json
    ├── GiftRouter.json
    ├── DatePledge.json
    └── PremiumFeatures.json
```

---

## Indexing Layer (The Graph)

### Subgraph Entities

```graphql
type Profile @entity {
  id: Bytes!           # address
  tokenId: BigInt!
  ipfsURI: String!
  isVerified: Boolean!
  talentProfileId: String
  matchCount: Int!
  createdAt: BigInt!
}

type Match @entity {
  id: BigInt!          # matchId
  user1: Profile!
  user2: Profile!
  matchedAt: BigInt!
  giftsExchanged: Int!
  totalGiftValue: BigInt!
  dateCompleted: Boolean!
  burned: Boolean!
}

type Gift @entity {
  id: String!          # txHash-logIndex
  matchId: BigInt!
  sender: Bytes!
  recipient: Bytes!
  giftType: Int!
  amount: BigInt!
  message: String!
  timestamp: BigInt!
}

type DatePledge @entity {
  id: BigInt!
  matchId: BigInt!
  status: String!
  amountEach: BigInt!
  scheduledAt: BigInt!
  completedAt: BigInt
}
```

### Key Queries

```graphql
# Get profiles for discovery (exclude already-swiped, apply filters)
query DiscoverProfiles($excludeAddresses: [Bytes!], $city: String) {
  profiles(
    where: { id_not_in: $excludeAddresses }
    orderBy: createdAt
    orderDirection: desc
    first: 20
  ) {
    id
    ipfsURI
    isVerified
    matchCount
  }
}

# Get all matches for a user
query UserMatches($address: Bytes!) {
  matches(where: { user1: $address }) { id giftsExchanged dateCompleted }
  matchesAsUser2: matches(where: { user2: $address }) { id giftsExchanged dateCompleted }
}
```

---

## Off-Chain Backend (Minimal)

A lightweight Node.js/Bun backend handles things that don't belong on-chain:

| Responsibility | Why Off-Chain |
|---|---|
| Swipe events (like/pass) | Too high frequency for on-chain; only mutual match triggers tx |
| Chat messages | Privacy; messages should not be public on-chain by default |
| Match oracle | Detects mutual likes and calls `MatchNFT.mint()` via operator wallet |
| Push notifications | When Super Like received, date proposed, gift received |
| Discovery feed ranking | Boost status read from contract, applied to feed ranking |

**Match Oracle Logic:**
```
When user A likes user B:
  → Store (A liked B) in DB
  → Check if (B liked A) exists
  → If mutual: call MatchNFT.mint(A, B) from operator wallet
  → Emit websocket event to both clients: "You matched!"
```

**Stack:** Bun + Hono, PostgreSQL (Supabase), WebSockets for real-time chat

---

## Security Considerations

| Risk | Mitigation |
|---|---|
| Fake match mints | MatchNFT.mint() restricted to authorized oracle address |
| Gift to non-match | GiftRouter checks MatchNFT.pairToMatch before routing |
| Date pledge replay | pledgeId is unique; status machine prevents double-locking |
| Profile impersonation | One profile per address; Self Protocol verification optional trust signal |
| cUSD approval phishing | Frontend only requests exact `approve()` amount needed, never `MAX_UINT` |
| Ghost claim before window | `claimGhost()` enforces `block.timestamp > scheduledAt + GHOST_WINDOW` |
