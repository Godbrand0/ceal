# CEAL: On-Chain Dating on Celo

CEAL is a decentralized dating platform built on the Celo blockchain. It introduces genuine stakes to online dating by utilizing zero-knowledge identity verification, meaningful on-chain gifting, and anti-ghosting mechanisms.

## 🌟 Key Features

- **Verified Identity:** ZK age proofs via Self Protocol ensure that profiles belong to real people of appropriate age, eliminating bots and fake profiles without compromising privacy.
- **Meaningful Gifts:** Users can express genuine interest by sending cUSD (Celo Dollar) gifts alongside their messages or likes.
- **Date Pledge:** Lock a cUSD deposit before a date. If you show up, you get your funds back. If you ghost your date, you forfeit your deposit to them.
- **Fully On-Chain Matches:** Every match is securely recorded and verifiable on the Celo blockchain.

## 🏗️ Project Architecture

This repository is a monorepo containing both the smart contracts and the Next.js frontend application.

- `/my-celo-app/apps/contracts`: Hardhat environment containing the CEAL smart contracts.
- `/my-celo-app/apps/web`: Next.js frontend application interacting with the contracts using Wagmi and Viem.

## 🚀 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [pnpm](https://pnpm.io/installation) (Package manager)
- A Web3 Wallet configured for the Celo Alfajores Testnet (e.g., MetaMask, MiniPay)
- Testnet CELO and cUSD from the [Celo Faucet](https://faucet.celo.org/)

## ⚙️ Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Godbrand0/ceal.git
   cd ceal
   ```

2. **Install Dependencies:**
   Navigate to the project root and install dependencies.
   ```bash
   cd my-celo-app
   pnpm install
   ```

3. **Environment Variables:**
   Copy the template files and fill in your keys (WalletConnect Project ID, RPC URLs, etc.).
   ```bash
   cp apps/web/.env.template apps/web/.env
   # Edit apps/web/.env with your specific variables
   ```

4. **Start the Frontend Development Server:**
   ```bash
   cd apps/web
   pnpm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## 📜 Smart Contract Deployment

1. **Navigate to the Contracts directory:**
   ```bash
   cd my-celo-app/apps/contracts
   ```

2. **Set up Contract Environment:**
   Create a `.env` file for your private keys and RPC URLs.
   ```bash
   cp .env.example .env
   # Add your deployer private key
   ```

3. **Compile and Deploy:**
   ```bash
   pnpm run compile
   pnpm run deploy --network alfajores
   ```
   *Make sure to update the frontend ABI and contract addresses in `/apps/web/src/lib/contracts.ts` if you deploy new versions of the contracts.*

## 📱 MiniPay Integration

CEAL is optimized to work seamlessly within the Opera MiniPay wallet browser. Connect using the injected provider when accessing the app from MiniPay.

---
Built for the Celo Ecosystem. Powered by cUSD.
