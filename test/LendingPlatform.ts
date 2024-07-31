import hre from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { MyToken, LendingPlatform } from "../typechain-types";

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

      expect(await lendingPlatform.getTokenBalance()).to.equal(tokenAmount);
    });

    it("Should borrow 50 tokens", async function () {
      const { myToken, lendingPlatform, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );

      const lpAddress = await lendingPlatform.getAddress();
      const lendTokenAmount = await convertTokenAmount(100, myToken);
      const borrowTokenAmount = await convertTokenAmount(50, myToken);
      await myToken.approve(lpAddress, lendTokenAmount);
      await lendingPlatform.connect(owner).lend(lendTokenAmount);

      // Borrow 50 tokens from Lending Platform and verify results
      await expect(
        lendingPlatform.connect(addr1).borrow(borrowTokenAmount)
      ).to.emit(lendingPlatform, "LoanInitiated");

      expect(await lendingPlatform.getTokenBalance()).to.equal(
        lendTokenAmount - borrowTokenAmount
      );

      expect(await myToken.balanceOf(addr1.address)).to.equal(
        borrowTokenAmount
      );
    });

    it("Should fail to start second loan before repaying the first", async function () {
      const { myToken, lendingPlatform, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );

      const lpAddress = await lendingPlatform.getAddress();
      const lendTokenAmount = await convertTokenAmount(100, myToken);
      const borrowTokenAmount = await convertTokenAmount(50, myToken);
      await myToken.approve(lpAddress, lendTokenAmount);
      await lendingPlatform.connect(owner).lend(lendTokenAmount);
      await lendingPlatform.connect(addr1).borrow(borrowTokenAmount);

      await expect(
        lendingPlatform.connect(addr1).borrow(borrowTokenAmount)
      ).to.revertedWith("Loan already active");
    });

    it("Should fail if you try and borrow more than the available balance", async function () {
      const { myToken, lendingPlatform, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );

      const lpAddress = await lendingPlatform.getAddress();
      const lendTokenAmount = await convertTokenAmount(100, myToken);
      const borrowTokenAmount = await convertTokenAmount(250, myToken);
      await myToken.approve(lpAddress, lendTokenAmount);
      await lendingPlatform.connect(owner).lend(lendTokenAmount);

      await expect(
        lendingPlatform.connect(addr1).borrow(borrowTokenAmount)
      ).to.revertedWith("Insufficient funds");
    });

    it("Should fail if you try and repay a loan that has not been initiated", async function () {
      const { myToken, lendingPlatform, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );

      const lpAddress = await lendingPlatform.getAddress();
      const lendTokenAmount = await convertTokenAmount(100, myToken);
      const borrowTokenAmount = await convertTokenAmount(250, myToken);
      await myToken.approve(lpAddress, lendTokenAmount);
      await lendingPlatform.connect(owner).lend(lendTokenAmount);

      await expect(lendingPlatform.connect(addr1).repay()).to.revertedWith(
        "No active loan"
      );
    });

    it("Should borrow 50 tokens and repay with interest after 180 days", async function () {
      const { myToken, lendingPlatform, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );

      const lpAddress = await lendingPlatform.getAddress();
      const lendTokenAmount = await convertTokenAmount(100, myToken);
      const borrowTokenAmount = await convertTokenAmount(50, myToken);
      const allowanceAmount = await convertTokenAmount(100, myToken);

      await myToken.approve(lpAddress, allowanceAmount);
      await lendingPlatform.connect(owner).lend(lendTokenAmount);

      // Borrow 50 tokens from Lending Platform
      // and repay with interest after 180 days
      await lendingPlatform.connect(addr1).borrow(borrowTokenAmount);
      await time.increase(time.duration.days(180));

      // give addr1 more of MyToken outside of the Lending Platform in order to repay
      await myToken
        .connect(owner)
        .transfer(addr1.address, await convertTokenAmount(10, myToken));

      await myToken.connect(addr1).approve(lpAddress, allowanceAmount);
      await expect(lendingPlatform.connect(addr1).repay()).to.emit(
        lendingPlatform,
        "LoanRepaid"
      );

      const newBalance = await lendingPlatform.getTokenBalance();
      expect(newBalance).to.be.greaterThan(lendTokenAmount);
      console.log("New balance: ", newBalance.toString());
    });
  });
});
