const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { getNetworkInfo, getTxUrl, waitForTx } = require("./helpers/networks");

async function main() {
  console.log("\n🪙 Starting Token Minting...\n");

  // Get network info
  const networkInfo = await getNetworkInfo();
  console.log(`📡 Network: ${networkInfo.name} (Chain ID: ${networkInfo.chainId})`);

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Minter:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "BNB\n");

  // Load deployment data
  const filename = `${networkInfo.name.replace(/\s+/g, "-").toLowerCase()}.json`;
  const filepath = path.join(__dirname, "..", "deployments", filename);

  if (!fs.existsSync(filepath)) {
    console.log(`❌ Deployment file not found: ${filepath}`);
    console.log("   Please deploy contracts first using:");
    console.log(`   npx hardhat run scripts/deploy.js --network ${hre.network.name}\n`);
    process.exit(1);
  }

  const deploymentData = JSON.parse(fs.readFileSync(filepath, "utf8"));
  const tokenAddress = deploymentData.contracts.SWATToken.address;
  
  console.log(`📂 Loaded deployment data from: ${filename}`);
  console.log(`🎯 Token Address: ${tokenAddress}\n`);

  // Connect to deployed token contract
  const SWATToken = await hre.ethers.getContractFactory("SWATToken");
  const token = SWATToken.attach(tokenAddress);

  // Check current supply
  const currentSupply = await token.totalSupply();
  console.log(`📊 Current Total Supply: ${hre.ethers.formatEther(currentSupply)} SWAT`);

  // Mint 50,000 tokens
  const mintAmount = hre.ethers.parseEther("50000");
  console.log(`\n🔨 Minting ${hre.ethers.formatEther(mintAmount)} SWAT to ${deployer.address}...`);

  try {
    const tx = await token.mint(deployer.address, mintAmount);
    console.log(`⏳ Transaction submitted: ${tx.hash}`);
    
    if (networkInfo.name !== "Hardhat Local") {
      console.log(`   Explorer: ${getTxUrl(tx.hash, networkInfo.name)}`);
    }

    const receipt = await tx.wait(2); // Wait for 2 confirmations
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    // Verify minting succeeded
    const newSupply = await token.totalSupply();
    const ownerBalance = await token.balanceOf(deployer.address);

    console.log("\n" + "=".repeat(60));
    console.log("📋 MINTING SUMMARY");
    console.log("=".repeat(60));
    console.log(`Network:          ${networkInfo.name}`);
    console.log(`Token Address:    ${tokenAddress}`);
    console.log(`Minted Amount:    ${hre.ethers.formatEther(mintAmount)} SWAT`);
    console.log(`New Total Supply: ${hre.ethers.formatEther(newSupply)} SWAT`);
    console.log(`Owner Balance:    ${hre.ethers.formatEther(ownerBalance)} SWAT`);
    console.log(`Transaction Hash: ${tx.hash}`);
    console.log("=".repeat(60) + "\n");

    // Update deployment data with minting info
    deploymentData.minting = {
      amount: hre.ethers.formatEther(mintAmount),
      recipient: deployer.address,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
    console.log("💾 Deployment data updated with minting info\n");

    console.log("✅ MINTING COMPLETE!\n");

    if (networkInfo.name !== "Hardhat Local") {
      console.log("📌 Next Steps:");
      console.log("   1. Add liquidity to PancakeSwap:");
      console.log(`      npx hardhat run scripts/addLiquidity.js --network ${hre.network.name}`);
      console.log("   2. Run demo scripts to test functionality");
      console.log();
    }

  } catch (error) {
    console.error("\n❌ Minting failed:");
    
    if (error.message.includes("Ownable: caller is not the owner")) {
      console.error("   Error: Only the contract owner can mint tokens");
      console.error(`   Current signer: ${deployer.address}`);
      console.error(`   Make sure you're using the correct private key in .env`);
    } else {
      console.error(`   ${error.message}`);
    }
    
    console.log();
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Minting script failed:");
    console.error(error);
    process.exit(1);
  });
