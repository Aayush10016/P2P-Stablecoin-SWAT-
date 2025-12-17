const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Get the pair address for two tokens
 * @param {string} tokenA - Address of first token
 * @param {string} tokenB - Address of second token
 * @param {string} factoryAddress - Address of factory contract
 * @param {boolean} isLocal - Whether we're on local network
 * @returns {Promise<string>} Pair address
 */
async function getPairAddress(tokenA, tokenB, factoryAddress, isLocal = false) {
  let factory;
  
  if (isLocal) {
    const MockFactory = await hre.ethers.getContractFactory("MockFactory");
    factory = MockFactory.attach(factoryAddress);
  } else {
    const factoryAbi = ["function getPair(address,address) external view returns (address)"];
    const [signer] = await hre.ethers.getSigners();
    factory = new hre.ethers.Contract(factoryAddress, factoryAbi, signer);
  }
  
  const pairAddress = await factory.getPair(tokenA, tokenB);
  
  if (pairAddress === hre.ethers.ZeroAddress) {
    throw new Error("Pair does not exist");
  }
  
  return pairAddress;
}

/**
 * Get reserves from a liquidity pair
 * @param {string} pairAddress - Address of the pair contract
 * @param {boolean} isLocal - Whether we're on local network
 * @returns {Promise<{reserve0: bigint, reserve1: bigint, blockTimestampLast: number}>}
 */
async function getReserves(pairAddress, isLocal = false) {
  const pairAbi = [
    "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)"
  ];
  
  const [signer] = await hre.ethers.getSigners();
  const pair = new hre.ethers.Contract(pairAddress, pairAbi, signer);
  
  const [reserve0, reserve1, blockTimestampLast] = await pair.getReserves();
  const token0 = await pair.token0();
  const token1 = await pair.token1();
  
  return {
    reserve0,
    reserve1,
    blockTimestampLast: Number(blockTimestampLast),
    token0,
    token1
  };
}

/**
 * Calculate price of tokenA in terms of tokenB
 * @param {string} tokenA - Address of token to price
 * @param {string} tokenB - Address of quote token
 * @param {string} pairAddress - Address of the pair
 * @param {boolean} isLocal - Whether we're on local network
 * @returns {Promise<{price: string, priceNumber: number, reserve0: string, reserve1: string}>}
 */
async function calculatePrice(tokenA, tokenB, pairAddress, isLocal = false) {
  const reserves = await getReserves(pairAddress, isLocal);
  
  // Determine which reserve corresponds to which token
  let reserveA, reserveB;
  if (reserves.token0.toLowerCase() === tokenA.toLowerCase()) {
    reserveA = reserves.reserve0;
    reserveB = reserves.reserve1;
  } else {
    reserveA = reserves.reserve1;
    reserveB = reserves.reserve0;
  }
  
  // Calculate price: price = reserveB / reserveA
  // Convert to ether for readability
  const reserveAEther = parseFloat(hre.ethers.formatEther(reserveA));
  const reserveBEther = parseFloat(hre.ethers.formatEther(reserveB));
  
  if (reserveAEther === 0) {
    throw new Error("Reserve A is zero - cannot calculate price");
  }
  
  const priceNumber = reserveBEther / reserveAEther;
  const price = priceNumber.toFixed(6);
  
  return {
    price,
    priceNumber,
    reserve0: hre.ethers.formatEther(reserves.reserve0),
    reserve1: hre.ethers.formatEther(reserves.reserve1),
    token0: reserves.token0,
    token1: reserves.token1,
    reserveA: hre.ethers.formatEther(reserveA),
    reserveB: hre.ethers.formatEther(reserveB)
  };
}

/**
 * Verify that price is approximately $1 (within tolerance)
 * @param {number} price - The calculated price
 * @param {number} tolerance - Acceptable deviation (default 0.02 = 2%)
 * @returns {boolean} True if price is within tolerance
 */
function verifyPriceStability(price, tolerance = 0.02) {
  const targetPrice = 1.0;
  const lowerBound = targetPrice * (1 - tolerance);
  const upperBound = targetPrice * (1 + tolerance);
  
  return price >= lowerBound && price <= upperBound;
}

/**
 * Get complete price information for USDT/BUSD pair
 * @param {string} networkName - Name of the network
 * @returns {Promise<object>} Complete price information
 */
async function getUSDTPriceInfo(networkName = null) {
  // Load deployment data
  if (!networkName) {
    const network = await hre.ethers.provider.getNetwork();
    networkName = network.chainId === 1337n ? "hardhat-local" : 
                  network.chainId === 97n ? "bsc-testnet" : 
                  network.chainId === 56n ? "bsc-mainnet" : "hardhat-local";
  }
  
  const filename = `${networkName}.json`;
  const filepath = path.join(__dirname, "..", "..", "deployments", filename);
  
  if (!fs.existsSync(filepath)) {
    throw new Error(`Deployment file not found: ${filepath}`);
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(filepath, "utf8"));
  
  if (!deploymentData.liquidity) {
    throw new Error("Liquidity data not found in deployment file. Please run addLiquidity.js first.");
  }
  
  const usdtAddress = deploymentData.contracts.USDTToken.address;
  const busdAddress = deploymentData.liquidity.busdAddress;
  const pairAddress = deploymentData.liquidity.pairAddress;
  const isLocal = networkName === "hardhat-local";
  
  // Get factory address
  let factoryAddress;
  if (isLocal && deploymentData.liquidity.mockContracts) {
    factoryAddress = deploymentData.liquidity.mockContracts.factory;
  } else {
    // For real networks, get factory from router
    const routerAbi = ["function factory() external view returns (address)"];
    const [signer] = await hre.ethers.getSigners();
    const router = new hre.ethers.Contract(deploymentData.liquidity.routerAddress, routerAbi, signer);
    factoryAddress = await router.factory();
  }
  
  // Calculate price
  const priceInfo = await calculatePrice(usdtAddress, busdAddress, pairAddress, isLocal);
  const isStable = verifyPriceStability(priceInfo.priceNumber);
  
  return {
    network: networkName,
    usdtAddress,
    busdAddress,
    pairAddress,
    factoryAddress,
    price: priceInfo.price,
    priceNumber: priceInfo.priceNumber,
    reserves: {
      token0: priceInfo.token0,
      token1: priceInfo.token1,
      reserve0: priceInfo.reserve0,
      reserve1: priceInfo.reserve1,
      reserveUSDT: priceInfo.reserveA,
      reserveBUSD: priceInfo.reserveB
    },
    isStable,
    deviation: Math.abs(priceInfo.priceNumber - 1.0),
    deviationPercent: (Math.abs(priceInfo.priceNumber - 1.0) * 100).toFixed(2) + "%"
  };
}

module.exports = {
  getPairAddress,
  getReserves,
  calculatePrice,
  verifyPriceStability,
  getUSDTPriceInfo
};
