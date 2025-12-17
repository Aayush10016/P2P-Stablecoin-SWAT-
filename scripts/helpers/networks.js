// Network helper functions

/**
 * Get current network information
 */
async function getNetworkInfo() {
  const hre = require("hardhat");
  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId;
  
  let networkName = "Unknown";
  if (chainId === 97n) networkName = "BSC Testnet";
  else if (chainId === 56n) networkName = "BSC Mainnet";
  else if (chainId === 1337n) networkName = "Hardhat Local";
  
  return {
    name: networkName,
    chainId: chainId.toString(),
  };
}

/**
 * Get block explorer URL for the current network
 */
function getExplorerUrl(network) {
  const explorers = {
    "BSC Testnet": "https://testnet.bscscan.com",
    "BSC Mainnet": "https://bscscan.com",
  };
  return explorers[network] || "";
}

/**
 * Get transaction URL
 */
function getTxUrl(txHash, network) {
  const baseUrl = getExplorerUrl(network);
  return baseUrl ? `${baseUrl}/tx/${txHash}` : "";
}

/**
 * Get address URL
 */
function getAddressUrl(address, network) {
  const baseUrl = getExplorerUrl(network);
  return baseUrl ? `${baseUrl}/address/${address}` : "";
}

/**
 * Wait for transaction confirmation
 */
async function waitForTx(tx, confirmations = 2) {
  console.log(`⏳ Waiting for transaction: ${tx.hash}`);
  const receipt = await tx.wait(confirmations);
  console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
  return receipt;
}

/**
 * Get gas price for network
 */
async function getGasPrice() {
  const hre = require("hardhat");
  const feeData = await hre.ethers.provider.getFeeData();
  return feeData.gasPrice;
}

/**
 * Format BNB amount
 */
function formatBNB(amount) {
  const hre = require("hardhat");
  return hre.ethers.formatEther(amount);
}

/**
 * Parse BNB amount
 */
function parseBNB(amount) {
  const hre = require("hardhat");
  return hre.ethers.parseEther(amount.toString());
}

module.exports = {
  getNetworkInfo,
  getExplorerUrl,
  getTxUrl,
  getAddressUrl,
  waitForTx,
  getGasPrice,
  formatBNB,
  parseBNB,
};
