const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { getNetworkInfo, getAddressUrl } = require("./helpers/networks");

/**
 * PancakeSwap Router Addresses
 * Mainnet: 0x10ED43C718714eb63d5aA57B78B54704E256024E
 * Testnet: 0xD99D1c33F9fC3444f8101754aBC46c52416550D1
 */
const PANCAKESWAP_ROUTER = {
  bscMainnet: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  bscTestnet: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
};

/**
 * BUSD Token Addresses
 * Mainnet: 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
 * Testnet: 0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee
 */
const BUSD_ADDRESS = {
  bscMainnet: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  bscTestnet: "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee",
};

async function main() {
  console.log("\n💧 Starting Liquidity Addition...\n");

  // Get network info
  const networkInfo = await getNetworkInfo();
  console.log(`📡 Network: ${networkInfo.name} (Chain ID: ${networkInfo.chainId})`);

  // Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log("👤 Signer:", signer.address);
  
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "BNB\n");

  // Load deployment data
  const filename = `${networkInfo.name.replace(/\s+/g, "-").toLowerCase()}.json`;
  const filepath = path.join(__dirname, "..", "deployments", filename);
  
  if (!fs.existsSync(filepath)) {
    throw new Error(`Deployment file not found: ${filepath}\nPlease run deploy.js first.`);
  }

  const deploymentData = JSON.parse(fs.readFileSync(filepath, "utf8"));
  const swatAddress = deploymentData.contracts.SWATToken.address;
  
  console.log("📄 Loaded deployment data:");
  console.log("   SWAT Token:", swatAddress);
  console.log();

  // Determine if we're on local Hardhat or real network
  const isLocalNetwork = networkInfo.name === "Hardhat Local";
  
  let routerAddress, busdAddress, factoryAddress;
  let router, busd, swat;

  if (isLocalNetwork) {
    console.log("🏠 Local Hardhat Network Detected");
    console.log("   Deploying mock PancakeSwap contracts...\n");

    // Deploy mock contracts
    console.log("📝 Deploying MockFactory...");
    const MockFactory = await hre.ethers.getContractFactory("MockFactory");
    const factory = await MockFactory.deploy();
    await factory.waitForDeployment();
    factoryAddress = await factory.getAddress();
    console.log("✅ MockFactory deployed:", factoryAddress);

    console.log("📝 Deploying MockRouter...");
    const MockRouter = await hre.ethers.getContractFactory("MockRouter");
    const mockRouter = await MockRouter.deploy(factoryAddress);
    await mockRouter.waitForDeployment();
    routerAddress = await mockRouter.getAddress();
    console.log("✅ MockRouter deployed:", routerAddress);

    console.log("📝 Deploying MockBUSD...");
    const MockBUSD = await hre.ethers.getContractFactory("MockBUSD");
    const mockBusd = await MockBUSD.deploy();
    await mockBusd.waitForDeployment();
    busdAddress = await mockBusd.getAddress();
    console.log("✅ MockBUSD deployed:", busdAddress);
    console.log();

    router = mockRouter;
    busd = mockBusd;
  } else {
    console.log("🌐 Real Network Detected");
    console.log("   Using PancakeSwap contracts...\n");

    // Use real PancakeSwap addresses
    const networkKey = networkInfo.name === "BSC Testnet" ? "bscTestnet" : "bscMainnet";
    routerAddress = PANCAKESWAP_ROUTER[networkKey];
    busdAddress = BUSD_ADDRESS[networkKey];

    console.log("📄 PancakeSwap Router:", routerAddress);
    console.log("📄 BUSD Token:", busdAddress);
    console.log();

    // Get router contract
    const routerAbi = [
      "function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) external returns (uint256,uint256,uint256)",
      "function factory() external view returns (address)"
    ];
    router = new hre.ethers.Contract(routerAddress, routerAbi, signer);
    
    // Get BUSD contract
    const erc20Abi = [
      "function approve(address,uint256) external returns (bool)",
      "function balanceOf(address) external view returns (uint256)",
      "function decimals() external view returns (uint8)"
    ];
    busd = new hre.ethers.Contract(busdAddress, erc20Abi, signer);
  }

  // Get SWAT contract
  const SWATToken = await hre.ethers.getContractFactory("SWATToken");
  swat = SWATToken.attach(swatAddress);

  // Check balances
  const swatBalance = await swat.balanceOf(signer.address);
  const busdBalance = await busd.balanceOf(signer.address);
  
  console.log("💼 Current Balances:");
  console.log("   SWAT:", hre.ethers.formatEther(swatBalance));
  console.log("   BUSD:", hre.ethers.formatEther(busdBalance));
  console.log();

  // Define liquidity amounts
  const swatAmount = hre.ethers.parseEther("140"); // 140 SWAT
  const busdAmount = hre.ethers.parseEther("140"); // $140 BUSD
  
  // Calculate minimum amounts (1% slippage tolerance)
  const swatMin = (swatAmount * 99n) / 100n;
  const busdMin = (busdAmount * 99n) / 100n;
  
  // Set deadline (20 minutes from now)
  const deadline = Math.floor(Date.now() / 1000) + 1200;

  console.log("💧 Liquidity Parameters:");
  console.log("   SWAT Amount:", hre.ethers.formatEther(swatAmount));
  console.log("   BUSD Amount:", hre.ethers.formatEther(busdAmount));
  console.log("   SWAT Min:", hre.ethers.formatEther(swatMin));
  console.log("   BUSD Min:", hre.ethers.formatEther(busdMin));
  console.log("   Slippage Tolerance: 1%");
  console.log("   Deadline:", new Date(deadline * 1000).toLocaleString());
  console.log();

  // Check if we have enough tokens
  if (swatBalance < swatAmount) {
    throw new Error(`Insufficient SWAT balance. Have: ${hre.ethers.formatEther(swatBalance)}, Need: ${hre.ethers.formatEther(swatAmount)}`);
  }
  if (busdBalance < busdAmount) {
    throw new Error(`Insufficient BUSD balance. Have: ${hre.ethers.formatEther(busdBalance)}, Need: ${hre.ethers.formatEther(busdAmount)}`);
  }

  // Approve Router to spend SWAT
  console.log("🔓 Approving Router to spend SWAT...");
  const swatApproveTx = await swat.approve(routerAddress, swatAmount);
  await swatApproveTx.wait();
  console.log("✅ SWAT approved");
  console.log("   Tx:", swatApproveTx.hash);

  // Approve Router to spend BUSD
  console.log("🔓 Approving Router to spend BUSD...");
  const busdApproveTx = await busd.approve(routerAddress, busdAmount);
  await busdApproveTx.wait();
  console.log("✅ BUSD approved");
  console.log("   Tx:", busdApproveTx.hash);
  console.log();

  // Add liquidity
  console.log("💧 Adding liquidity to pool...");
  const addLiquidityTx = await router.addLiquidity(
    swatAddress,
    busdAddress,
    swatAmount,
    busdAmount,
    swatMin,
    busdMin,
    signer.address,
    deadline
  );
  
  console.log("⏳ Waiting for transaction confirmation...");
  const receipt = await addLiquidityTx.wait();
  console.log("✅ Liquidity added successfully!");
  console.log("   Tx:", addLiquidityTx.hash);
  
  if (!isLocalNetwork) {
    console.log("   Explorer:", getAddressUrl(addLiquidityTx.hash, networkInfo.name, "tx"));
  }
  console.log();

  // Get pair address
  let pairAddress;
  if (isLocalNetwork) {
    const MockFactory = await hre.ethers.getContractFactory("MockFactory");
    const factory = MockFactory.attach(factoryAddress);
    pairAddress = await factory.getPair(swatAddress, busdAddress);
  } else {
    const factoryAddress = await router.factory();
    const factoryAbi = ["function getPair(address,address) external view returns (address)"];
    const factory = new hre.ethers.Contract(factoryAddress, factoryAbi, signer);
    pairAddress = await factory.getPair(swatAddress, busdAddress);
  }

  console.log("🔗 Liquidity Pool Created:");
  console.log("   Pair Address:", pairAddress);
  if (!isLocalNetwork) {
    console.log("   Explorer:", getAddressUrl(pairAddress, networkInfo.name));
  }
  console.log();

  // Get LP token balance
  const pairAbi = ["function balanceOf(address) external view returns (uint256)"];
  const pair = new hre.ethers.Contract(pairAddress, pairAbi, signer);
  const lpBalance = await pair.balanceOf(signer.address);
  
  console.log("🎫 LP Tokens Received:", hre.ethers.formatEther(lpBalance));
  console.log();

  // Update deployment data with liquidity info
  deploymentData.liquidity = {
    routerAddress,
    busdAddress,
    pairAddress,
    swatAmount: hre.ethers.formatEther(swatAmount),
    busdAmount: hre.ethers.formatEther(busdAmount),
    lpTokens: hre.ethers.formatEther(lpBalance),
    timestamp: new Date().toISOString(),
    transactionHash: addLiquidityTx.hash,
  };

  if (isLocalNetwork) {
    deploymentData.liquidity.mockContracts = {
      factory: factoryAddress,
      router: routerAddress,
      busd: busdAddress,
    };
  }

  fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
  console.log("💾 Deployment data updated with liquidity info");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 LIQUIDITY ADDITION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network:        ${networkInfo.name}`);
  console.log(`SWAT Token:     ${swatAddress}`);
  console.log(`BUSD Token:     ${busdAddress}`);
  console.log(`Router:         ${routerAddress}`);
  console.log(`Pair Address:   ${pairAddress}`);
  console.log(`SWAT Added:     ${hre.ethers.formatEther(swatAmount)}`);
  console.log(`BUSD Added:     ${hre.ethers.formatEther(busdAmount)}`);
  console.log(`LP Tokens:      ${hre.ethers.formatEther(lpBalance)}`);
  console.log(`Initial Price:  $${(parseFloat(hre.ethers.formatEther(busdAmount)) / parseFloat(hre.ethers.formatEther(swatAmount))).toFixed(4)} per SWAT`);
  console.log("=".repeat(60) + "\n");

  console.log("✅ LIQUIDITY ADDITION COMPLETE!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Liquidity addition failed:");
    console.error(error);
    process.exit(1);
  });
