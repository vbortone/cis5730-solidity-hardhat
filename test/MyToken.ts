import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { MyToken } from "../typechain-types";

describe("MyToken contract", function () {
  async function deployTokenFixture() {
    const tokensToMint = 1000;
    const [owner, addr1, addr2] = await hre.ethers.getSigners();

    const myTokenFactory = await hre.ethers.getContractFactory("MyToken");
    const myToken: MyToken = await myTokenFactory.deploy(tokensToMint);
    await myToken.waitForDeployment();

    return { myToken, owner, addr1, addr2 };
  }

  async function convertToBigNumber(amount: number, token: MyToken) {
    const tokenDecimals = await token.decimals();
    return BigInt(1000) * BigInt(10) ** tokenDecimals;
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { myToken, owner } = await loadFixture(deployTokenFixture);
      expect(await myToken.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const { myToken, owner } = await loadFixture(deployTokenFixture);
      const ownerBalance = await myToken.balanceOf(owner.address);
      expect(await myToken.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      const { myToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      // Transfer 50 tokens from owner to addr1
      await expect(myToken.transfer(addr1.address, 50)).to.changeTokenBalances(
        myToken,
        [owner, addr1],
        [-50, 50]
      );

      // Transfer 50 tokens from addr1 to addr2
      // We use .connect(signer) to send a transaction from another account
      await expect(
        myToken.connect(addr1).transfer(addr2.address, 50)
      ).to.changeTokenBalances(myToken, [addr1, addr2], [-50, 50]);
    });

    it("Should emit Transfer events", async function () {
      const { myToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      // Transfer 50 tokens from owner to addr1
      await expect(myToken.transfer(addr1.address, 50))
        .to.emit(myToken, "Transfer")
        .withArgs(owner.address, addr1.address, 50);

      // Transfer 50 tokens from addr1 to addr2
      // We use .connect(signer) to send a transaction from another account
      await expect(myToken.connect(addr1).transfer(addr2.address, 50))
        .to.emit(myToken, "Transfer")
        .withArgs(addr1.address, addr2.address, 50);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const { myToken, owner, addr1 } = await loadFixture(deployTokenFixture);
      const initialOwnerBalance = await myToken.balanceOf(owner.address);

      // Try to send 1 token from addr1 (0 tokens) to owner.
      // `require` will evaluate false and revert the transaction.
      await expect(
        myToken.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWithCustomError(myToken, "ERC20InsufficientBalance");

      // Owner balance shouldn't have changed.
      expect(await myToken.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });
  });
});
