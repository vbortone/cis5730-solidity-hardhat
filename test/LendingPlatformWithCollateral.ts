import hre from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { MyToken, LendingPlatformWithCollateral } from "../typechain-types";

describe("LendingPlatformWithCollateral contract", function () {
  async function deployTokenFixture() {
    const tokensToMint = 1000;
    const [owner, addr1, addr2] = await hre.ethers.getSigners();

    const myTokenFactory = await hre.ethers.getContractFactory("MyToken");
    const LendingPlatformWithCollateralFactory = await hre.ethers.getContractFactory(
      "LendingPlatformWithCollateral"
    );

    const myToken: MyToken = await myTokenFactory.deploy(tokensToMint);
    await myToken.waitForDeployment();

    const interestRate = 5;
    const lendingPlatform: LendingPlatformWithCollateral =
      await LendingPlatformWithCollateralFactory.deploy(myToken, interestRate);
    await lendingPlatform.waitForDeployment();

    return { myToken, lendingPlatform, owner, addr1, addr2 };
  }

  async function convertTokenAmount(amount: number, token: MyToken) {
    const tokenDecimals = await token.decimals();
    return BigInt(amount) * BigInt(10) ** tokenDecimals;
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
    it("Should deposit tokens into the lending platform and emit TokenDeposted event", async function () {
      const { myToken, lendingPlatform, owner } = await loadFixture(
        deployTokenFixture
      );

      const lpAddress = await lendingPlatform.getAddress();
      const tokenAmount = await convertTokenAmount(100, myToken);
      await myToken.approve(lpAddress, tokenAmount);

      // Lend 100 tokens to Lending Platform and verify results
      await expect(lendingPlatform.connect(owner).lend(tokenAmount))
        .to.emit(lendingPlatform, "TokensDeposited")
        .withArgs(owner.address, tokenAmount);
    });
  });
});