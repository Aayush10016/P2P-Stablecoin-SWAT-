const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Escrow", function () {
  let escrow;
  let swatToken;
  let busdToken;
  let owner;
  let seller;
  let buyer;
  let addr3;

  beforeEach(async function () {
    // Get signers
    [owner, seller, buyer, addr3] = await ethers.getSigners();

    // Deploy SWATToken
    const SWATToken = await ethers.getContractFactory("SWATToken");
    swatToken = await SWATToken.deploy();
    await swatToken.waitForDeployment();

    // Deploy a mock BUSD token (using SWATToken contract as template)
    const BUSDToken = await ethers.getContractFactory("SWATToken");
    busdToken = await BUSDToken.deploy();
    await busdToken.waitForDeployment();

    // Deploy Escrow
    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy();
    await escrow.waitForDeployment();

    // Mint tokens for testing
    await swatToken.mint(seller.address, ethers.parseEther("10000"));
    await busdToken.mint(buyer.address, ethers.parseEther("10000"));
  });

  describe("Offer Creation", function () {
    it("Should create an offer successfully", async function () {
      const amount = ethers.parseEther("1000");
      const price = ethers.parseEther("1000");

      // Approve escrow to spend tokens
      await swatToken.connect(seller).approve(await escrow.getAddress(), amount);

      // Create offer
      const tx = await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        amount,
        price,
        buyer.address
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      // Verify offer details
      const offer = await escrow.getOffer(0);
      expect(offer.seller).to.equal(seller.address);
      expect(offer.buyer).to.equal(buyer.address);
      expect(offer.amount).to.equal(amount);
      expect(offer.priceInBUSD).to.equal(price);
      expect(offer.active).to.equal(true);
    });

    it("Should transfer tokens to escrow on offer creation", async function () {
      const amount = ethers.parseEther("1000");
      const price = ethers.parseEther("1000");

      await swatToken.connect(seller).approve(await escrow.getAddress(), amount);

      const sellerBalanceBefore = await swatToken.balanceOf(seller.address);

      await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        amount,
        price,
        buyer.address
      );

      const sellerBalanceAfter = await swatToken.balanceOf(seller.address);
      const escrowBalance = await swatToken.balanceOf(await escrow.getAddress());

      expect(sellerBalanceAfter).to.equal(sellerBalanceBefore - amount);
      expect(escrowBalance).to.equal(amount);
    });

    it("Should increment offer counter", async function () {
      const amount = ethers.parseEther("1000");
      const price = ethers.parseEther("1000");

      await swatToken.connect(seller).approve(await escrow.getAddress(), amount * 2n);

      await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        amount,
        price,
        buyer.address
      );

      // Wait for cooldown
      await ethers.provider.send("evm_increaseTime", [11]);
      await ethers.provider.send("evm_mine");

      await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        amount,
        price,
        buyer.address
      );

      expect(Number(await escrow.getOfferCount())).to.equal(2);
    });

    it("Should fail with invalid token address", async function () {
      const amount = ethers.parseEther("1000");
      const price = ethers.parseEther("1000");

      try {
        await escrow.connect(seller).createOffer(
          ethers.ZeroAddress,
          amount,
          price,
          buyer.address
        );
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("invalid token address");
      }
    });

    it("Should fail with zero amount", async function () {
      const price = ethers.parseEther("1000");

      try {
        await escrow.connect(seller).createOffer(
          await swatToken.getAddress(),
          0,
          price,
          buyer.address
        );
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("amount must be greater than 0");
      }
    });

    it("Should fail with zero price", async function () {
      const amount = ethers.parseEther("1000");

      await swatToken.connect(seller).approve(await escrow.getAddress(), amount);

      try {
        await escrow.connect(seller).createOffer(
          await swatToken.getAddress(),
          amount,
          0,
          buyer.address
        );
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("price must be greater than 0");
      }
    });

    it("Should fail with invalid buyer address", async function () {
      const amount = ethers.parseEther("1000");
      const price = ethers.parseEther("1000");

      await swatToken.connect(seller).approve(await escrow.getAddress(), amount);

      try {
        await escrow.connect(seller).createOffer(
          await swatToken.getAddress(),
          amount,
          price,
          ethers.ZeroAddress
        );
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("invalid buyer address");
      }
    });

    it("Should fail when buyer is same as seller", async function () {
      const amount = ethers.parseEther("1000");
      const price = ethers.parseEther("1000");

      await swatToken.connect(seller).approve(await escrow.getAddress(), amount);

      try {
        await escrow.connect(seller).createOffer(
          await swatToken.getAddress(),
          amount,
          price,
          seller.address
        );
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("buyer cannot be seller");
      }
    });
  });

  describe("Offer Acceptance", function () {
    let offerId;
    const amount = ethers.parseEther("1000");
    const price = ethers.parseEther("1000");

    beforeEach(async function () {
      // Create an offer
      await swatToken.connect(seller).approve(await escrow.getAddress(), amount);
      const tx = await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        amount,
        price,
        buyer.address
      );
      await tx.wait();
      offerId = 0;

      // Approve escrow to spend buyer's BUSD
      await busdToken.connect(buyer).approve(await escrow.getAddress(), price);
    });

    it("Should accept offer successfully", async function () {
      const tx = await escrow.connect(buyer).acceptOffer(offerId, await busdToken.getAddress());
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      // Verify offer is no longer active
      const offer = await escrow.getOffer(offerId);
      expect(offer.active).to.equal(false);
    });

    it("Should transfer tokens to buyer", async function () {
      const buyerBalanceBefore = await swatToken.balanceOf(buyer.address);

      await escrow.connect(buyer).acceptOffer(offerId, await busdToken.getAddress());

      const buyerBalanceAfter = await swatToken.balanceOf(buyer.address);
      expect(buyerBalanceAfter).to.equal(buyerBalanceBefore + amount);
    });

    it("Should transfer BUSD to seller", async function () {
      const sellerBalanceBefore = await busdToken.balanceOf(seller.address);

      await escrow.connect(buyer).acceptOffer(offerId, await busdToken.getAddress());

      const sellerBalanceAfter = await busdToken.balanceOf(seller.address);
      expect(sellerBalanceAfter).to.equal(sellerBalanceBefore + price);
    });

    it("Should fail if caller is not the designated buyer", async function () {
      try {
        await escrow.connect(addr3).acceptOffer(offerId, await busdToken.getAddress());
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("caller is not the designated buyer");
      }
    });

    it("Should fail if offer is not active", async function () {
      // Accept the offer first
      await escrow.connect(buyer).acceptOffer(offerId, await busdToken.getAddress());

      // Try to accept again
      await busdToken.connect(buyer).approve(await escrow.getAddress(), price);

      try {
        await escrow.connect(buyer).acceptOffer(offerId, await busdToken.getAddress());
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("offer is not active");
      }
    });

    it("Should fail with invalid BUSD address", async function () {
      try {
        await escrow.connect(buyer).acceptOffer(offerId, ethers.ZeroAddress);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("invalid BUSD address");
      }
    });

    it("Should fail with insufficient BUSD allowance", async function () {
      // Create new buyer without approval
      const [, , , newBuyer] = await ethers.getSigners();
      await busdToken.mint(newBuyer.address, ethers.parseEther("10000"));

      // Wait for cooldown
      await ethers.provider.send("evm_increaseTime", [11]);
      await ethers.provider.send("evm_mine");

      // Create offer for new buyer
      await swatToken.connect(seller).approve(await escrow.getAddress(), amount);
      await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        amount,
        price,
        newBuyer.address
      );

      try {
        await escrow.connect(newBuyer).acceptOffer(1, await busdToken.getAddress());
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("InsufficientAllowance");
      }
    });
  });

  describe("Offer Cancellation", function () {
    let offerId;
    const amount = ethers.parseEther("1000");
    const price = ethers.parseEther("1000");

    beforeEach(async function () {
      // Create an offer
      await swatToken.connect(seller).approve(await escrow.getAddress(), amount);
      const tx = await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        amount,
        price,
        buyer.address
      );
      await tx.wait();
      offerId = 0;
    });

    it("Should cancel offer successfully", async function () {
      const tx = await escrow.connect(seller).cancelOffer(offerId);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      // Verify offer is no longer active
      const offer = await escrow.getOffer(offerId);
      expect(offer.active).to.equal(false);
    });

    it("Should return tokens to seller", async function () {
      const sellerBalanceBefore = await swatToken.balanceOf(seller.address);

      await escrow.connect(seller).cancelOffer(offerId);

      const sellerBalanceAfter = await swatToken.balanceOf(seller.address);
      expect(sellerBalanceAfter).to.equal(sellerBalanceBefore + amount);
    });

    it("Should fail if caller is not the seller", async function () {
      try {
        await escrow.connect(buyer).cancelOffer(offerId);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("caller is not the seller");
      }
    });

    it("Should fail if offer is not active", async function () {
      // Cancel the offer first
      await escrow.connect(seller).cancelOffer(offerId);

      // Try to cancel again
      try {
        await escrow.connect(seller).cancelOffer(offerId);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("offer is not active");
      }
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple offers from same seller", async function () {
      const amount = ethers.parseEther("1000");
      const price = ethers.parseEther("1000");

      await swatToken.connect(seller).approve(await escrow.getAddress(), amount * 3n);

      await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        amount,
        price,
        buyer.address
      );

      // Wait for cooldown
      await ethers.provider.send("evm_increaseTime", [11]);
      await ethers.provider.send("evm_mine");

      await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        amount,
        price,
        addr3.address
      );

      // Wait for cooldown
      await ethers.provider.send("evm_increaseTime", [11]);
      await ethers.provider.send("evm_mine");

      await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        amount,
        price,
        buyer.address
      );

      expect(Number(await escrow.getOfferCount())).to.equal(3);
    });

    it("Should handle fractional token amounts", async function () {
      const amount = ethers.parseEther("0.5");
      const price = ethers.parseEther("0.5");

      await swatToken.connect(seller).approve(await escrow.getAddress(), amount);

      const tx = await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        amount,
        price,
        buyer.address
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const offer = await escrow.getOffer(0);
      expect(offer.amount).to.equal(amount);
    });

    it("Should handle large token amounts", async function () {
      const largeAmount = ethers.parseEther("1000000");
      const price = ethers.parseEther("1000000");

      // Mint large amount
      await swatToken.mint(seller.address, largeAmount);
      await swatToken.connect(seller).approve(await escrow.getAddress(), largeAmount);

      const tx = await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        largeAmount,
        price,
        buyer.address
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it("Should get non-existent offer without reverting", async function () {
      const offer = await escrow.getOffer(999);
      expect(offer.active).to.equal(false);
      expect(offer.seller).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Security Features - Pausable", function () {
    it("Should allow owner to pause the contract", async function () {
      await escrow.pause();
      expect(await escrow.paused()).to.equal(true);
    });

    it("Should allow owner to unpause the contract", async function () {
      await escrow.pause();
      await escrow.unpause();
      expect(await escrow.paused()).to.equal(false);
    });

    it("Should prevent offer creation when paused", async function () {
      const amount = ethers.parseEther("1000");
      const price = ethers.parseEther("1000");

      await swatToken.connect(seller).approve(await escrow.getAddress(), amount);
      await escrow.pause();

      try {
        await escrow.connect(seller).createOffer(
          await swatToken.getAddress(),
          amount,
          price,
          buyer.address
        );
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("EnforcedPause");
      }
    });

    it("Should not allow non-owner to pause", async function () {
      try {
        await escrow.connect(seller).pause();
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("Ownable");
      }
    });
  });

  describe("Security Features - Rate Limiting", function () {
    it("Should track remaining offers for user", async function () {
      const maxOffers = await escrow.MAX_OFFERS_PER_DAY();
      const remaining = await escrow.getRemainingOffers(seller.address);
      expect(remaining).to.equal(maxOffers);
    });

    it("Should decrease remaining offers after creation", async function () {
      const amount = ethers.parseEther("100");
      const price = ethers.parseEther("100");

      await swatToken.mint(seller.address, amount);
      await swatToken.connect(seller).approve(await escrow.getAddress(), amount);
      await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        amount,
        price,
        buyer.address
      );

      const maxOffers = await escrow.MAX_OFFERS_PER_DAY();
      const remaining = await escrow.getRemainingOffers(seller.address);
      expect(remaining).to.equal(maxOffers - 1n);
    });

    it("Should enforce cooldown between offers", async function () {
      const amount = ethers.parseEther("100");
      const price = ethers.parseEther("100");

      await swatToken.mint(seller.address, amount * 2n);
      await swatToken.connect(seller).approve(await escrow.getAddress(), amount * 2n);

      await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        amount,
        price,
        buyer.address
      );

      try {
        await escrow.connect(seller).createOffer(
          await swatToken.getAddress(),
          amount,
          price,
          buyer.address
        );
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("cooldown");
      }
    });
  });

  describe("Security Features - Emergency Withdrawal", function () {
    it("Should allow owner to emergency withdraw when paused", async function () {
      const amount = ethers.parseEther("1000");
      const price = ethers.parseEther("1000");

      // Create offer (locks tokens in escrow)
      await swatToken.connect(seller).approve(await escrow.getAddress(), amount);
      await escrow.connect(seller).createOffer(
        await swatToken.getAddress(),
        amount,
        price,
        buyer.address
      );

      // Pause and emergency withdraw
      await escrow.pause();
      await escrow.emergencyWithdraw(
        await swatToken.getAddress(),
        amount,
        owner.address
      );

      expect(await swatToken.balanceOf(owner.address)).to.equal(amount);
    });

    it("Should not allow emergency withdraw when not paused", async function () {
      const amount = ethers.parseEther("1000");

      try {
        await escrow.emergencyWithdraw(
          await swatToken.getAddress(),
          amount,
          owner.address
        );
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("only when paused");
      }
    });

    it("Should not allow non-owner to emergency withdraw", async function () {
      await escrow.pause();

      try {
        await escrow.connect(seller).emergencyWithdraw(
          await swatToken.getAddress(),
          ethers.parseEther("1000"),
          seller.address
        );
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("Ownable");
      }
    });
  });

  describe("Security Features - Fee Management", function () {
    it("Should allow owner to update platform fee", async function () {
      await escrow.updateFee(100); // 1%
      expect(Number(await escrow.platformFeePercent())).to.equal(100);
    });

    it("Should not allow fee above 5%", async function () {
      try {
        await escrow.updateFee(600); // 6%
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("fee too high");
      }
    });

    it("Should allow owner to update fee collector", async function () {
      await escrow.updateFeeCollector(addr3.address);
      expect(await escrow.feeCollector()).to.equal(addr3.address);
    });

    it("Should not allow non-owner to update fee", async function () {
      try {
        await escrow.connect(seller).updateFee(100);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("Ownable");
      }
    });
  });
});
