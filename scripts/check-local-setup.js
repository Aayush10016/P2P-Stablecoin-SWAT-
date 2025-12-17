// Check local development setup
const hre = require("hardhat");

async function main() {
  console.log("\n🎉 LOCAL DEVELOPMENT SETUP\n");
  console.log("=" .repeat(60));

  // Get signers (Hardhat provides 20 accounts with 10000 ETH each!)
  const signers = await hre.ethers.getSigners();

  console.log("\n💰 Available Test Accounts (FREE!):\n");
  
  for (let i = 0; i < 5; i++) {
    const balance = await hre.ethers.provider.getBalance(signers[i].address);
    console.log(`Account ${i}: ${signers[i].address}`);
    console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH (FREE!)\n`);
  }

  console.log("=" .repeat(60));
  console.log("\n✅ You have 20 accounts, each with 10,000 ETH!");
  console.log("✅ This is completely FREE - it's fake money for testing");
  console.log("✅ Perfect for developing and testing your contracts");
  console.log("\n📝 Your main account (from .env):");
  
  const wallet = new hre.ethers.Wallet(
    process.env.PRIVATE_KEY,
    hre.ethers.provider
  );
  
  console.log(`Address: ${wallet.address}`);
  const walletBalance = await hre.ethers.provider.getBalance(wallet.address);
  console.log(`Balance: ${hre.ethers.formatEther(walletBalance)} ETH`);

  console.log("\n🚀 Ready to start development!");
  console.log("\nNext steps:");
  console.log("1. Write smart contracts in contracts/ folder");
  console.log("2. Test them with: npx hardhat test");
  console.log("3. Deploy locally with: npx hardhat run scripts/deploy.js");
  console.log("4. When ready, deploy to mainnet!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
