# P2P Stablecoin Trading Platform

A decentralized peer-to-peer (P2P) trading platform for stablecoins built on Ethereum-compatible blockchains. Features secure escrow trading, BEP20 token implementation, and a modern web interface with wallet integration.

## 🌟 Features

- **SWAT Stablecoin (BEP20)** - Fully compliant ERC20/BEP20 token with 18 decimals
- **Secure P2P Escrow** - Trustless peer-to-peer trading with automated settlement
- **Web3 Wallet Integration** - Works with MetaMask, TrustWallet, and other Web3 wallets
- **Modern Frontend** - Clean, responsive UI for seamless trading experience
- **Liquidity Pool Integration** - Price discovery through DEX integration
- **Production Ready** - Comprehensive test suite and security features

## 📋 Project Structure

```
├── contracts/              # Smart contracts
│   ├── SWATToken.sol      # Main stablecoin token
│   ├── Escrow.sol         # P2P trading escrow
│   └── mocks/             # Mock contracts for testing
├── scripts/               # Deployment and utility scripts
│   ├── deploy.js          # Contract deployment
│   ├── mint.js            # Token minting
│   └── addLiquidity.js    # DEX liquidity setup
├── test/                  # Comprehensive test suite
├── frontend/              # Web application
│   ├── index.html         # Main UI
│   ├── app.js             # Application logic
│   └── styles.css         # Styling
└── hardhat.config.js      # Hardhat configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js v16 or higher
- MetaMask or TrustWallet browser extension
- Git

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd <project-folder>

# Install dependencies
npm install
```

### Running Locally

#### 1. Start Local Blockchain

Open a terminal and run:

```bash
npx hardhat node
```

Keep this terminal running. You'll see test accounts with addresses and private keys.

#### 2. Deploy Contracts

Open a new terminal and run:

```bash
# Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# Mint tokens
npx hardhat run scripts/mint.js --network localhost
```

Copy the deployed contract addresses from the output.

#### 3. Update Frontend Configuration

Edit `frontend/app.js` and update the contract addresses (lines 2-9):

```javascript
let CONTRACT_ADDRESSES = {
    USDT: '0x...', // Your SWAT token address
    BUSD: '0x...', // Your BUSD token address
    Escrow: '0x...', // Your Escrow contract address
    // ... etc
};
```

#### 4. Start Frontend Server

```bash
npx http-server frontend -p 8080
```

Or use the batch files (Windows):
- Double-click `1-start-node.bat`
- Double-click `2-deploy-and-mint.bat`
- Double-click `3-start-frontend.bat`

#### 5. Configure Wallet

1. Add Hardhat Local Network to MetaMask:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`

2. Import test account from Step 1 output:
   - Account #0 Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

3. Open `http://127.0.0.1:8080` and connect your wallet

## 🧪 Testing

Run the complete test suite:

```bash
npx hardhat test
```

Run specific tests:

```bash
# Token tests
npx hardhat test test/SWATToken.test.js

# Escrow tests
npx hardhat test test/Escrow.test.js
```

## 📦 Smart Contracts

### SWATToken.sol

BEP20-compliant stablecoin with:
- 18 decimal precision
- Owner-controlled minting
- Pausable transfers
- 100 million supply cap
- Emergency withdrawal

### Escrow.sol

Secure P2P trading escrow with:
- Buyer-seller matching
- Automatic settlement
- Offer cancellation
- Rate limiting
- Platform fees (configurable)

## 🔐 Security Features

- ✅ Pausable contracts for emergency stops
- ✅ Access control (owner-only functions)
- ✅ Reentrancy protection
- ✅ Supply cap enforcement
- ✅ Comprehensive test coverage
- ✅ Rate limiting on offers

## 🌐 Deployment

### BSC Testnet

```bash
# Configure .env file
cp .env.example .env
# Add your PRIVATE_KEY and BSC_TESTNET_RPC

# Deploy to testnet
npx hardhat run scripts/deploy.js --network bscTestnet

# Verify contracts
npx hardhat run scripts/verify.js --network bscTestnet
```

### BSC Mainnet

```bash
# Configure .env with mainnet credentials
# Deploy to mainnet
npx hardhat run scripts/deploy.js --network bscMainnet
```

**Estimated Gas Cost:** ~0.002 BNB (~$1.50 USD)

## 🛠️ Development

### Compile Contracts

```bash
npx hardhat compile
```

### Clean Build

```bash
npx hardhat clean
npx hardhat compile
```

## 💡 Usage Examples

### Create a P2P Offer

1. Connect wallet with SWAT tokens
2. Navigate to "P2P Trading" tab
3. Enter amount and price in BUSD
4. Enter buyer address
5. Approve tokens and create offer

### Accept an Offer

1. Connect wallet with BUSD tokens
2. View available offers
3. Click "Accept Offer"
4. Approve BUSD spending
5. Receive SWAT tokens automatically

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions:
- Check existing documentation
- Review test files for usage examples
- Open an issue on GitHub

## 🔗 Links

- **Documentation:** See inline code comments
- **Tests:** `test/` directory
- **Frontend:** `frontend/` directory

---

**Built with:** Hardhat, Solidity 0.8.20, ethers.js, and modern web technologies
