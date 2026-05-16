# Spark — User Stories & Flow

---

## User Personas

### Persona 1: Amara (New User, Lagos)
- 24 years old, uses Opera Mini with MiniPay for airtime and data payments
- Has cUSD in her MiniPay wallet from a P2P transfer
- Curious about meeting people but skeptical of fake profiles
- Discovered Spark through a Farcaster post

### Persona 2: Dayo (Power User, Lagos)
- 28 years old, Celo ecosystem developer
- Has a Talent Protocol profile and has done Self Protocol verification before
- Wants to meet people with shared interests
- Willing to pay small cUSD amounts for premium features if the quality is there

### Persona 3: Funke (Matched User, Abuja)
- 26 years old, teacher
- Was gifted a "Coffee" by a match — found it sweet, not transactional
- Wants to arrange an in-person date but unsure the other person is serious

---

## Core User Flows

---

### Flow 1: Onboarding & Profile Creation

```
Open Spark in MiniPay browser
        │
        ▼
App detects window.ethereum (MiniPay injected)
        │
        ▼
"Connect Wallet" button → MiniPay prompts approval
        │
        ▼
New user? → Profile Setup Screen
  ├── Upload photo(s) → stored on IPFS, hash returned
  ├── Enter name, age, bio
  ├── Select gender + preference
  ├── Add location (city-level, not GPS)
  └── Optional: Link Talent Protocol profile
        │
        ▼
"Create Profile" → Signs transaction
  └── ProfileNFT.mint(ipfsHash, metadataHash) called
  └── Wallet receives Profile NFT (token ID = address-based)
        │
        ▼
Optional: Verify with Self Protocol
  └── Opens Self Protocol verification flow
  └── Age + personhood ZK proof submitted on-chain
  └── Verified badge added to Profile NFT metadata
        │
        ▼
Home / Discovery screen
```

**User Story:**
> As a new user, I want to create a profile that is tied to my wallet so that my identity is real and verifiable without exposing personal data.

---

### Flow 2: Discovery & Swiping

```
Discovery Screen loads
  └── Fetches profiles from indexer (The Graph subgraph)
  └── Applies filters: gender preference, city, verified-only toggle
        │
        ▼
User sees profile card:
  ├── Photo(s)
  ├── Name, age, city
  ├── Bio
  ├── Verified badge (if Self Protocol verified)
  ├── Talent Protocol badge (if linked)
  └── Number of matches (social proof)
        │
        ▼
User swipes:
  ├── LEFT (Pass) → off-chain, no transaction, next card
  ├── RIGHT (Like) → off-chain stored in app DB, check for mutual
  └── SUPER LIKE → Signs transaction (0.3 cUSD to protocol)
              └── Target user gets push notification: "Someone super liked you ⭐"
        │
        ▼
If mutual like detected (both swiped right on each other):
  └── → Flow 3: Match
```

**User Story:**
> As a user browsing profiles, I want swiping to be free and fast, but I want the option to signal serious interest with a Super Like that costs a small amount so the recipient knows it's genuine.

**Free tier limits:**
- 20 swipes/day for free
- Super likes: unlimited (each costs 0.3 cUSD)
- Unlock extra 20 swipes: 0.2 cUSD per top-up

---

### Flow 3: Match & Match NFT Mint

```
Mutual like detected (off-chain logic)
        │
        ▼
Match screen appears (confetti animation 🎉)
"You matched with [Name]!"
        │
        ▼
"Mint your Match NFT" button
  └── Signs transaction: MatchNFT.mint(user1, user2, timestamp)
  └── Both wallets receive identical Match NFT
  └── NFT metadata:
        ├── matchedAt: timestamp
        ├── giftsExchanged: 0
        ├── dateCompleted: false
        └── compatibilityScore: (future trait)
        │
        ▼
Match NFT minted → Opens chat with match
```

**User Story:**
> As a user who just matched, I want a shared NFT minted to both our wallets so that this connection is recorded on-chain and feels like something real, not just a number on a screen.

**Edge case:** If either user declines to mint (closes screen), the match is still recorded off-chain and they can mint later from the chat screen. The NFT mint is encouraged but not mandatory to access chat.

---

### Flow 4: Gifting in Chat

```
Inside chat with a match
        │
        ▼
User taps 🎁 Gift button
        │
        ▼
Gift selection modal:
  ├── 👋 Icebreaker — 0.3 cUSD
  ├── ☕ Buy me a coffee — 0.5 cUSD
  ├── 🎵 Song dedication — 1.0 cUSD
  ├── 🍫 Chocolate box — 2.0 cUSD
  ├── 🥂 Cocktail night — 3.0 cUSD
  ├── 🌹 Red rose — 5.0 cUSD
  └── ✏️ Custom amount (min 0.3 cUSD)
        │
        ▼
User selects tier (e.g. ☕ Coffee)
  └── Preview: "Send 0.5 cUSD — recipient gets 0.45 cUSD"
  └── Optional: Add a message with the gift
        │
        ▼
"Send Gift" → MiniPay payment prompt
  └── GiftContract.sendGift(recipient, amount, giftType, message)
  └── 90% transferred to recipient wallet
  └── 10% to protocol treasury
        │
        ▼
Gift card appears in chat:
  └── Animated gift card UI (e.g. coffee cup animation ☕)
  └── Recipient sees "Tap to open" card
  └── On open: shows sender's message + amount received
        │
        ▼
Match NFT metadata updated:
  └── giftsExchanged += 1
  └── totalGiftValue += amount
```

**User Story:**
> As a user chatting with a match, I want to send a small gift that feels expressive and personal — not like a bank transfer — so the other person knows I'm genuinely interested.

---

### Flow 5: Premium Message

```
Inside chat
        │
        ▼
User types a message
  └── Taps 💬+ "Make it premium" toggle
        │
        ▼
Select tip amount:
  ├── Highlighted message — 0.5 cUSD
  └── Priority message — 1.0 cUSD (or custom)
        │
        ▼
Signs transaction
  └── 85% to recipient, 15% to protocol
        │
        ▼
Message appears in chat with gold border / highlight
  └── Recipient sees a "Premium message" badge
  └── Guaranteed to appear at top of unread if recipient has many chats
```

**User Story:**
> As a user who wants to stand out in a match's inbox, I want to attach a small tip to a message so it gets priority visibility and signals that I'm serious.

---

### Flow 6: Date Pledge

```
Inside chat
        │
        ▼
One user taps 📅 "Propose a Date"
  └── Fills form:
        ├── Date title ("Coffee at Terra Kulture")
        ├── Proposed date/time
        └── Pledge amount (default: 1 cUSD each, editable)
        │
        ▼
Proposal sent to match in chat
  └── Match sees: "Dayo proposed a date 📅 — lock 1 cUSD each to confirm"
        │
        ▼
Match accepts → Both users independently sign:
  └── DatePledge.lock(matchId, amount) — each signs their own tx
  └── 5% protocol fee deducted at lock time
  └── Remaining 95% held in escrow contract
        │
        ▼
Date status: LOCKED 🔒
  └── Both users see countdown to date
        │
        ▼
After the date — either user taps "Confirm Date Happened"
  └── DatePledge.confirm(pledgeId)
  └── When BOTH confirm:
        ├── Each user gets their pledge back (net of entry fee)
        ├── Match NFT updated: dateCompleted = true
        └── "Date Completed 🎉" badge added to NFT
        │
        ▼
If one user does NOT confirm within 48hrs after date:
  └── Other user can trigger DatePledge.claimGhost(pledgeId)
  └── Full net escrow goes to the non-ghoster
  └── "Ghosted 👻" event emitted on-chain (not public — private to match)
```

**User Story:**
> As a user who wants to meet my match in person, I want both of us to lock a small cUSD amount so that if they ghost me I'm compensated, and if we both show up we both get our cUSD back — making the date feel real and accountable.

**Edge cases:**
- If the date is rescheduled before it happens, either party can call `reschedule()` which resets the confirmation window without unlocking.
- If both parties want to cancel before the date: mutual `cancel()` returns pledges minus protocol fee (fee is non-refundable).
- Dispute window: 48 hours after scheduled date time before ghost claim is available.

---

### Flow 7: Premium Features (Boost & Swipe Unlock)

```
Profile screen or Discovery screen
        │
        ▼
User taps ⚡ "Boost my profile"
  └── Signs 0.5 cUSD payment to protocol
  └── Profile pushed to top of discovery for 24hrs
  └── Boost indicator (⚡) shown on their card to other users
  └── Boost timer visible on own profile screen
        │
        ▼
User runs out of swipes (hits 20/day limit)
  └── "You've used all your free swipes today"
  └── "Unlock 20 more for 0.2 cUSD?"
  └── Signs tx → swipe counter reset for session
```

---

### Flow 8: Unmatch / Burn NFT

```
From chat or Match NFT screen
        │
        ▼
User taps "Unmatch"
  └── Warning: "This will burn your Match NFT and remove the chat. This cannot be undone."
        │
        ▼
User confirms
  └── Signs transaction: MatchNFT.burn(tokenId)
  └── Both copies of the Match NFT are burned
  └── Chat archived (not deleted — user retains their messages locally)
  └── User blocked from re-matching with that profile
```

**User Story:**
> As a user who wants to end a match, I want the unmatch to burn our shared NFT so the connection is formally closed on-chain and not just hidden in a UI.

---

## Full User Journey Map

```
Download / Open Spark in MiniPay
          │
    Connect Wallet
          │
    Create Profile ──── (optional) Verify with Self Protocol
          │                              │
    Talent Protocol link         Verified badge on NFT
          │
    Discovery / Swiping
     │            │
   Pass         Like / Super Like
                  │
            Mutual like?
                  │
             Mint Match NFT
                  │
              Open Chat
         ┌────────┼──────────────┐
       Gift    Premium         Date
       cUSD    Message         Pledge
                  │               │
             Highlighted     Lock cUSD
              in inbox            │
                           Confirm date
                                  │
                        "Date Completed" trait
                          on Match NFT
```

---

## Error States & Edge Cases

| Scenario | Handling |
|---|---|
| User tries to sign tx with insufficient cUSD | App checks balance before showing tx prompt; shows "Top up cUSD in MiniPay" |
| IPFS upload fails during profile creation | Retry with toast notification; profile not created until hash confirmed |
| Match NFT mint fails (network error) | Match still recorded off-chain; "Mint NFT" button remains in chat |
| Date pledge: one user locks, other never locks | Auto-expire after 24hrs; locked user's cUSD returned minus 5% fee |
| Ghost claim triggered incorrectly (date was rescheduled) | Rescheduling window must be used before date time; no dispute mechanism needed |
| Both users try to burn NFT simultaneously | First burn tx wins; second tx reverts gracefully |
