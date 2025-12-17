const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { getNetworkInfo, getAddressUrl } = require("./helpers/networks");

async function verifyContract(address, constructorArgs = []) {
  try {
    console.log(`⏳ Verifying contract at ${address}...`);
    
    // Use hardhat-verify plugin if available
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: constructorArgs,
      });
      console.log(`✅ Contract verified successfully!`);
      return true;
    } catch (verifyError) {
      // Check if it's already verified
      if (verifyError.message && verifyError.message.includes("Already Verified")) {
        console.log(`ℹ️  Contract already verified`);
        return true;
      }
      throw verifyError;
    }
  } catch (error) {
    if (error.message && error.message.includes("does not have bytecode")) {
      console.log(`❌ Contract not found at address (may need to wait for block confirmation)`);
      return false;
    } else if (error.message && error.message.includes("verify:verify")) {
      console.log(`⚠️  Verification plugin not available`);
      console.log(`   Please verify manually on BSCScan using the contract source code`);
      return false;
    } else {
      console.log(`⚠️  Verification failed: ${error.message || error}`);
      return false;
    }
  }
}

async function main() {
  console.log("\n🔍 Starting Contract Verification...\n");

  // Get network info
  const networkInfo = await getNetworkInfo();
  console.log(`📡 Network: ${networkInfo.name} (Chain ID: ${networkInfo.chainId})`);

  // Check if we're on a verifiable network
  if (networkInfo.name === "Hardhat Local") {
    console.log("⚠️  Cannot verify contracts on local Hardhat network");
    console.log("   Please deploy to BSC Testnet or Mainnet first\n");
    process.exit(0);
  }

  // Check for BSCScan API key
  if (!process.env.BSCSCAN_API_KEY) {
    console.log("⚠️  BSCSCAN_API_KEY not found in .env file");
    console.log("   Please add your BSCScan API key to continue\n");
    process.exit(1);
  }

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
  console.log(`📂 Loaded deployment data from: ${filename}\n`);

  // Verify SWATToken
  console.log("=" .repeat(60));
  console.log("Verifying SWATToken Contract");
  console.log("=".repeat(60));
  console.log(`Address: ${deploymentData.contracts.SWATToken.address}`);
  console.log(`Explorer: ${getAddressUrl(deploymentData.contracts.SWATToken.address, networkInfo.name)}`);
  console.log();

  const tokenVerified = await verifyContract(
    deploymentData.contracts.SWATToken.address,
    [] // No constructor arguments
  );
  console.log();

  // Verify Escrow
  console.log("=".repeat(60));
  console.log("Verifying Escrow Contract");
  console.log("=".repeat(60));
  console.log(`Address: ${deploymentData.contracts.Escrow.address}`);
  console.log(`Explorer: ${getAddressUrl(deploymentData.contracts.Escrow.address, networkInfo.name)}`);
  console.log();

  const escrowVerified = await verifyContract(
    deploymentData.contracts.Escrow.address,
    [] // No constructor arguments
  );
  console.log();

  // Summary
  console.log("=".repeat(60));
  console.log("📋 VERIFICATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network:      ${networkInfo.name}`);
  console.log(`SWATToken:    ${tokenVerified ? "✅ Verified" : "❌ Failed"}`);
  console.log(`Escrow:       ${escrowVerified ? "✅ Verified" : "❌ Failed"}`);
  console.log("=".repeat(60) + "\n");

  if (tokenVerified && escrowVerified) {
    console.log("✅ ALL CONTRACTS VERIFIED SUCCESSFULLY!\n");
    console.log("📌 Next Steps:");
    console.log("   1. Mint initial token supply:");
    console.log(`      npx hardhat run scripts/mint.js --network ${hre.network.name}`);
    console.log();
  } else {
    console.log("⚠️  Some contracts failed verification");
    console.log("   This may be due to:");
    console.log("   - Network delays (try again in a few minutes)");
    console.log("   - Invalid BSCScan API key");
    console.log("   - Compiler version mismatch\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification script failed:");
    console.error(error);
    process.exit(1);
  });
