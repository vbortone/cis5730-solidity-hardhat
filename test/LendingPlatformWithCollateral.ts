import hre from "hardhat";
import {
  loadFixture,
  time,
  setBalance,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { MyToken, LendingPlatformWithCollateral } from "../typechain-types";

describe("LendingPlatformWithCollateral contract", function () {
  async function deployTokenFixture() {
    const tokensToMint = 1000;
    const [owner, addr1, addr2] = await hre.ethers.getSigners();

    const myTokenFactory = await hre.ethers.getContractFactory("MyToken");
    const LendingPlatformWithCollateralFactory =
      await hre.ethers.getContractFactory("LendingPlatformWithCollateral");

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

    it("Should accept collateral with depositCollateral function", async function () {
      const { myToken, lendingPlatform, owner, addr1, addr2 } =
        await loadFixture(deployTokenFixture);

      const lpAddress = await lendingPlatform.getAddress();
      const tokenAmount = await convertTokenAmount(100, myToken);
      await myToken.approve(lpAddress, tokenAmount);
      await lendingPlatform.connect(owner).lend(tokenAmount);

      await setBalance(addr1.address, hre.ethers.parseEther("2"));
      const tx = await lendingPlatform.connect(addr1).depositCollateral({
        value: hre.ethers.parseEther("0.25"), // updated parseEther usage
      });

      // Wait for the transaction to be mined
      const receipt = await tx.wait();

      await expect(tx)
        .to.emit(lendingPlatform, "CollateralDeposited")
        .withArgs(addr1.address, hre.ethers.parseEther("0.25"));

      if (receipt === null) {
        throw new Error("Transaction failed");
      }

      const contractBalance = await hre.ethers.provider.getBalance(
        lendingPlatform.getAddress()
      );
      expect(contractBalance).to.equal(hre.ethers.parseEther("0.25"));
    });

    it("Should fail when depositing collateral of zero", async function () {
      const { myToken, lendingPlatform, owner, addr1, addr2 } =
        await loadFixture(deployTokenFixture);

      const lpAddress = await lendingPlatform.getAddress();
      const tokenAmount = await convertTokenAmount(100, myToken);
      await myToken.approve(lpAddress, tokenAmount);
      await lendingPlatform.connect(owner).lend(tokenAmount);

      await setBalance(addr1.address, hre.ethers.parseEther("2"));

      await expect(
        lendingPlatform.connect(addr1).depositCollateral({
          value: 0, // updated parseEther usage
        })
      ).to.revertedWith("Must deposit Ether as collateral");
    });

    it("Should allow withdrawl after depositing collateral", async function () {
      const { myToken, lendingPlatform, owner, addr1, addr2 } =
        await loadFixture(deployTokenFixture);

      const lpAddress = await lendingPlatform.getAddress();
      const tokenAmount = await convertTokenAmount(100, myToken);
      await myToken.approve(lpAddress, tokenAmount);
      await lendingPlatform.connect(owner).lend(tokenAmount);

      await setBalance(addr1.address, hre.ethers.parseEther("2"));

      const tx = await lendingPlatform.connect(addr1).depositCollateral({
        value: hre.ethers.parseEther("0.25"), // updated parseEther usage
      });

      await tx.wait();

      await expect(
        lendingPlatform
          .connect(addr1)
          .withdrawCollateral(hre.ethers.parseEther("0.25"))
      )
        .to.emit(lendingPlatform, "CollateralWithdrawn")
        .withArgs(addr1.address, hre.ethers.parseEther("0.25"));
    });

    it("Should fail on withdrawl if asking too much", async function () {
      const { myToken, lendingPlatform, owner, addr1, addr2 } =
        await loadFixture(deployTokenFixture);

      const lpAddress = await lendingPlatform.getAddress();
      const tokenAmount = await convertTokenAmount(100, myToken);
      await myToken.approve(lpAddress, tokenAmount);
      await lendingPlatform.connect(owner).lend(tokenAmount);

      await setBalance(addr1.address, hre.ethers.parseEther("2"));

      const tx = await lendingPlatform.connect(addr1).depositCollateral({
        value: hre.ethers.parseEther("0.25"), // updated parseEther usage
      });

      await tx.wait();

      await expect(
        lendingPlatform
          .connect(addr1)
          .withdrawCollateral(hre.ethers.parseEther("0.50"))
      ).to.revertedWith("Not enough collateral");
    });

    it("Should fail on withdrawl if ask for zero", async function () {
      const { myToken, lendingPlatform, owner, addr1, addr2 } =
        await loadFixture(deployTokenFixture);

      const lpAddress = await lendingPlatform.getAddress();
      const tokenAmount = await convertTokenAmount(100, myToken);
      await myToken.approve(lpAddress, tokenAmount);
      await lendingPlatform.connect(owner).lend(tokenAmount);

      await setBalance(addr1.address, hre.ethers.parseEther("2"));

      const tx = await lendingPlatform.connect(addr1).depositCollateral({
        value: hre.ethers.parseEther("0.25"), // updated parseEther usage
      });

      await tx.wait();

      await expect(
        lendingPlatform.connect(addr1).withdrawCollateral(0)
      ).to.revertedWith("Must withdraw a positive amount");
    });

    it("Should allow borrowing of tokens after collateral", async function () {
      const { myToken, lendingPlatform, owner, addr1, addr2 } =
        await loadFixture(deployTokenFixture);

      const lpAddress = await lendingPlatform.getAddress();
      const tokenAmount = await convertTokenAmount(100, myToken);
      await myToken.approve(lpAddress, tokenAmount);
      await lendingPlatform.connect(owner).lend(tokenAmount);

      await setBalance(addr1.address, hre.ethers.parseEther("2"));

      const txdepositCollateral = await lendingPlatform
        .connect(addr1)
        .depositCollateral({
          value: hre.ethers.parseEther("1"), // updated parseEther usage
        });

      await txdepositCollateral.wait();

      await expect(lendingPlatform.connect(addr1).borrow(tokenAmount)).to.emit(
        lendingPlatform,
        "LoanInitiated"
      );

      const addr1Balance = await hre.ethers.provider.getBalance(addr1.address);
      expect(addr1Balance).to.be.lessThan(hre.ethers.parseEther("1"));
    });
  });
});
