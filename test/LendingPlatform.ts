import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { MyToken, LendingPlatform } from "../typechain-types";
import { token } from "../typechain-types/@openzeppelin/contracts";

describe("LendingPlatform contract", function () {
  async function deployTokenFixture() {
    const tokensToMint = 1000;
    const [owner, addr1, addr2] = await hre.ethers.getSigners();

    const myTokenFactory = await hre.ethers.getContractFactory("MyToken");
    const LendingPlatformFactory = await hre.ethers.getContractFactory(
      "LendingPlatform"
    );

    const myToken: MyToken = await myTokenFactory.deploy(tokensToMint);
    await myToken.waitForDeployment();

    const interestRate = 5;
    const lendingPlatform: LendingPlatform =
      await LendingPlatformFactory.deploy(myToken, interestRate);
    await lendingPlatform.waitForDeployment();

    return { myToken, lendingPlatform, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should initialize with zero tokens", async function () {
      const { lendingPlatform } = await loadFixture(deployTokenFixture);
      expect(await lendingPlatform.getTokenBalance()).to.equal(0);
    });

    it("Should initialize with the correct interest rate", async function () {
      const { lendingPlatform } = await loadFixture(deployTokenFixture);
      expect(await lendingPlatform.getInterestRate()).to.equal(5);
    });
  });

  describe("Transactions", function () {
    it("Should deposit tokens into the lending platform", async function () {
      const { myToken, lendingPlatform, owner } = await loadFixture(
        deployTokenFixture
      );

      const lpAddress = await lendingPlatform.getAddress();
      await myToken.approve(lpAddress, 100);
      await lendingPlatform.connect(owner).lend(100);

      // Lend 100 tokens to Lending Platform and verify results
      expect(await lendingPlatform.getTokenBalance()).to.equal(100);
    });

    it("Should emit TokenDeposted event", async function() {
      const { myToken, lendingPlatform, owner } = await loadFixture(
        deployTokenFixture
      );

      const lpAddress = await lendingPlatform.getAddress();
      const tokenAmount = 100;
      await myToken.approve(lpAddress, 100);

      // Lend 100 tokens to Lending Platform and verify events
      await expect(lendingPlatform.connect(owner).lend(tokenAmount))
        .to.emit(lendingPlatform, "TokensDeposited")
        .withArgs(owner.address, tokenAmount);
    });
  });
});
