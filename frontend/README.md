# USDT Token Frontend - User Guide

## 🚀 Quick Start

### Prerequisites
1. **MetaMask** browser extension installed
2. **Local Hardhat node** running
3. **Contracts deployed** on local Hardhat

### Setup Steps

#### 1. Start Hardhat Node
Open a terminal and run:
```bash
npx hardhat node
```
Keep this terminal running!

#### 2. Deploy Contracts
In a new terminal, run:
```bash
npx hardhat run scripts/complete-local-flow.js --network localhost
```

This will deploy all contracts and set up the system.

#### 3. Configure MetaMask

**Add Hardhat Network:**
- Network Name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `1337`
- Currency Symbol: `ETH`

**Import Test Account:**
- Go to MetaMask → Import Account
- Paste this private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- This is the default Hardhat account #0 with 10,000 ETH

#### 4. Open Frontend
Simply open `index.html` in your browser (Chrome/Firefox recommended)

Or use a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server
```

Then visit: `http://localhost:8000`

---

## 📱 Using the Frontend

### Connect Wallet
1. Click "Connect Wallet" button
2. MetaMask will pop up
3. Select your Hardhat account
4. Approve the connection

### Transfer USDT
1. Go to "Transfer" tab
2. Enter recipient address (use another Hardhat account)
3. Enter amount
4. Click "Send USDT"
5. Confirm in MetaMask

### P2P Trading (Escrow)
1. Go to "P2P Trade" tab
2. Fill in:
   - Amount of USDT to sell
   - Price in BUSD
   - Buyer's address
3. Click "Create Offer"
4. Approve token spending in MetaMask
5. Confirm offer creation

### Check Price
1. Go to "Price Info" tab
2. View current USDT/BUSD price
3. See liquidity pool reserves
4. Click "Refresh Price" to update

---

## 🎥 Recording Demo Video

### Recommended Flow:

1. **Show Connection**
   - Open frontend
   - Connect MetaMask
   - Show wallet address and balance

2. **Demonstrate Transfer**
   - Transfer 100 USDT to another address
   - Show transaction confirmation
   - Show updated balance

3. **Show P2P Trading**
   - Create an escrow offer
   - Show offer in the list
   - Explain how buyer would accept

4. **Display Price Info**
   - Show current price ($1.00)
   - Show liquidity reserves
   - Explain price stability

5. **Highlight Key Points**
   - Only $140 invested
   - 50,000 tokens created
   - Professional interface
   - Real-time blockchain interaction

---

## 🔧 Troubleshooting

### "Please install MetaMask"
- Install MetaMask browser extension
- Refresh the page

### "Please connect to Hardhat Local Network"
- Make sure Hardhat node is running
- Check MetaMask is on Chain ID 1337
- Verify RPC URL is `http://127.0.0.1:8545`

### "Transaction Failed"
- Make sure you have enough USDT balance
- Check you're using the correct account
- Verify contracts are deployed

### Contract Addresses Not Working
- The frontend uses default Hardhat deployment addresses
- If you redeployed, update addresses in `app.js`:
  ```javascript
  let CONTRACT_ADDRESSES = {
      USDT: 'YOUR_NEW_ADDRESS',
      Escrow: 'YOUR_NEW_ADDRESS',
      // ...
  };
  ```

### Balance Shows 0
- Make sure you minted tokens
- Run: `npx hardhat run scripts/mint.js --network localhost`
- Refresh the frontend

---

## 📋 Features Demonstrated

✅ **Wallet Connection** - MetaMask integration
✅ **Token Balance** - Real-time balance display
✅ **Transfers** - Send USDT to any address
✅ **P2P Trading** - Create and manage escrow offers
✅ **Price Display** - Live price from liquidity pool
✅ **Transaction Status** - Success/error messages
✅ **Professional UI** - Looks like real USDT platforms

---

## 💡 Tips for Employer Demo

1. **Prepare Multiple Accounts**
   - Import 2-3 Hardhat accounts in MetaMask
   - Show transfers between them

2. **Highlight Capital Efficiency**
   - Point out only $140 invested
   - Show 50,000 tokens exist
   - Explain 357:1 efficiency ratio

3. **Show Price Stability**
   - Demonstrate $1.00 price
   - Explain liquidity pool mechanism

4. **Emphasize Professional Quality**
   - Modern, clean interface
   - Real blockchain interaction
   - Production-ready code

5. **Explain Next Steps**
   - This works on local Hardhat
   - Ready for BSC Mainnet deployment
   - Only needs $150 for mainnet

---

## 🎬 Screen Recording Tips

- Use OBS Studio or Loom for recording
- Record in 1080p for clarity
- Show browser console for transaction logs
- Zoom in on important parts
- Add voiceover explaining each step
- Keep video under 5 minutes

---

## 📞 Support

If you encounter issues:
1. Check Hardhat node is running
2. Verify MetaMask network settings
3. Ensure contracts are deployed
4. Check browser console for errors

---

**Ready to impress your employer! 🚀**
