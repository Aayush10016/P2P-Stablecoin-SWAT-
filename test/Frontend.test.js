const { expect } = require("chai");
const fc = require("fast-check");
const fs = require("fs");
const path = require("path");

describe("Frontend Compatibility", function () {
  let htmlContent;
  let jsContent;
  let cssContent;

  before(function () {
    // Read frontend files
    htmlContent = fs.readFileSync(path.join(__dirname, "../frontend/index.html"), "utf8");
    jsContent = fs.readFileSync(path.join(__dirname, "../frontend/app-swat.js"), "utf8");
    cssContent = fs.readFileSync(path.join(__dirname, "../frontend/styles.css"), "utf8");
  });

  describe("Property 4: Frontend Compatibility", function () {
    /**
     * **Feature: swat-coin-cleanup, Property 4: Frontend Compatibility**
     * **Validates: Requirements 3.2, 3.3, 3.5**
     * 
     * For any frontend interaction or wallet connection, all existing capabilities 
     * should work identically with SWAT tokens
     */
    it("should maintain consistent SWAT branding across all frontend files", function () {
      fc.assert(
        fc.property(
          fc.constantFrom("SWAT", "SWAT Coin", "swat", "Swat"),
          (brandingTerm) => {
            // Property: All branding should be consistent with SWAT
            
            // Check HTML contains SWAT branding
            const htmlHasSWAT = htmlContent.includes("SWAT");
            const htmlHasSWATCoin = htmlContent.includes("SWAT Coin");
            
            // Check JavaScript uses SWAT contract references
            const jsHasSWATContract = jsContent.includes("CONTRACT_ADDRESSES.SWAT");
            const jsHasSWATABI = jsContent.includes("SWAT_ABI");
            const jsHasSWATVariable = jsContent.includes("swatContract");
            
            // Check CSS has SWAT color scheme (blue/green)
            const cssHasBlueColor = cssContent.includes("#2563eb");
            const cssHasGreenColor = cssContent.includes("#059669");
            
            // Property: No USDT references should remain
            const htmlNoUSDT = !htmlContent.includes("USDT") || htmlContent.includes("SWAT");
            const jsNoUSDTContract = !jsContent.includes("CONTRACT_ADDRESSES.USDT");
            const jsNoUSDTABI = !jsContent.includes("USDT_ABI");
            const jsNoUSDTVariable = !jsContent.includes("usdtContract");
            
            // All conditions must be true for the property to hold
            return htmlHasSWAT && 
                   htmlHasSWATCoin && 
                   jsHasSWATContract && 
                   jsHasSWATABI && 
                   jsHasSWATVariable && 
                   cssHasBlueColor && 
                   cssHasGreenColor && 
                   htmlNoUSDT && 
                   jsNoUSDTContract && 
                   jsNoUSDTABI && 
                   jsNoUSDTVariable;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have consistent token symbol references in HTML", function () {
      // Check that all token references use SWAT
      const swatReferences = (htmlContent.match(/SWAT/g) || []).length;
      const usdtReferences = (htmlContent.match(/USDT/g) || []).length;
      
      expect(swatReferences).to.be.greaterThan(0);
      expect(usdtReferences).to.equal(0);
    });

    it("should have consistent contract references in JavaScript", function () {
      // Check that JavaScript uses SWAT contract addresses
      expect(jsContent).to.include("CONTRACT_ADDRESSES.SWAT");
      expect(jsContent).to.include("SWAT_ABI");
      expect(jsContent).to.include("swatContract");
      
      // Check that no USDT references remain
      expect(jsContent).to.not.include("CONTRACT_ADDRESSES.USDT");
      expect(jsContent).to.not.include("USDT_ABI");
      expect(jsContent).to.not.include("usdtContract");
    });

    it("should use SWAT color scheme in CSS", function () {
      // Check that CSS uses the specified SWAT colors
      expect(cssContent).to.include("#2563eb"); // Professional blue
      expect(cssContent).to.include("#059669"); // Professional green
    });

    it("should maintain all existing frontend functionality", function () {
      // Check that all essential UI elements are present
      expect(htmlContent).to.include('id="connectWallet"');
      expect(htmlContent).to.include('id="transferForm"');
      expect(htmlContent).to.include('id="createOfferForm"');
      expect(htmlContent).to.include('class="tab-btn"');
      
      // Check that JavaScript has all essential functions
      expect(jsContent).to.include("function connectWallet");
      expect(jsContent).to.include("function handleTransfer");
      expect(jsContent).to.include("function handleCreateOffer");
      expect(jsContent).to.include("function refreshPrice");
    });
  });
});