import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther } from "viem";

describe("PremiumFeatures", function () {
  async function deployFixture() {
    const [owner, treasury, alice, bob] = await hre.viem.getWalletClients();

    const cusd    = await hre.viem.deployContract("MockERC20", []);
    const premium = await hre.viem.deployContract("PremiumFeatures", [
      getAddress(cusd.address),
      getAddress(treasury.account.address),
    ]);

    await cusd.write.mint([alice.account.address, parseEther("100")]);

    const aliceCusd = await hre.viem.getContractAt("MockERC20", cusd.address, {
      client: { wallet: alice },
    });
    await aliceCusd.write.approve([getAddress(premium.address), parseEther("100")]);

    const alicePremium = await hre.viem.getContractAt("PremiumFeatures", premium.address, {
      client: { wallet: alice },
    });

    return { cusd, premium, owner, treasury, alice, bob, alicePremium };
  }

  it("boost charges 0.5 cUSD and marks user as boosted", async function () {
    const { cusd, premium, alice, treasury, alicePremium } =
      await loadFixture(deployFixture);

    await alicePremium.write.boostProfile();
    expect(await premium.read.isBoosted([alice.account.address])).to.equal(true);
    expect(await cusd.read.balanceOf([treasury.account.address])).to.equal(parseEther("0.5"));
  });

  it("boost expires after 24 hours", async function () {
    const { premium, alice, alicePremium } = await loadFixture(deployFixture);
    await alicePremium.write.boostProfile();
    await time.increase(24 * 3600 + 1);
    expect(await premium.read.isBoosted([alice.account.address])).to.equal(false);
  });

  it("super like charges 0.3 cUSD", async function () {
    const { cusd, alice, bob, treasury, alicePremium } =
      await loadFixture(deployFixture);

    await alicePremium.write.superLike([bob.account.address]);
    expect(await cusd.read.balanceOf([treasury.account.address])).to.equal(parseEther("0.3"));
  });

  it("super like reverts on self", async function () {
    const { alice, alicePremium } = await loadFixture(deployFixture);
    await expect(
      alicePremium.write.superLike([alice.account.address])
    ).to.be.rejectedWith("Cannot super like yourself");
  });

  it("swipe unlock charges 0.2 cUSD", async function () {
    const { cusd, treasury, alicePremium } = await loadFixture(deployFixture);
    await alicePremium.write.unlockSwipes();
    expect(await cusd.read.balanceOf([treasury.account.address])).to.equal(parseEther("0.2"));
  });
});
