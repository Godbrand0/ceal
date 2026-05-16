import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress } from "viem";

describe("ProfileNFT", function () {
  async function deployFixture() {
    const [owner, alice, bob, selfVerifier] = await hre.viem.getWalletClients();

    const profileNFT = await hre.viem.deployContract("ProfileNFT", [
      getAddress(selfVerifier.account.address),
    ]);

    return { profileNFT, owner, alice, bob, selfVerifier };
  }

  it("mints a profile NFT with IPFS URI", async function () {
    const { profileNFT, alice } = await loadFixture(deployFixture);
    const uri = "ipfs://QmTest";

    const contract = await hre.viem.getContractAt("ProfileNFT", profileNFT.address, {
      client: { wallet: alice },
    });
    await contract.write.mint([uri]);

    const tokenId = await profileNFT.read.profileOf([alice.account.address]);
    expect(tokenId).to.equal(1n);
    expect(await profileNFT.read.tokenURI([1n])).to.equal(uri);
  });

  it("reverts if same address mints twice", async function () {
    const { profileNFT, alice } = await loadFixture(deployFixture);
    const contract = await hre.viem.getContractAt("ProfileNFT", profileNFT.address, {
      client: { wallet: alice },
    });
    await contract.write.mint(["ipfs://first"]);
    await expect(contract.write.mint(["ipfs://second"])).to.be.rejectedWith(
      "Profile already exists"
    );
  });

  it("is soulbound — transfer reverts", async function () {
    const { profileNFT, alice, bob } = await loadFixture(deployFixture);
    const contract = await hre.viem.getContractAt("ProfileNFT", profileNFT.address, {
      client: { wallet: alice },
    });
    await contract.write.mint(["ipfs://QmTest"]);
    await expect(
      contract.write.transferFrom([
        alice.account.address,
        bob.account.address,
        1n,
      ])
    ).to.be.rejectedWith("Soulbound: non-transferable");
  });

  it("allows metadata update by owner", async function () {
    const { profileNFT, alice } = await loadFixture(deployFixture);
    const contract = await hre.viem.getContractAt("ProfileNFT", profileNFT.address, {
      client: { wallet: alice },
    });
    await contract.write.mint(["ipfs://v1"]);
    await contract.write.updateMetadata(["ipfs://v2"]);
    expect(await profileNFT.read.tokenURI([1n])).to.equal("ipfs://v2");
  });

  it("marks verified via selfProtocolVerifier", async function () {
    const { profileNFT, alice, selfVerifier } = await loadFixture(deployFixture);
    const verifierContract = await hre.viem.getContractAt(
      "ProfileNFT",
      profileNFT.address,
      { client: { wallet: selfVerifier } }
    );
    await verifierContract.write.setVerified([alice.account.address]);
    expect(await profileNFT.read.isVerified([alice.account.address])).to.equal(true);
  });

  it("links talent protocol", async function () {
    const { profileNFT, alice } = await loadFixture(deployFixture);
    const contract = await hre.viem.getContractAt("ProfileNFT", profileNFT.address, {
      client: { wallet: alice },
    });
    await contract.write.mint(["ipfs://QmTest"]);
    await contract.write.linkTalentProtocol(["talent-123"]);
    expect(await profileNFT.read.talentProfile([alice.account.address])).to.equal("talent-123");
  });
});
