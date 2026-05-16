import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress } from "viem";

describe("MatchNFT", function () {
  async function deployFixture() {
    const [owner, oracle, alice, bob, carol] = await hre.viem.getWalletClients();

    const matchNFT = await hre.viem.deployContract("MatchNFT", [
      getAddress(oracle.account.address),
    ]);

    const oracleContract = await hre.viem.getContractAt("MatchNFT", matchNFT.address, {
      client: { wallet: oracle },
    });

    return { matchNFT, owner, oracle, alice, bob, carol, oracleContract };
  }

  it("mints match NFTs to both parties via oracle", async function () {
    const { matchNFT, alice, bob, oracleContract } = await loadFixture(deployFixture);

    const matchId = await oracleContract.write.mint([
      alice.account.address,
      bob.account.address,
    ]);

    const aliceMatches = await matchNFT.read.getUserMatches([alice.account.address]);
    const bobMatches   = await matchNFT.read.getUserMatches([bob.account.address]);

    expect(aliceMatches).to.have.length(1);
    expect(bobMatches).to.have.length(1);
    expect(aliceMatches[0]).to.equal(1n);
  });

  it("prevents non-oracle from minting", async function () {
    const { matchNFT, alice, bob } = await loadFixture(deployFixture);
    const notOracle = await hre.viem.getContractAt("MatchNFT", matchNFT.address, {
      client: { wallet: alice },
    });
    await expect(
      notOracle.write.mint([alice.account.address, bob.account.address])
    ).to.be.rejectedWith("Not oracle");
  });

  it("prevents duplicate pair minting", async function () {
    const { alice, bob, oracleContract } = await loadFixture(deployFixture);
    await oracleContract.write.mint([alice.account.address, bob.account.address]);
    await expect(
      oracleContract.write.mint([alice.account.address, bob.account.address])
    ).to.be.rejectedWith("Already matched");
  });

  it("prevents self-match", async function () {
    const { alice, oracleContract } = await loadFixture(deployFixture);
    await expect(
      oracleContract.write.mint([alice.account.address, alice.account.address])
    ).to.be.rejectedWith("Cannot match self");
  });

  it("burns both tokens on unmatch", async function () {
    const { matchNFT, alice, bob, oracleContract } = await loadFixture(deployFixture);
    await oracleContract.write.mint([alice.account.address, bob.account.address]);

    const aliceContract = await hre.viem.getContractAt("MatchNFT", matchNFT.address, {
      client: { wallet: alice },
    });
    await aliceContract.write.burn([1n]);

    const m = await matchNFT.read.getMatch([1n]);
    expect(m.burned).to.equal(true);
  });

  it("records gifts", async function () {
    const { matchNFT, owner, alice, bob, oracleContract } = await loadFixture(deployFixture);
    await oracleContract.write.mint([alice.account.address, bob.account.address]);

    // Set giftRouter to owner
    const ownerContract = await hre.viem.getContractAt("MatchNFT", matchNFT.address, {
      client: { wallet: owner },
    });
    await ownerContract.write.setRouters([owner.account.address, owner.account.address]);
    await ownerContract.write.recordGift([1n, BigInt(1e18)]);

    const m = await matchNFT.read.getMatch([1n]);
    expect(m.giftsExchanged).to.equal(1n);
    expect(m.totalGiftValue).to.equal(BigInt(1e18));
  });
});
