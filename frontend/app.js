// Contract addresses (from complete-demo-setup.js deployment)
let CONTRACT_ADDRESSES = {
    USDT: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    BUSD: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    Escrow: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    MockFactory: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    MockRouter: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    MockBUSD: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' // Same as BUSD
};

// Contract ABIs
const USDT_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const ESCROW_ABI = [
    "function createOffer(address tokenAddress, uint256 amount, uint256 priceInBUSD, address buyer) returns (uint256)",
    "function acceptOffer(uint256 offerId, address busdAddress)",
    "function cancelOffer(uint256 offerId)",
    "function getOffer(uint256 offerId) view returns (tuple(uint256 id, address seller, address buyer, address tokenAddress, uint256 amount, uint256 priceInBUSD, bool active, uint256 createdAt))",
    "function getOfferCount() view returns (uint256)",
    "event OfferCreated(uint256 indexed offerId, address indexed seller, address indexed buyer, address tokenAddress, uint256 amount, uint256 priceInBUSD)",
    "event OfferAccepted(uint256 indexed offerId, address indexed seller, address indexed buyer, uint256 amount, uint256 priceInBUSD)",
    "event OfferCancelled(uint256 indexed offerId, address indexed seller)"
];

const FACTORY_ABI = [
    "function getPair(address tokenA, address tokenB) view returns (address)"
];

const PAIR_ABI = [
    "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function token0() view returns (address)",
    "function token1() view returns (address)"
];

// Global variables
let provider;
let signer;
let userAddress;
let usdtContract;
let escrowContract;
let factoryContract;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkWalletConnection();
});

function setupEventListeners() {
    // Connect wallet
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    
    // Disconnect wallet
    document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', refreshData);

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Transfer form
    document.getElementById('transferForm').addEventListener('submit', handleTransfer);
    document.getElementById('maxBtn').addEventListener('click', setMaxAmount);

    // Escrow form
    document.getElementById('createOfferForm').addEventListener('submit', handleCreateOffer);

    // Price refresh
    document.getElementById('refreshPrice').addEventListener('click', refreshPrice);
}

async function checkWalletConnection() {
    // Disabled auto-connect - user must click "Connect Wallet" button
    // This gives better control and prevents automatic connections
    console.log('Wallet connection ready. Click "Connect Wallet" to connect.');
}

async function connectWallet() {
    // Check for any Web3 provider (MetaMask, Trust Wallet, etc.)
    if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask or Trust Wallet to use this application!\n\nFor Trust Wallet: Open this page in Trust Wallet browser.');
        return;
    }

    try {
        showLoading();

        // Detect wallet type
        const isTrustWallet = window.ethereum.isTrust || window.ethereum.isTrustWallet;
        const isMetaMask = window.ethereum.isMetaMask;
        
        console.log('Wallet detected:', isTrustWallet ? 'Trust Wallet' : isMetaMask ? 'MetaMask' : 'Unknown');

        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Create provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();

        // Check network
        const network = await provider.getNetwork();
        console.log('Connected to network:', network);
        console.log('Chain ID:', network.chainId);

        if (network.chainId !== 1337 && network.chainId !== 31337) {
            // Try to switch to Hardhat network automatically
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x539' }] // 1337 in hex
                });
                // Reload provider after switch
                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
            } catch (switchError) {
                // If network doesn't exist, try to add it
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x539',
                                chainName: 'Hardhat Local',
                                rpcUrls: ['http://127.0.0.1:8545'],
                                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
                            }]
                        });
                        // Reload provider after adding
                        provider = new ethers.providers.Web3Provider(window.ethereum);
                        signer = provider.getSigner();
                    } catch (addError) {
                        alert('Failed to add Hardhat network. Please add it manually.');
                        hideLoading();
                        return;
                    }
                } else {
                    alert(`Wrong network! Please switch to Hardhat Local Network (Chain ID: 1337)`);
                    hideLoading();
                    return;
                }
            }
        }

        // Initialize contracts
        usdtContract = new ethers.Contract(CONTRACT_ADDRESSES.USDT, USDT_ABI, signer);
        escrowContract = new ethers.Contract(CONTRACT_ADDRESSES.Escrow, ESCROW_ABI, signer);
        factoryContract = new ethers.Contract(CONTRACT_ADDRESSES.MockFactory, FACTORY_ABI, provider);

        // Update UI
        document.getElementById('connectWallet').style.display = 'none';
        document.getElementById('disconnectWallet').style.display = 'block';
        document.getElementById('userAddress').textContent = formatAddress(userAddress);
        document.getElementById('walletInfo').style.display = 'flex';

        // Load data
        await refreshData();

        hideLoading();
        showStatus('success', 'Wallet connected successfully!', 'transferStatus');

    } catch (error) {
        console.error('Error connecting wallet:', error);
        hideLoading();
        alert('Failed to connect wallet: ' + error.message);
    }
}

function disconnectWallet() {
    // Clear all wallet data
    provider = null;
    signer = null;
    userAddress = null;
    usdtContract = null;
    escrowContract = null;
    factoryContract = null;

    // Update UI
    document.getElementById('connectWallet').style.display = 'block';
    document.getElementById('disconnectWallet').style.display = 'none';
    document.getElementById('walletInfo').style.display = 'none';
    
    // Clear displayed data
    document.getElementById('userBalance').textContent = '0.00 USDT';
    document.getElementById('yourBalance').textContent = '0 USDT';
    document.getElementById('totalSupply').textContent = '0';
    document.getElementById('availableBalance').textContent = '0';

    console.log('Wallet disconnected');
    showStatus('info', 'Wallet disconnected. Click "Connect Wallet" to reconnect.', 'transferStatus');
}

async function refreshData() {
    if (!usdtContract) {
        console.log('USDT contract not initialized');
        return;
    }

    try {
        console.log('Refreshing data for address:', userAddress);
        console.log('USDT Contract address:', CONTRACT_ADDRESSES.USDT);
        
        // Get balance
        const balance = await usdtContract.balanceOf(userAddress);
        console.log('Raw balance:', balance.toString());
        const formattedBalance = ethers.utils.formatEther(balance);
        console.log('Formatted balance:', formattedBalance);

        document.getElementById('userBalance').textContent = parseFloat(formattedBalance).toFixed(2) + ' USDT';
        document.getElementById('yourBalance').textContent = parseFloat(formattedBalance).toFixed(2) + ' USDT';
        document.getElementById('availableBalance').textContent = parseFloat(formattedBalance).toFixed(2);

        // Get total supply
        const totalSupply = await usdtContract.totalSupply();
        console.log('Total supply:', ethers.utils.formatEther(totalSupply));
        const formattedSupply = ethers.utils.formatEther(totalSupply);
        document.getElementById('totalSupply').textContent = parseFloat(formattedSupply).toLocaleString() + ' USDT';

        // Load offers
        await loadOffers();

        // Load price
        await refreshPrice();

    } catch (error) {
        console.error('Error refreshing data:', error);
        console.error('Error details:', error.message);
    }
}

async function handleTransfer(e) {
    e.preventDefault();

    const recipient = document.getElementById('recipientAddress').value;
    const amount = document.getElementById('transferAmount').value;

    if (!ethers.utils.isAddress(recipient)) {
        showStatus('error', 'Invalid recipient address', 'transferStatus');
        return;
    }

    try {
        showLoading();

        const amountWei = ethers.utils.parseEther(amount);
        const tx = await usdtContract.transfer(recipient, amountWei);

        showStatus('info', 'Transaction submitted. Waiting for confirmation...', 'transferStatus');

        await tx.wait();

        hideLoading();
        showStatus('success', `Successfully sent ${amount} USDT to ${formatAddress(recipient)}`, 'transferStatus');

        // Reset form and refresh
        document.getElementById('transferForm').reset();
        await refreshData();

    } catch (error) {
        console.error('Transfer error:', error);
        hideLoading();
        showStatus('error', 'Transfer failed: ' + error.message, 'transferStatus');
    }
}

function setMaxAmount() {
    const available = document.getElementById('availableBalance').textContent;
    document.getElementById('transferAmount').value = available;
}

async function handleCreateOffer(e) {
    e.preventDefault();

    const amount = document.getElementById('offerAmount').value;
    const price = document.getElementById('offerPrice').value;
    const buyer = document.getElementById('buyerAddress').value;

    if (!ethers.utils.isAddress(buyer)) {
        showStatus('error', 'Invalid buyer address', 'escrowStatus');
        return;
    }

    try {
        showLoading();

        const amountWei = ethers.utils.parseEther(amount);
        const priceWei = ethers.utils.parseEther(price);

        // First approve escrow
        showStatus('info', 'Approving tokens...', 'escrowStatus');
        const approveTx = await usdtContract.approve(CONTRACT_ADDRESSES.Escrow, amountWei);
        await approveTx.wait();

        // Create offer
        showStatus('info', 'Creating offer...', 'escrowStatus');
        const tx = await escrowContract.createOffer(
            CONTRACT_ADDRESSES.USDT,
            amountWei,
            priceWei,
            buyer
        );

        await tx.wait();

        hideLoading();
        showStatus('success', `Offer created successfully! ${amount} USDT for ${price} BUSD`, 'escrowStatus');

        // Wait a moment for blockchain to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reset form and refresh all data
        document.getElementById('createOfferForm').reset();
        await loadDashboard();
        await loadOffers();
        
        showStatus('success', `Offer created! Balances updated.`, 'escrowStatus');

    } catch (error) {
        console.error('Create offer error:', error);
        hideLoading();
        showStatus('error', 'Failed to create offer: ' + error.message, 'escrowStatus');
    }
}

async function loadOffers() {
    try {
        const offerCount = await escrowContract.getOfferCount();
        const offersList = document.getElementById('offersList');

        if (offerCount.toNumber() === 0) {
            offersList.innerHTML = '<p class="empty-state">No active offers</p>';
            return;
        }

        offersList.innerHTML = '';

        for (let i = 0; i < offerCount.toNumber(); i++) {
            const offer = await escrowContract.getOffer(i);

            // Only show user's offers or offers where user is buyer
            if (offer.seller.toLowerCase() === userAddress.toLowerCase() ||
                offer.buyer.toLowerCase() === userAddress.toLowerCase()) {

                if (offer.active) {
                    const offerCard = createOfferCard(offer, i);
                    offersList.appendChild(offerCard);
                }
            }
        }

        if (offersList.children.length === 0) {
            offersList.innerHTML = '<p class="empty-state">No active offers</p>';
        }

    } catch (error) {
        console.error('Error loading offers:', error);
    }
}

function createOfferCard(offer, offerId) {
    const card = document.createElement('div');
    card.className = 'offer-card';

    const amount = ethers.utils.formatEther(offer.amount);
    const price = ethers.utils.formatEther(offer.priceInBUSD);
    const isSeller = offer.seller.toLowerCase() === userAddress.toLowerCase();

    card.innerHTML = `
        <div class="offer-header">
            <span class="offer-id">Offer #${offerId}</span>
            <span class="offer-status active">ACTIVE</span>
        </div>
        <div class="offer-details">
            <div class="offer-detail">
                <span class="offer-detail-label">Amount</span>
                <span class="offer-detail-value">${parseFloat(amount).toFixed(2)} USDT</span>
            </div>
            <div class="offer-detail">
                <span class="offer-detail-label">Price</span>
                <span class="offer-detail-value">${parseFloat(price).toFixed(2)} BUSD</span>
            </div>
            <div class="offer-detail">
                <span class="offer-detail-label">Seller</span>
                <span class="offer-detail-value">${formatAddress(offer.seller)}</span>
            </div>
            <div class="offer-detail">
                <span class="offer-detail-label">Buyer</span>
                <span class="offer-detail-value">${formatAddress(offer.buyer)}</span>
            </div>
        </div>
        <div class="offer-actions">
            ${isSeller ?
            `<button class="btn-cancel" onclick="cancelOffer(${offerId})">Cancel Offer</button>` :
            `<button class="btn-accept" onclick="acceptOffer(${offerId})">Accept Offer</button>`
        }
        </div>
    `;

    return card;
}

async function cancelOffer(offerId) {
    try {
        showLoading();

        const tx = await escrowContract.cancelOffer(offerId);
        await tx.wait();

        hideLoading();
        showStatus('success', 'Offer cancelled successfully', 'escrowStatus');
        
        // Wait a moment for blockchain to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Refresh all data
        await loadDashboard();
        await loadOffers();
        
        showStatus('success', 'Offer cancelled! Balances updated.', 'escrowStatus');

    } catch (error) {
        console.error('Cancel offer error:', error);
        hideLoading();
        showStatus('error', 'Failed to cancel offer: ' + error.message, 'escrowStatus');
    }
}

async function acceptOffer(offerId) {
    if (!signer) {
        showStatus('error', 'Please connect your wallet first', 'escrowStatus');
        return;
    }

    try {
        showLoading('Accepting offer...');
        
        // Get offer details
        const offer = await escrowContract.getOffer(offerId);
        
        // Check if user is the designated buyer
        if (offer.buyer.toLowerCase() !== userAddress.toLowerCase()) {
            throw new Error('You are not the designated buyer for this offer');
        }
        
        // Get BUSD contract
        const busdContract = new ethers.Contract(
            CONTRACT_ADDRESSES.BUSD,
            USDT_ABI,
            signer
        );
        
        // Check BUSD balance
        const busdBalance = await busdContract.balanceOf(userAddress);
        if (busdBalance.lt(offer.priceInBUSD)) {
            throw new Error(`Insufficient BUSD balance. Need ${ethers.utils.formatEther(offer.priceInBUSD)} BUSD`);
        }
        
        // Step 1: Approve BUSD spending
        showStatus('info', 'Step 1/2: Approving BUSD spending...', 'escrowStatus');
        const approveTx = await busdContract.approve(
            CONTRACT_ADDRESSES.Escrow,
            offer.priceInBUSD
        );
        await approveTx.wait();
        
        // Step 2: Accept offer
        showStatus('info', 'Step 2/2: Accepting offer...', 'escrowStatus');
        const acceptTx = await escrowContract.acceptOffer(
            offerId,
            CONTRACT_ADDRESSES.BUSD
        );
        await acceptTx.wait();
        
        hideLoading();
        showStatus('success', `Offer accepted! You received ${ethers.utils.formatEther(offer.amount)} USDT`, 'escrowStatus');
        
        // Wait a moment for blockchain to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Refresh all data
        showStatus('info', 'Refreshing balances...', 'escrowStatus');
        await loadDashboard();
        await loadOffers();
        
        // Final success message
        showStatus('success', `Trade complete! Balances updated.`, 'escrowStatus');
        
    } catch (error) {
        console.error('Accept offer error:', error);
        hideLoading();
        showStatus('error', 'Failed to accept offer: ' + error.message, 'escrowStatus');
    }
}

async function refreshPrice() {
    try {
        // Get pair address
        const pairAddress = await factoryContract.getPair(
            CONTRACT_ADDRESSES.USDT,
            CONTRACT_ADDRESSES.MockBUSD
        );

        if (pairAddress === ethers.constants.AddressZero) {
            document.getElementById('priceValue').textContent = 'No liquidity';
            return;
        }

        // Get reserves
        const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);
        const reserves = await pairContract.getReserves();
        const token0 = await pairContract.token0();

        let usdtReserve, busdReserve;
        if (token0.toLowerCase() === CONTRACT_ADDRESSES.USDT.toLowerCase()) {
            usdtReserve = reserves.reserve0;
            busdReserve = reserves.reserve1;
        } else {
            usdtReserve = reserves.reserve1;
            busdReserve = reserves.reserve0;
        }

        // Calculate price
        const usdtReserveEther = parseFloat(ethers.utils.formatEther(usdtReserve));
        const busdReserveEther = parseFloat(ethers.utils.formatEther(busdReserve));
        const price = busdReserveEther / usdtReserveEther;

        // Update UI
        document.getElementById('priceValue').textContent = '$' + price.toFixed(6);
        document.getElementById('currentPrice').textContent = '$' + price.toFixed(2);
        document.getElementById('usdtReserve').textContent = usdtReserveEther.toFixed(2) + ' USDT';
        document.getElementById('busdReserve').textContent = busdReserveEther.toFixed(2) + ' BUSD';
        document.getElementById('liquidityPool').textContent = '$' + busdReserveEther.toFixed(0);

        // Check stability
        const deviation = Math.abs(price - 1.0);
        const deviationPercent = (deviation * 100).toFixed(2);
        const isStable = deviation <= 0.02;

        document.getElementById('priceDeviation').textContent = deviationPercent + '%';
        document.getElementById('priceStatus').textContent = isStable ? 'STABLE' : 'UNSTABLE';
        document.getElementById('priceStatus').className = 'status-badge ' + (isStable ? 'stable' : 'unstable');

    } catch (error) {
        console.error('Error refreshing price:', error);
    }
}

// Utility functions
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
}

function formatAddress(address) {
    return address.substring(0, 6) + '...' + address.substring(38);
}

function showStatus(type, message, elementId) {
    const statusEl = document.getElementById(elementId);
    statusEl.className = `status-message ${type}`;
    statusEl.textContent = message;
    statusEl.style.display = 'block';

    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 5000);
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Listen for account changes
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            location.reload();
        } else {
            connectWallet();
        }
    });

    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}
