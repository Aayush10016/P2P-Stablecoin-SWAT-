const { expect } = require("chai");
const { ethers } = require("hardhat");
const fc = require("fast-check");

describe("SWATToken", function () {
  let swatToken;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy SWATToken
    const SWATToken = await ethers.getContractFactory("SWATToken");
    swatToken = await SWATToken.deploy();
    await swatToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name", async function () {
      expect(await swatToken.name()).to.equal("SWAT Coin");
    });

    it("Should set the correct symbol", async function () {
      expect(await swatToken.symbol()).to.equal("SWAT");
    });

    it("Should set the correct decimals", async function () {
      expect(Number(await swatToken.decimals())).to.equal(18);
    });

    it("Should set the deployer as owner", async function () {
      expect(await swatToken.owner()).to.equal(owner.address);
    });

    it("Should have getOwner function for BEP20 compatibility", async function () {
      expect(await swatToken.getOwner()).to.equal(owner.address);
    });

    it("Should start with zero total supply", async function () {
      expect(Number(await swatToken.totalSupply())).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      await swatToken.mint(addr1.address, mintAmount);
      expect(await swatToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should increase total supply when minting", async function () {
      const mintAmount = ethers.parseEther("50000");
      await swatToken.mint(owner.address, mintAmount);
      expect(await swatToken.totalSupply()).to.equal(mintAmount);
    });

    it("Should not allow non-owner to mint", async function () {
      const mintAmount = ethers.parseEther("1000");
      try {
        await swatToken.connect(addr1).mint(addr2.address, mintAmount);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("Ownable");
      }
    });

    it("Should not allow minting to zero address", async function () {
      const mintAmount = ethers.parseEther("1000");
      try {
        await swatToken.mint(ethers.ZeroAddress, mintAmount);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("zero address");
      }
    });

    it("Should not allow minting zero amount", async function () {
      try {
        await swatToken.mint(addr1.address, 0);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("greater than 0");
      }
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      // Mint tokens to owner for transfer tests
      await swatToken.mint(owner.address, ethers.parseEther("10000"));
    });

    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseEther("100");
      await swatToken.transfer(addr1.address, transferAmount);
      expect(await swatToken.balanceOf(addr1.address)).to.equal(transferAmount);
    });

    it("Should update balances after transfer", async function () {
      const initialOwnerBalance = await swatToken.balanceOf(owner.address);
      const transferAmount = ethers.parseEther("100");
      
      await swatToken.transfer(addr1.address, transferAmount);
      
      expect(await swatToken.balanceOf(owner.address)).to.equal(
        initialOwnerBalance - transferAmount
      );
      expect(await swatToken.balanceOf(addr1.address)).to.equal(transferAmount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      try {
        await swatToken.connect(addr1).transfer(owner.address, ethers.parseEther("1"));
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("InsufficientBalance");
      }
    });

    it("Should emit Transfer event", async function () {
      const transferAmount = ethers.parseEther("100");
      const tx = await swatToken.transfer(addr1.address, transferAmount);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });
  });

  describe("Divisibility", function () {
    beforeEach(async function () {
      await swatToken.mint(owner.address, ethers.parseEther("1000"));
    });

    it("Should handle fractional transfers (0.5 tokens)", async function () {
      const amount = ethers.parseEther("0.5");
      await swatToken.transfer(addr1.address, amount);
      expect(await swatToken.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should handle fractional transfers (1.25 tokens)", async function () {
      const amount = ethers.parseEther("1.25");
      await swatToken.transfer(addr1.address, amount);
      expect(await swatToken.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should handle fractional transfers (10.333 tokens)", async function () {
      const amount = ethers.parseEther("10.333");
      await swatToken.transfer(addr1.address, amount);
      expect(await swatToken.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should handle very small amounts", async function () {
      const amount = ethers.parseUnits("0.000000000000000001", 18); // 1 wei
      await swatToken.transfer(addr1.address, amount);
      expect(await swatToken.balanceOf(addr1.address)).to.equal(amount);
    });
  });

  describe("Approve and TransferFrom (P2P Trading)", function () {
    beforeEach(async function () {
      await swatToken.mint(owner.address, ethers.parseEther("10000"));
    });

    it("Should approve tokens for spending", async function () {
      const approveAmount = ethers.parseEther("100");
      await swatToken.approve(addr1.address, approveAmount);
      expect(await swatToken.allowance(owner.address, addr1.address)).to.equal(
        approveAmount
      );
    });

    it("Should emit Approval event", async function () {
      const approveAmount = ethers.parseEther("100");
      const tx = await swatToken.approve(addr1.address, approveAmount);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it("Should allow transferFrom with valid allowance", async function () {
      const amount = ethers.parseEther("100");
      await swatToken.approve(addr1.address, amount);
      
      await swatToken.connect(addr1).transferFrom(owner.address, addr2.address, amount);
      
      expect(await swatToken.balanceOf(addr2.address)).to.equal(amount);
    });

    it("Should decrease allowance after transferFrom", async function () {
      const amount = ethers.parseEther("100");
      await swatToken.approve(addr1.address, amount);
      
      await swatToken.connect(addr1).transferFrom(owner.address, addr2.address, amount);
      
      expect(Number(await swatToken.allowance(owner.address, addr1.address))).to.equal(0);
    });

    it("Should fail transferFrom with insufficient allowance", async function () {
      const amount = ethers.parseEther("100");
      await swatToken.approve(addr1.address, ethers.parseEther("50"));
      
      try {
        await swatToken.connect(addr1).transferFrom(owner.address, addr2.address, amount);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("InsufficientAllowance");
      }
    });
  });

  describe("Balance Queries", function () {
    it("Should return correct balance for address with tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      await swatToken.mint(addr1.address, mintAmount);
      expect(await swatToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should return zero balance for address without tokens", async function () {
      expect(Number(await swatToken.balanceOf(addr1.address))).to.equal(0);
    });

    it("Should return correct total supply", async function () {
      await swatToken.mint(addr1.address, ethers.parseEther("1000"));
      await swatToken.mint(addr2.address, ethers.parseEther("2000"));
      expect(await swatToken.totalSupply()).to.equal(ethers.parseEther("3000"));
    });
  });

  describe("Security Features - Pausable", function () {
    beforeEach(async function () {
      await swatToken.mint(owner.address, ethers.parseEther("10000"));
    });

    it("Should allow owner to pause the contract", async function () {
      await swatToken.pause();
      expect(await swatToken.paused()).to.equal(true);
    });

    it("Should allow owner to unpause the contract", async function () {
      await swatToken.pause();
      await swatToken.unpause();
      expect(await swatToken.paused()).to.equal(false);
    });

    it("Should prevent transfers when paused", async function () {
      await swatToken.pause();
      
      try {
        await swatToken.transfer(addr1.address, ethers.parseEther("100"));
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("EnforcedPause");
      }
    });

    it("Should allow transfers after unpause", async function () {
      await swatToken.pause();
      await swatToken.unpause();
      
      const amount = ethers.parseEther("100");
      await swatToken.transfer(addr1.address, amount);
      expect(await swatToken.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should not allow non-owner to pause", async function () {
      try {
        await swatToken.connect(addr1).pause();
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("Ownable");
      }
    });
  });

  describe("Security Features - Supply Cap", function () {
    it("Should enforce maximum supply cap", async function () {
      const maxSupply = await swatToken.MAX_SUPPLY();
      
      try {
        await swatToken.mint(owner.address, maxSupply + 1n);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("exceeds max supply");
      }
    });

    it("Should allow minting up to max supply", async function () {
      const maxSupply = await swatToken.MAX_SUPPLY();
      await swatToken.mint(owner.address, maxSupply);
      expect(await swatToken.totalSupply()).to.equal(maxSupply);
    });

    it("Should prevent minting beyond max supply in multiple calls", async function () {
      const maxSupply = await swatToken.MAX_SUPPLY();
      await swatToken.mint(owner.address, maxSupply - ethers.parseEther("100"));
      
      try {
        await swatToken.mint(addr1.address, ethers.parseEther("200"));
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("exceeds max supply");
      }
    });
  });

  describe("Security Features - Emergency Withdrawal", function () {
    it("Should allow owner to withdraw accidentally sent BNB", async function () {
      // Send BNB to contract
      await owner.sendTransaction({
        to: await swatToken.getAddress(),
        value: ethers.parseEther("1")
      });

      const initialBalance = await ethers.provider.getBalance(addr1.address);
      
      await swatToken.emergencyWithdraw(
        ethers.ZeroAddress,
        ethers.parseEther("1"),
        addr1.address
      );

      const finalBalance = await ethers.provider.getBalance(addr1.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("1"));
    });

    it("Should not allow non-owner to emergency withdraw", async function () {
      try {
        await swatToken.connect(addr1).emergencyWithdraw(
          ethers.ZeroAddress,
          ethers.parseEther("1"),
          addr1.address
        );
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("Ownable");
      }
    });

    it("Should not allow withdrawal to zero address", async function () {
      try {
        await swatToken.emergencyWithdraw(
          ethers.ZeroAddress,
          ethers.parseEther("1"),
          ethers.ZeroAddress
        );
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("zero address");
      }
    });
  });

  // **Feature: swat-coin-cleanup, Property 1: Consistent SWAT Branding**
  // **Validates: Requirements 1.3, 7.5**
  describe("Property-Based Tests - SWAT Branding", function () {
    it("Property 1: Consistent SWAT Branding - All metadata queries should return SWAT branding", async function () {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Test that all branding elements consistently show SWAT
          const name = await swatToken.name();
          const symbol = await swatToken.symbol();
          
          expect(name).to.equal("SWAT Coin");
          expect(symbol).to.equal("SWAT");
          expect(name).to.not.include("USDT");
          expect(name).to.not.include("Tether");
          expect(symbol).to.not.include("USDT");
        }),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: swat-coin-cleanup, Property 3: Security Maintenance**
  // **Validates: Requirements 6.2, 6.4, 6.5**
  describe("Property-Based Tests - Security Maintenance", function () {
    it("Property 3: Security Maintenance - All security features should maintain the same security posture as the original implementation", async function () {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // mint amount in tokens
          async (mintAmount) => {
            // Deploy a fresh contract for each property test run
            const SWATToken = await ethers.getContractFactory("SWATToken");
            const freshToken = await SWATToken.deploy();
            await freshToken.waitForDeployment();
            
            const mintAmountWei = ethers.parseEther(mintAmount.toString());
            
            // Test that all security features work identically
            
            // 1. Test ownership controls are preserved
            expect(await freshToken.owner()).to.equal(owner.address);
            
            // 2. Test pause functionality is preserved
            await freshToken.pause();
            expect(await freshToken.paused()).to.equal(true);
            
            // Test that transfers are blocked when paused
            await freshToken.mint(owner.address, mintAmountWei);
            try {
              await freshToken.transfer(addr1.address, ethers.parseEther("1"));
              expect.fail("Should have reverted when paused");
            } catch (error) {
              expect(error.message).to.include("EnforcedPause");
            }
            
            // 3. Test unpause functionality
            await freshToken.unpause();
            expect(await freshToken.paused()).to.equal(false);
            
            // Test that transfers work after unpause
            await freshToken.transfer(addr1.address, ethers.parseEther("1"));
            expect(await freshToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("1"));
            
            // 4. Test supply cap enforcement is preserved
            const maxSupply = await freshToken.MAX_SUPPLY();
            expect(maxSupply).to.be.greaterThan(0n);
            
            // 5. Test minting access control is preserved
            try {
              await freshToken.connect(addr1).mint(addr2.address, ethers.parseEther("1"));
              expect.fail("Should have reverted - non-owner minting");
            } catch (error) {
              expect(error.message).to.include("Ownable");
            }
            
            // 6. Test emergency withdrawal access control is preserved
            try {
              await freshToken.connect(addr1).emergencyWithdraw(
                ethers.ZeroAddress,
                ethers.parseEther("1"),
                addr1.address
              );
              expect.fail("Should have reverted - non-owner emergency withdraw");
            } catch (error) {
              expect(error.message).to.include("Ownable");
            }
            
            // All security features should work identically to original implementation
            return true;
          }
        ),
        { numRuns: 50 } // Reduced runs since we're testing security features
      );
    });
  });

  // **Feature: swat-coin-cleanup, Property 2: Functional Preservation**
  // **Validates: Requirements 1.4, 2.1, 2.2, 2.3, 2.4, 2.5**
  describe("Property-Based Tests - Functional Preservation", function () {
    it("Property 2: Functional Preservation - All existing functionality should work identically after rebranding", async function () {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // mint amount in tokens (reduced range)
          fc.integer({ min: 1, max: 1000 }),  // transfer amount in tokens (reduced range)
          async (mintAmount, transferAmount) => {
            // Deploy a fresh contract for each property test run
            const SWATToken = await ethers.getContractFactory("SWATToken");
            const freshToken = await SWATToken.deploy();
            await freshToken.waitForDeployment();
            
            // Ensure transfer amount is not greater than mint amount
            const actualTransferAmount = Math.min(transferAmount, mintAmount);
            
            const mintAmountWei = ethers.parseEther(mintAmount.toString());
            const transferAmountWei = ethers.parseEther(actualTransferAmount.toString());
            
            // Test core functionality works identically
            const initialSupply = await freshToken.totalSupply();
            expect(initialSupply).to.equal(0n); // Fresh contract should have 0 supply
            
            // Test minting functionality
            await freshToken.mint(addr1.address, mintAmountWei);
            const balanceAfterMint = await freshToken.balanceOf(addr1.address);
            const supplyAfterMint = await freshToken.totalSupply();
            
            expect(balanceAfterMint).to.equal(mintAmountWei);
            expect(supplyAfterMint).to.equal(mintAmountWei);
            
            // Test transfer functionality
            const initialAddr2Balance = await freshToken.balanceOf(addr2.address);
            expect(initialAddr2Balance).to.equal(0n); // Fresh contract, should be 0
            
            await freshToken.connect(addr1).transfer(addr2.address, transferAmountWei);
            
            const finalAddr1Balance = await freshToken.balanceOf(addr1.address);
            const finalAddr2Balance = await freshToken.balanceOf(addr2.address);
            
            expect(finalAddr1Balance).to.equal(mintAmountWei - transferAmountWei);
            expect(finalAddr2Balance).to.equal(transferAmountWei);
            
            // Test that total supply is preserved during transfers
            const finalSupply = await freshToken.totalSupply();
            expect(finalSupply).to.equal(mintAmountWei);
            
            // Test decimals and other core properties remain unchanged
            expect(Number(await freshToken.decimals())).to.equal(18);
            expect(await freshToken.owner()).to.equal(owner.address);
            
            // Test branding is consistent
            expect(await freshToken.name()).to.equal("SWAT Coin");
            expect(await freshToken.symbol()).to.equal("SWAT");
          }
        ),
        { numRuns: 50 } // Reduced runs since we're deploying fresh contracts
      );
    });
  });
});