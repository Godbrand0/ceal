# Spark — Implementation Guide

---

## Overview

This guide covers the full build from zero to Proof-of-Ship submission. The timeline assumes a **4-week sprint** with ~4–6hrs/day of focused building.

---

## Prerequisites

```bash
# Tools needed
node >= 18
bun >= 1.0
foundry (forge, cast, anvil)
git

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install Bun
curl -fsSL https://bun.sh/install | bash
```

---

## Week 1 — Smart Contracts

### Day 1–2: Project Setup

```bash
# Init Foundry project
mkdir spark-contracts && cd spark-contracts
forge init

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts
forge install smartcontractkit/chainlink  # optional, for price feeds later

# Project structure
src/
  ProfileNFT.sol
  MatchNFT.sol
  GiftRouter.sol
  DatePledge.sol
  PremiumFeatures.sol
test/
  ProfileNFT.t.sol
  MatchNFT.t.sol
  GiftRouter.t.sol
  DatePledge.t.sol
script/
  Deploy.s.sol
```

**foundry.toml:**
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"

[rpc_endpoints]
celo_mainnet = "https://forno.celo.org"
celo_alfajores = "https://alfajores-forno.celo-testnet.org"

[etherscan]
celo_mainnet = { key = "${CELOSCAN_API_KEY}", url = "https://api.celoscan.io/api" }
```

---

### Day 2–3: ProfileNFT.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ProfileNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    mapping(address => uint256) public profileOf;
    mapping(uint256 => string)  public metadataURI;
    mapping(address => bool)    public isVerified;
    mapping(address => string)  public talentProfile;

    address public selfProtocolVerifier; // authorized to call setVerified

    event ProfileMinted(address indexed user, uint256 tokenId, string ipfsURI);
    event ProfileUpdated(address indexed user, string newURI);
    event ProfileVerified(address indexed user);
    event TalentLinked(address indexed user, string profileId);

    constructor(address _selfVerifier) ERC721("SparkProfile", "SPROF") Ownable(msg.sender) {
        selfProtocolVerifier = _selfVerifier;
    }

    function mint(string calldata ipfsURI) external {
        require(profileOf[msg.sender] == 0, "Profile already exists");
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        profileOf[msg.sender] = tokenId;
        metadataURI[tokenId] = ipfsURI;
        _safeMint(msg.sender, tokenId);
        emit ProfileMinted(msg.sender, tokenId, ipfsURI);
    }

    function updateMetadata(string calldata newURI) external {
        uint256 tokenId = profileOf[msg.sender];
        require(tokenId != 0, "No profile");
        metadataURI[tokenId] = newURI;
        emit ProfileUpdated(msg.sender, newURI);
    }

    function setVerified(address user) external {
        require(msg.sender == selfProtocolVerifier, "Unauthorized");
        isVerified[user] = true;
        emit ProfileVerified(user);
    }

    function linkTalentProtocol(string calldata profileId) external {
        require(profileOf[msg.sender] != 0, "No profile");
        talentProfile[msg.sender] = profileId;
        emit TalentLinked(msg.sender, profileId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return metadataURI[tokenId];
    }

    // Soulbound: non-transferable
    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "Soulbound: non-transferable");
        return super._update(to, tokenId, auth);
    }
}
```

---

### Day 3–4: MatchNFT.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MatchNFT is ERC721, Ownable {
    uint256 private _matchIdCounter;
    uint256 private _tokenIdCounter;

    struct MatchData {
        address user1;
        address user2;
        uint256 matchedAt;
        uint256 giftsExchanged;
        uint256 totalGiftValue;
        bool    dateCompleted;
        bool    burned;
        uint256 user1TokenId;
        uint256 user2TokenId;
    }

    mapping(uint256 => MatchData) public matches;
    mapping(address => uint256[]) public userMatches;
    mapping(bytes32 => uint256)   public pairToMatchId;
    mapping(uint256 => uint256)   public tokenToMatchId;

    address public matchOracle;
    address public giftRouter;
    address public datePledge;

    event Matched(uint256 indexed matchId, address user1, address user2);
    event MatchBurned(uint256 indexed matchId, address burnedBy);
    event DateCompleted(uint256 indexed matchId);
    event GiftRecorded(uint256 indexed matchId, uint256 giftsExchanged, uint256 totalValue);

    modifier onlyOracle() { require(msg.sender == matchOracle, "Not oracle"); _; }
    modifier onlyGiftRouter() { require(msg.sender == giftRouter, "Not gift router"); _; }
    modifier onlyDatePledge() { require(msg.sender == datePledge, "Not date pledge"); _; }

    constructor(address _oracle) ERC721("SparkMatch", "SMATCH") Ownable(msg.sender) {
        matchOracle = _oracle;
    }

    function setRouters(address _giftRouter, address _datePledge) external onlyOwner {
        giftRouter = _giftRouter;
        datePledge = _datePledge;
    }

    function mint(address user1, address user2) external onlyOracle returns (uint256 matchId) {
        bytes32 pairKey = _pairKey(user1, user2);
        require(pairToMatchId[pairKey] == 0, "Already matched");
        require(user1 != user2, "Cannot match self");

        _matchIdCounter++;
        matchId = _matchIdCounter;

        _tokenIdCounter++;
        uint256 token1 = _tokenIdCounter;
        _tokenIdCounter++;
        uint256 token2 = _tokenIdCounter;

        matches[matchId] = MatchData({
            user1: user1, user2: user2,
            matchedAt: block.timestamp,
            giftsExchanged: 0, totalGiftValue: 0,
            dateCompleted: false, burned: false,
            user1TokenId: token1, user2TokenId: token2
        });

        userMatches[user1].push(matchId);
        userMatches[user2].push(matchId);
        pairToMatchId[pairKey] = matchId;
        tokenToMatchId[token1] = matchId;
        tokenToMatchId[token2] = matchId;

        _safeMint(user1, token1);
        _safeMint(user2, token2);

        emit Matched(matchId, user1, user2);
    }

    function recordGift(uint256 matchId, uint256 amount) external onlyGiftRouter {
        matches[matchId].giftsExchanged++;
        matches[matchId].totalGiftValue += amount;
        emit GiftRecorded(matchId, matches[matchId].giftsExchanged, matches[matchId].totalGiftValue);
    }

    function recordDateCompleted(uint256 matchId) external onlyDatePledge {
        matches[matchId].dateCompleted = true;
        emit DateCompleted(matchId);
    }

    function burn(uint256 matchId) external {
        MatchData storage m = matches[matchId];
        require(msg.sender == m.user1 || msg.sender == m.user2, "Not party to match");
        require(!m.burned, "Already burned");
        m.burned = true;
        _burn(m.user1TokenId);
        _burn(m.user2TokenId);
        emit MatchBurned(matchId, msg.sender);
    }

    function getMatch(uint256 matchId) external view returns (MatchData memory) {
        return matches[matchId];
    }

    function getUserMatches(address user) external view returns (uint256[] memory) {
        return userMatches[user];
    }

    function _pairKey(address a, address b) internal pure returns (bytes32) {
        return a < b
            ? keccak256(abi.encodePacked(a, b))
            : keccak256(abi.encodePacked(b, a));
    }
}
```

---

### Day 4–5: GiftRouter.sol + PremiumFeatures.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IMatchNFT {
    function recordGift(uint256 matchId, uint256 amount) external;
    function pairToMatchId(bytes32 pairKey) external view returns (uint256);
}

contract GiftRouter is Ownable {
    uint256 public constant FEE_BPS = 1000; // 10%
    IERC20  public immutable cUSD;
    address public treasury;
    IMatchNFT public matchNFT;

    event GiftSent(
        uint256 indexed matchId, address sender, address recipient,
        uint8 giftType, uint256 amount, uint256 netAmount, string message
    );

    constructor(address _cUSD, address _treasury, address _matchNFT) Ownable(msg.sender) {
        cUSD     = IERC20(_cUSD);
        treasury = _treasury;
        matchNFT = IMatchNFT(_matchNFT);
    }

    function sendGift(
        uint256 matchId,
        address recipient,
        uint256 amount,
        uint8   giftType,
        string calldata message
    ) external {
        require(amount >= 0.3e18, "Minimum gift is 0.3 cUSD");

        uint256 fee    = (amount * FEE_BPS) / 10_000;
        uint256 net    = amount - fee;

        cUSD.transferFrom(msg.sender, treasury, fee);
        cUSD.transferFrom(msg.sender, recipient, net);

        matchNFT.recordGift(matchId, amount);
        emit GiftSent(matchId, msg.sender, recipient, giftType, amount, net, message);
    }
}
```

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PremiumFeatures is Ownable {
    IERC20  public immutable cUSD;
    address public treasury;

    uint256 public boostPrice      = 0.5e18;
    uint256 public superLikePrice  = 0.3e18;
    uint256 public swipeUnlockPrice = 0.2e18;
    uint256 public constant BOOST_DURATION = 24 hours;

    mapping(address => uint256) public boostExpiresAt;

    event ProfileBoosted(address indexed user, uint256 expiresAt);
    event SuperLikeSent(address indexed from, address indexed to);
    event SwipesUnlocked(address indexed user);

    constructor(address _cUSD, address _treasury) Ownable(msg.sender) {
        cUSD     = IERC20(_cUSD);
        treasury = _treasury;
    }

    function boostProfile() external {
        cUSD.transferFrom(msg.sender, treasury, boostPrice);
        boostExpiresAt[msg.sender] = block.timestamp + BOOST_DURATION;
        emit ProfileBoosted(msg.sender, boostExpiresAt[msg.sender]);
    }

    function superLike(address target) external {
        require(target != msg.sender, "Cannot super like yourself");
        cUSD.transferFrom(msg.sender, treasury, superLikePrice);
        emit SuperLikeSent(msg.sender, target);
    }

    function unlockSwipes() external {
        cUSD.transferFrom(msg.sender, treasury, swipeUnlockPrice);
        emit SwipesUnlocked(msg.sender);
    }

    function isBoosted(address user) external view returns (bool) {
        return block.timestamp < boostExpiresAt[user];
    }

    function setPrices(uint256 boost, uint256 superLike_, uint256 swipe) external onlyOwner {
        boostPrice       = boost;
        superLikePrice   = superLike_;
        swipeUnlockPrice = swipe;
    }
}
```

---

### Day 5: Tests

```solidity
// test/GiftRouter.t.sol
pragma solidity ^0.8.24;
import "forge-std/Test.sol";
import "../src/GiftRouter.sol";

contract GiftRouterTest is Test {
    GiftRouter router;
    MockERC20  cusd;
    MockMatchNFT matchNFT;
    address treasury = address(0xFEE);
    address alice    = address(0xA);
    address bob      = address(0xB);

    function setUp() public {
        cusd     = new MockERC20();
        matchNFT = new MockMatchNFT();
        router   = new GiftRouter(address(cusd), treasury, address(matchNFT));
        cusd.mint(alice, 100e18);
        vm.prank(alice);
        cusd.approve(address(router), type(uint256).max);
    }

    function test_SendGift_SplitCorrectly() public {
        vm.prank(alice);
        router.sendGift(1, bob, 1e18, 1, "hi");
        assertEq(cusd.balanceOf(bob),     0.9e18);
        assertEq(cusd.balanceOf(treasury), 0.1e18);
    }

    function test_SendGift_BelowMinimumReverts() public {
        vm.prank(alice);
        vm.expectRevert("Minimum gift is 0.3 cUSD");
        router.sendGift(1, bob, 0.1e18, 1, "hi");
    }
}
```

```bash
# Run tests
forge test -vvv

# Deploy to Alfajores testnet
forge script script/Deploy.s.sol \
  --rpc-url celo_alfajores \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

---

## Week 2 — Frontend Core

### Setup

```bash
# Create Next.js app
bunx create-next-app@latest spark-app --typescript --tailwind --app
cd spark-app

# Install dependencies
bun add wagmi viem @tanstack/react-query
bun add @pinata/sdk
bun add framer-motion
bun add @apollo/client graphql   # for The Graph queries
```

### wagmi Config for Celo

```typescript
// lib/wagmi.ts
import { createConfig, http } from 'wagmi'
import { celo, celoAlfajores } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [celo, celoAlfajores],
  connectors: [injected()],  // MiniPay injects window.ethereum
  transports: {
    [celo.id]: http('https://forno.celo.org'),
    [celoAlfajores.id]: http('https://alfajores-forno.celo-testnet.org'),
  },
})
```

### cUSD Approve + Gift Hook

```typescript
// hooks/useGift.ts
import { useWriteContract, useReadContract } from 'wagmi'
import { parseEther } from 'viem'
import { CUSD_ADDRESS, GIFT_ROUTER_ADDRESS } from '@/lib/contracts'
import { erc20Abi } from 'viem'
import GiftRouterABI from '@/abis/GiftRouter.json'

export function useGift() {
  const { writeContractAsync } = useWriteContract()

  const sendGift = async ({
    matchId, recipient, amountEth, giftType, message
  }: {
    matchId: bigint
    recipient: `0x${string}`
    amountEth: string   // e.g. "1.0"
    giftType: number
    message: string
  }) => {
    const amount = parseEther(amountEth)

    // Step 1: Approve GiftRouter to spend cUSD
    await writeContractAsync({
      address: CUSD_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [GIFT_ROUTER_ADDRESS, amount],
    })

    // Step 2: Send gift
    await writeContractAsync({
      address: GIFT_ROUTER_ADDRESS,
      abi: GiftRouterABI,
      functionName: 'sendGift',
      args: [matchId, recipient, amount, giftType, message],
    })
  }

  return { sendGift }
}
```

### SwipeCard Component (key UX)

```typescript
// components/SwipeCard.tsx
'use client'
import { motion, useMotionValue, useTransform } from 'framer-motion'

interface Profile {
  address: string
  name: string
  age: number
  city: string
  bio: string
  photoUrl: string
  isVerified: boolean
}

export function SwipeCard({
  profile,
  onSwipeLeft,
  onSwipeRight,
}: {
  profile: Profile
  onSwipeLeft: () => void
  onSwipeRight: () => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-25, 25])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0])

  const likeOpacity  = useTransform(x, [0, 100], [0, 1])
  const nopeOpacity  = useTransform(x, [-100, 0], [1, 0])

  function handleDragEnd(_: any, info: any) {
    if (info.offset.x > 100) onSwipeRight()
    else if (info.offset.x < -100) onSwipeLeft()
  }

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute w-full max-w-sm rounded-2xl overflow-hidden shadow-xl bg-white cursor-grab"
    >
      <div className="relative">
        <img src={profile.photoUrl} className="w-full h-96 object-cover" alt={profile.name} />

        {/* LIKE indicator */}
        <motion.div style={{ opacity: likeOpacity }}
          className="absolute top-8 left-8 text-green-500 font-bold text-4xl border-4 border-green-500 px-4 py-1 rounded-lg rotate-[-20deg]">
          LIKE
        </motion.div>

        {/* NOPE indicator */}
        <motion.div style={{ opacity: nopeOpacity }}
          className="absolute top-8 right-8 text-red-500 font-bold text-4xl border-4 border-red-500 px-4 py-1 rounded-lg rotate-[20deg]">
          NOPE
        </motion.div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">{profile.name}, {profile.age}</h2>
          {profile.isVerified && <span className="text-blue-500">✓</span>}
        </div>
        <p className="text-gray-500 text-sm">{profile.city}</p>
        <p className="text-gray-700 mt-2 text-sm">{profile.bio}</p>
      </div>
    </motion.div>
  )
}
```

---

## Week 3 — Match Flow + Chat + Gifting UI

### Key screens to build this week:
- Match celebration modal with NFT mint CTA
- Chat interface (messages stored off-chain, gifts shown as animated cards)
- Gift modal with tier selection
- Date Pledge proposal + lock flow

### Gift Card Animation (in chat)

```typescript
// components/GiftCard.tsx
const GIFT_EMOJIS: Record<number, string> = {
  0: '👋', 1: '☕', 2: '🎵', 3: '🍫', 4: '🥂', 5: '🌹', 6: '✏️'
}

const GIFT_LABELS: Record<number, string> = {
  0: 'Icebreaker', 1: 'Coffee', 2: 'Song', 3: 'Chocolate', 4: 'Cocktail', 5: 'Red Rose', 6: 'Custom Gift'
}

export function GiftCard({ giftType, amount, message, isReceived }: GiftCardProps) {
  const [opened, setOpened] = useState(!isReceived)

  if (!opened) {
    return (
      <motion.div
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpened(true)}
        className="bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl p-4 cursor-pointer text-white text-center w-48"
      >
        <div className="text-4xl mb-2">🎁</div>
        <div className="text-sm font-medium">Tap to open</div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-gradient-to-br from-pink-50 to-rose-100 border border-rose-200 rounded-2xl p-4 w-48"
    >
      <div className="text-4xl text-center mb-2">{GIFT_EMOJIS[giftType]}</div>
      <div className="text-center font-semibold text-rose-700">{GIFT_LABELS[giftType]}</div>
      <div className="text-center text-rose-500 text-sm">{amount} cUSD</div>
      {message && <p className="text-gray-600 text-xs text-center mt-2 italic">"{message}"</p>}
    </motion.div>
  )
}
```

---

## Week 4 — Premium Features, Polish & Submission

### Checklist for Week 4

- [ ] Boost profile flow (pay → profile gets ⚡ badge in discovery)
- [ ] Super Like flow (pay → target gets notification)
- [ ] Swipe unlock flow (pay → session counter resets)
- [ ] Match NFT viewer page (show traits: gifts sent, date completed badge)
- [ ] Self Protocol integration (link to verification flow)
- [ ] Talent Protocol badge display
- [ ] Deploy all contracts to Celo Mainnet
- [ ] Deploy subgraph to The Graph (Celo)
- [ ] Deploy frontend to Vercel
- [ ] Record demo video (4 min max)
- [ ] Create KarmaGAP milestones
- [ ] Write 3 Farcaster posts with progress updates

### Deployment Script

```solidity
// script/Deploy.s.sol
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
import "../src/ProfileNFT.sol";
import "../src/MatchNFT.sol";
import "../src/GiftRouter.sol";
import "../src/DatePledge.sol";
import "../src/PremiumFeatures.sol";

contract Deploy is Script {
    address constant CUSD_MAINNET = 0x765DE816845861e75A25fCA122bb6898B8B1282a;

    function run() external {
        uint256 pk       = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address oracle   = vm.envAddress("ORACLE_ADDRESS");
        address selfVerifier = vm.envAddress("SELF_VERIFIER_ADDRESS");

        vm.startBroadcast(pk);

        ProfileNFT     profileNFT     = new ProfileNFT(selfVerifier);
        MatchNFT       matchNFT       = new MatchNFT(oracle);
        GiftRouter     giftRouter     = new GiftRouter(CUSD_MAINNET, treasury, address(matchNFT));
        DatePledge     datePledge     = new DatePledge(CUSD_MAINNET, treasury, address(matchNFT));
        PremiumFeatures premiumFeatures = new PremiumFeatures(CUSD_MAINNET, treasury);

        matchNFT.setRouters(address(giftRouter), address(datePledge));

        console.log("ProfileNFT:     ", address(profileNFT));
        console.log("MatchNFT:       ", address(matchNFT));
        console.log("GiftRouter:     ", address(giftRouter));
        console.log("DatePledge:     ", address(datePledge));
        console.log("PremiumFeatures:", address(premiumFeatures));

        vm.stopBroadcast();
    }
}
```

```bash
# Deploy to mainnet
forge script script/Deploy.s.sol \
  --rpc-url https://forno.celo.org \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $CELOSCAN_API_KEY
```

---

## MiniPay-Specific Notes

### Testing in MiniPay
MiniPay only runs in the Opera Mini browser. For development:
1. Use **Alfajores testnet** for local testing
2. Use [MiniPay testnet faucet](https://faucet.celo.org/alfajores) to get test cUSD
3. Test on a real Android device with Opera Mini for final UX check

### cUSD Approval Pattern for MiniPay
MiniPay users expect **two prompts** for any payment: approve + transfer. Make this clear in the UI:

```typescript
// Show user what's happening
<div>
  <p>Step 1 of 2: Approve cUSD spending</p>
  <p>Step 2 of 2: Send gift</p>
</div>
```

### Mini App Manifest
Add to `public/manifest.json`:
```json
{
  "name": "Spark",
  "short_name": "Spark",
  "description": "On-chain dating on Celo",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FF385C",
  "theme_color": "#FF385C",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Environment Variables

```bash
# .env.local (frontend)
NEXT_PUBLIC_PROFILE_NFT_ADDRESS=0x...
NEXT_PUBLIC_MATCH_NFT_ADDRESS=0x...
NEXT_PUBLIC_GIFT_ROUTER_ADDRESS=0x...
NEXT_PUBLIC_DATE_PLEDGE_ADDRESS=0x...
NEXT_PUBLIC_PREMIUM_ADDRESS=0x...
NEXT_PUBLIC_CUSD_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a
NEXT_PUBLIC_GRAPH_URL=https://api.studio.thegraph.com/query/.../spark/v0.0.1
PINATA_JWT=...
NEXT_PUBLIC_CHAIN_ID=42220  # Celo Mainnet

# .env (contracts/scripts)
PRIVATE_KEY=0x...
TREASURY_ADDRESS=0x...
ORACLE_ADDRESS=0x...
SELF_VERIFIER_ADDRESS=0x...
CELOSCAN_API_KEY=...
```
