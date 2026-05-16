import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther } from "viem";

describe("DatePledge", function () {
  async function deployFixture() {
    const [owner, oracle, treasury, alice, bob] = await hre.viem.getWalletClients();

    const cusd = await hre.viem.deployContract("MockERC20", []);

    const matchNFT = await hre.viem.deployContract("MatchNFT", [
      getAddress(oracle.account.address),
    ]);

    const datePledge = await hre.viem.deployContract("DatePledge", [
      getAddress(cusd.address),
      getAddress(treasury.account.address),
      getAddress(matchNFT.address),
    ]);

    // Wire datePledge into MatchNFT
    const ownerMatchNFT = await hre.viem.getContractAt("MatchNFT", matchNFT.address, {
      client: { wallet: owner },
    });
    await ownerMatchNFT.write.setRouters([
      getAddress(owner.account.address), // giftRouter placeholder
      getAddress(datePledge.address),
    ]);

    // Create a match
    const oracleMatchNFT = await hre.viem.getContractAt("MatchNFT", matchNFT.address, {
      client: { wallet: oracle },
    });
    await oracleMatchNFT.write.mint([alice.account.address, bob.account.address]);

    // Fund both users
    await cusd.write.mint([alice.account.address, parseEther("100")]);
    await cusd.write.mint([bob.account.address, parseEther("100")]);

    const aliceCusd = await hre.viem.getContractAt("MockERC20", cusd.address, {
      client: { wallet: alice },
    });
    const bobCusd = await hre.viem.getContractAt("MockERC20", cusd.address, {
      client: { wallet: bob },
    });
    await aliceCusd.write.approve([getAddress(datePledge.address), parseEther("100")]);
    await bobCusd.write.approve([getAddress(datePledge.address), parseEther("100")]);

    const alicePledge = await hre.viem.getContractAt("DatePledge", datePledge.address, {
      client: { wallet: alice },
    });
    const bobPledge = await hre.viem.getContractAt("DatePledge", datePledge.address, {
      client: { wallet: bob },
    });

    return { cusd, matchNFT, datePledge, owner, oracle, treasury, alice, bob, alicePledge, bobPledge };
  }

  async function getScheduledAt(offsetSeconds = 7 * 24 * 3600) {
    return BigInt((await time.latest()) + offsetSeconds);
  }

  it("full happy path: propose → accept → lock × 2 → confirm × 2 → completed", async function () {
    const { cusd, datePledge, alice, bob, alicePledge, bobPledge, treasury } =
      await loadFixture(deployFixture);

    const scheduledAt = await getScheduledAt();
    const amountEach  = parseEther("1");

    await alicePledge.write.propose([1n, amountEach, scheduledAt]);

    await bobPledge.write.accept([1n]);
    await alicePledge.write.lock([1n]);
    await bobPledge.write.lock([1n]);

    // Both parties locked — status should be LOCKED (2)
    const pledgeAfterLock = await datePledge.read.getPledge([1n]);
    expect(pledgeAfterLock.status).to.equal(2); // LOCKED

    // Advance time past scheduledAt
    await time.increaseTo(scheduledAt + 1n);

    await alicePledge.write.confirm([1n]);
    await bobPledge.write.confirm([1n]);

    const pledge = await datePledge.read.getPledge([1n]);
    expect(pledge.status).to.equal(3); // COMPLETED

    // Each gets 95% back; treasury got 5% × 2 = 10% of total
    const fee          = (amountEach * 5n) / 100n;
    const net          = amountEach - fee;
    const aliceFinal   = await cusd.read.balanceOf([alice.account.address]);
    const bobFinal     = await cusd.read.balanceOf([bob.account.address]);
    const treasuryBal  = await cusd.read.balanceOf([treasury.account.address]);

    expect(aliceFinal).to.equal(parseEther("100") - fee);  // started 100, paid fee
    expect(bobFinal).to.equal(parseEther("100") - fee);
    expect(treasuryBal).to.equal(fee * 2n);
  });

  it("ghost claim: non-confirmer loses deposit after window", async function () {
    const { cusd, datePledge, alice, bob, alicePledge, bobPledge } =
      await loadFixture(deployFixture);

    const scheduledAt = await getScheduledAt();
    await alicePledge.write.propose([1n, parseEther("1"), scheduledAt]);
    await bobPledge.write.accept([1n]);
    await alicePledge.write.lock([1n]);
    await bobPledge.write.lock([1n]);

    // Alice confirms, bob doesn't
    await time.increaseTo(scheduledAt + 1n);
    await alicePledge.write.confirm([1n]);

    // Advance past GHOST_WINDOW (48 hours)
    await time.increase(48 * 3600 + 1);

    const balBefore = await cusd.read.balanceOf([alice.account.address]);
    await alicePledge.write.claimGhost([1n]);
    const balAfter = await cusd.read.balanceOf([alice.account.address]);

    // Alice receives both net escrows
    const fee = (parseEther("1") * 5n) / 100n;
    const net = parseEther("1") - fee;
    expect(balAfter - balBefore).to.equal(net * 2n);

    const pledge = await datePledge.read.pledges([1n]);
    expect(pledge.status).to.equal(4); // GHOSTED
  });

  it("reverts ghost claim before window elapses", async function () {
    const { datePledge, alice, bob, alicePledge, bobPledge } =
      await loadFixture(deployFixture);

    const scheduledAt = await getScheduledAt();
    await alicePledge.write.propose([1n, parseEther("1"), scheduledAt]);
    await bobPledge.write.accept([1n]);
    await alicePledge.write.lock([1n]);
    await bobPledge.write.lock([1n]);

    await time.increaseTo(scheduledAt + 1n);
    await alicePledge.write.confirm([1n]);

    // Try to claim immediately — should fail
    await expect(alicePledge.write.claimGhost([1n])).to.be.rejectedWith(
      "Ghost window not elapsed"
    );
  });

  it("reverts propose if scheduledAt is in the past", async function () {
    const { alicePledge } = await loadFixture(deployFixture);
    await expect(
      alicePledge.write.propose([1n, parseEther("1"), 1n])
    ).to.be.rejectedWith("Date must be in the future");
  });

  it("cancel before lock returns no funds", async function () {
    const { datePledge, alicePledge } = await loadFixture(deployFixture);
    const scheduledAt = await getScheduledAt();
    await alicePledge.write.propose([1n, parseEther("1"), scheduledAt]);
    await alicePledge.write.cancel([1n]);
    const pledge = await datePledge.read.pledges([1n]);
    expect(pledge.status).to.equal(5); // CANCELLED
  });
});
