const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { getNetworkInfo, getAddressUrl, waitForTx } = require("./helpers/networks");

async function main() {
  console.log("\n🚀 Starting Deployment...\n");

  // Get network info
  const networkInfo = await getNetworkInfo();
  console.log(`📡 Network: ${networkInfo.name} (Chain ID: ${networkInfo.chainId})`);

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "BNB\n");

  // Deploy SWATToken
  console.log("📝 Deploying SWATToken contract...");
  const SWATToken = await hre.ethers.getContractFactory("SWATToken");
  const swatToken = await SWATToken.deploy();
  await swatToken.waitForDeployment();
  
  const tokenAddress = await swatToken.getAddress();
  console.log("✅ SWATToken deployed to:", tokenAddress);
  console.log("   Explorer:", getAddressUrl(tokenAddress, networkInfo.name));

  // Verify token details
  const name = await swatToken.name();
  const symbol = await swatToken.symbol();
  const decimals = await swatToken.decimals();
  console.log(`   Name: ${name}`);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Decimals: ${decimals}\n`);

  // Deploy Mock BUSD (for demo/testing)
  console.log("📝 Deploying Mock BUSD token (for demo)...");
  const BUSDToken = await hre.ethers.getContractFactory("SWATToken");
  const busdToken = await BUSDToken.deploy();
  await busdToken.waitForDeployment();
  
  const busdAddress = await busdToken.getAddress();
  console.log("✅ Mock BUSD deployed to:", busdAddress);
  console.log("   Explorer:", getAddressUrl(busdAddress, networkInfo.name));
  
  // Update BUSD name and symbol (we'll mint it as BUSD for demo)
  console.log("   Note: This is a mock BUSD for demo purposes\n");

  // Deploy Escrow
  console.log("📝 Deploying Escrow contract...");
  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();
  
  const escrowAddress = await escrow.getAddress();
  console.log("✅ Escrow deployed to:", escrowAddress);
  console.log("   Explorer:", getAddressUrl(escrowAddress, networkInfo.name));
  console.log();

  // Prepare deployment data
  const deploymentData = {
    network: networkInfo.name,
    chainId: networkInfo.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      SWATToken: {
        address: tokenAddress,
        name: name,
        symbol: symbol,
        decimals: Number(decimals),
      },
      BUSDToken: {
        address: busdAddress,
        name: "Binance USD (Mock)",
        symbol: "BUSD",
        decimals: 18,
      },
      Escrow: {
        address: escrowAddress,
      },
    },
  };

  // Save deployment addresses to file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `${networkInfo.name.replace(/\s+/g, "-").toLowerCase()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
  console.log("💾 Deployment data saved to:", filepath);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network:      ${networkInfo.name}`);
  console.log(`SWATToken:    ${tokenAddress}`);
  console.log(`BUSDToken:    ${busdAddress} (Mock for demo)`);
  console.log(`Escrow:       ${escrowAddress}`);
  console.log(`Deployer:     ${deployer.address}`);
  console.log("=".repeat(60) + "\n");

  console.log("✅ DEPLOYMENT COMPLETE!\n");
  
  if (networkInfo.name !== "Hardhat Local") {
    console.log("📌 Next Steps:");
    console.log("   1. Verify contracts on BSCScan:");
    console.log(`      npx hardhat run scripts/verify.js --network ${hre.network.name}`);
    console.log("   2. Mint initial token supply:");
    console.log(`      npx hardhat run scripts/mint.js --network ${hre.network.name}`);
    console.log();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
