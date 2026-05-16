import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther } from "viem";

describe("GiftRouter", function () {
  async function deployFixture() {
    const [owner, oracle, treasury, alice, bob] = await hre.viem.getWalletClients();

    const cusd = await hre.viem.deployContract("MockERC20", []);

    const matchNFT = await hre.viem.deployContract("MatchNFT", [
      getAddress(oracle.account.address),
    ]);

    const giftRouter = await hre.viem.deployContract("GiftRouter", [
      getAddress(cusd.address),
      getAddress(treasury.account.address),
      getAddress(matchNFT.address),
    ]);

    // Wire giftRouter into MatchNFT
    const ownerMatchNFT = await hre.viem.getContractAt("MatchNFT", matchNFT.address, {
      client: { wallet: owner },
    });
    await ownerMatchNFT.write.setRouters([
      getAddress(giftRouter.address),
      getAddress(owner.account.address), // datePledge placeholder
    ]);

    // Create a match
    const oracleMatchNFT = await hre.viem.getContractAt("MatchNFT", matchNFT.address, {
      client: { wallet: oracle },
    });
    await oracleMatchNFT.write.mint([alice.account.address, bob.account.address]);

    // Fund alice with cUSD
    await cusd.write.mint([alice.account.address, parseEther("100")]);

    // Approve giftRouter
    const aliceCusd = await hre.viem.getContractAt("MockERC20", cusd.address, {
      client: { wallet: alice },
    });
    await aliceCusd.write.approve([getAddress(giftRouter.address), parseEther("100")]);

    return { cusd, matchNFT, giftRouter, owner, oracle, treasury, alice, bob };
  }

  it("splits gift correctly: 90% to recipient, 10% to treasury", async function () {
    const { cusd, giftRouter, treasury, alice, bob } = await loadFixture(deployFixture);

    const aliceRouter = await hre.viem.getContractAt("GiftRouter", giftRouter.address, {
      client: { wallet: alice },
    });
    await aliceRouter.write.sendGift([1n, bob.account.address, parseEther("1"), 1, "hi"]);

    const bobBal      = await cusd.read.balanceOf([bob.account.address]);
    const treasuryBal = await cusd.read.balanceOf([treasury.account.address]);

    expect(bobBal).to.equal(parseEther("0.9"));
    expect(treasuryBal).to.equal(parseEther("0.1"));
  });

  it("reverts below minimum gift amount", async function () {
    const { giftRouter, alice, bob } = await loadFixture(deployFixture);
    const aliceRouter = await hre.viem.getContractAt("GiftRouter", giftRouter.address, {
      client: { wallet: alice },
    });
    await expect(
      aliceRouter.write.sendGift([1n, bob.account.address, parseEther("0.1"), 1, "hi"])
    ).to.be.rejectedWith("Minimum gift is 0.3 cUSD");
  });

  it("reverts when sender is not a match party", async function () {
    const { cusd, giftRouter, oracle } = await loadFixture(deployFixture);
    // Fund oracle so transfer doesn't fail on balance
    await cusd.write.mint([oracle.account.address, parseEther("10")]);
    const oracleCusd = await hre.viem.getContractAt("MockERC20", cusd.address, {
      client: { wallet: oracle },
    });
    await oracleCusd.write.approve([getAddress(giftRouter.address), parseEther("10")]);

    const oracleRouter = await hre.viem.getContractAt("GiftRouter", giftRouter.address, {
      client: { wallet: oracle },
    });
    await expect(
      oracleRouter.write.sendGift([1n, oracle.account.address, parseEther("0.5"), 1, "hi"])
    ).to.be.rejectedWith("Not match parties");
  });
});
