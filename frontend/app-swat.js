// Trust Wallet ONLY Frontend - WalletConnect Integration
// Contract addresses (UPDATED - Latest Deployment)
let CONTRACT_ADDRESSES = {
    SWAT: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    BUSD: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    Escrow: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    MockFactory: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
    MockRouter: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    MockBUSD: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
};

// Contract ABIs
const SWAT_ABI = [
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
let swatContract;
let escrowContract;
let factoryContract;
let walletConnectProvider;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    console.log('SWAT Coin frontend loaded. Click "Connect Wallet" to connect MetaMask.');
});

function setupEventListeners() {
    document.getElementById('connectWallet').addEventListener('click', showWalletModal);
    document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);
    document.getElementById('refreshBtn').addEventListener('click', refreshData);
    
    // Wallet modal events
    document.getElementById('closeModal').addEventListener('click', hideWalletModal);
    document.getElementById('connectMetaMask').addEventListener('click', connectMetaMask);
    
    // Close modal when clicking outside
    document.getElementById('walletModal').addEventListener('click', (e) => {
        if (e.target.id === 'walletModal') {
            hideWalletModal();
        }
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    document.getElementById('transferForm').addEventListener('submit', handleTransfer);
    document.getElementById('maxBtn').addEventListener('click', setMaxAmount);
    document.getElementById('createOfferForm').addEventListener('submit', handleCreateOffer);
    document.getElementById('refreshPrice').addEventListener('click', refreshPrice);
}

function showWalletModal() {
    document.getElementById('walletModal').style.display = 'flex';
}

function hideWalletModal() {
    document.getElementById('walletModal').style.display = 'none';
}

async function connectMetaMask() {
    try {
        hideWalletModal();
        showLoading();
        console.log('Connecting to MetaMask...');

        // Check if MetaMask is installed
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed. Please install MetaMask extension.');
        }

        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Create provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        
        console.log('MetaMask connected:', userAddress);

        // Handle account changes
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                disconnectWallet();
            } else {
                location.reload(); // Refresh to update with new account
            }
        });

        // Handle network changes
        window.ethereum.on('chainChanged', () => {
            location.reload(); // Refresh on network change
        });

        await initializeContracts();
        hideLoading();
        showStatus('success', 'MetaMask connected successfully!', 'transferStatus');
        
        // Update connect button text
        document.getElementById('connectWallet').textContent = 'Connected (MetaMask)';

    } catch (error) {
        console.error('MetaMask connection error:', error);
        hideLoading();
        alert('Failed to connect MetaMask: ' + error.message);
    }
}

async function connectWalletConnect() {
    try {
        showLoading();
        console.log('Connecting to Trust Wallet via WalletConnect...');

        // Check if we're in Trust Wallet mobile browser
        if (window.ethereum && (window.ethereum.isTrust || window.ethereum.isTrustWallet)) {
            console.log('Trust Wallet mobile browser detected!');
            
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            userAddress = await signer.getAddress();
            
            await initializeContracts();
            hideLoading();
            showStatus('success', 'Trust Wallet connected!', 'transferStatus');
            return;
        }

        // For desktop: Use WalletConnect
        console.log('Using WalletConnect for Trust Wallet desktop...');
        
        walletConnectProvider = new WalletConnectProvider.default({
            rpc: {
                1337: "http://127.0.0.1:8545", // Hardhat local
                97: "https://data-seed-prebsc-1-s1.binance.org:8545/", // BSC Testnet
                56: "https://bsc-dataseed.binance.org/" // BSC Mainnet
            },
            chainId: 1337, // Default to Hardhat
            qrcode: true, // Show QR code
            qrcodeModalOptions: {
                mobileLinks: [
                    "trust", // Trust Wallet
                ],
                desktopLinks: [
                    "trust", // Trust Wallet
                ]
            }
        });

        // Enable session (shows QR Code)
        await walletConnectProvider.enable();
        
        // Create ethers provider
        provider = new ethers.providers.Web3Provider(walletConnectProvider);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();

        console.log('Connected via WalletConnect:', userAddress);

        // Subscribe to session disconnection
        walletConnectProvider.on("disconnect", (code, reason) => {
            console.log('WalletConnect disconnected:', code, reason);
            disconnectWallet();
        });

        await initializeContracts();
        hideLoading();
        showStatus('success', 'Trust Wallet connected via WalletConnect!', 'transferStatus');
        
        // Update connect button text
        document.getElementById('connectWallet').textContent = 'Connected (Trust Wallet)';

    } catch (error) {
        console.error('WalletConnect connection error:', error);
        hideLoading();
        
        if (error.message.includes('User closed modal')) {
            alert('Connection cancelled. Please scan the QR code with Trust Wallet to connect.');
        } else {
            alert('Failed to connect Trust Wallet: ' + error.message + '\n\nPlease:\n1. Open Trust Wallet app\n2. Scan the QR code\n3. Approve the connection');
        }
    }
}

async function initializeContracts() {
    try {
        // Check network
        const network = await provider.getNetwork();
        console.log('Connected to network:', network.chainId);

        // Initialize contracts
        swatContract = new ethers.Contract(CONTRACT_ADDRESSES.SWAT, SWAT_ABI, signer);
        escrowContract = new ethers.Contract(CONTRACT_ADDRESSES.Escrow, ESCROW_ABI, signer);
        factoryContract = new ethers.Contract(CONTRACT_ADDRESSES.MockFactory, FACTORY_ABI, provider);

        // Update UI
        document.getElementById('connectWallet').style.display = 'none';
        document.getElementById('disconnectWallet').style.display = 'block';
        document.getElementById('userAddress').textContent = formatAddress(userAddress);
        document.getElementById('walletInfo').style.display = 'flex';

        // Load data
        await refreshData();
    } catch (error) {
        console.error('Error initializing contracts:', error);
        throw error;
    }
}

async function disconnectWallet() {
    try {
        // Disconnect WalletConnect if active
        if (walletConnectProvider) {
            await walletConnectProvider.disconnect();
        }
    } catch (error) {
        console.error('Error disconnecting:', error);
    }

    // Clear all wallet data
    provider = null;
    signer = null;
    userAddress = null;
    swatContract = null;
    escrowContract = null;
    factoryContract = null;
    walletConnectProvider = null;

    // Update UI
    document.getElementById('connectWallet').style.display = 'block';
    document.getElementById('disconnectWallet').style.display = 'none';
    document.getElementById('walletInfo').style.display = 'none';
    
    document.getElementById('userBalance').textContent = '0.00 SWAT';
    document.getElementById('yourBalance').textContent = '0 SWAT';
    document.getElementById('totalSupply').textContent = '0';
    document.getElementById('availableBalance').textContent = '0';

    console.log('Wallet disconnected');
    showStatus('info', 'Wallet disconnected', 'transferStatus');
}

async function refreshData() {
    if (!swatContract) {
        console.log('Contracts not initialized');
        return;
    }

    try {
        const balance = await swatContract.balanceOf(userAddress);
        const formattedBalance = ethers.utils.formatEther(balance);

        document.getElementById('userBalance').textContent = parseFloat(formattedBalance).toFixed(2) + ' SWAT';
        document.getElementById('yourBalance').textContent = parseFloat(formattedBalance).toFixed(2) + ' SWAT';
        document.getElementById('availableBalance').textContent = parseFloat(formattedBalance).toFixed(2);

        const totalSupply = await swatContract.totalSupply();
        const formattedSupply = ethers.utils.formatEther(totalSupply);
        document.getElementById('totalSupply').textContent = parseFloat(formattedSupply).toLocaleString() + ' SWAT';

        await loadOffers();
        await refreshPrice();

    } catch (error) {
        console.error('Error refreshing data:', error);
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
        const tx = await swatContract.transfer(recipient, amountWei);

        showStatus('info', 'Transaction submitted. Waiting for confirmation...', 'transferStatus');

        await tx.wait();

        hideLoading();
        showStatus('success', `Successfully sent ${amount} SWAT to ${formatAddress(recipient)}`, 'transferStatus');

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

        showStatus('info', 'Approving tokens...', 'escrowStatus');
        const approveTx = await swatContract.approve(CONTRACT_ADDRESSES.Escrow, amountWei);
        await approveTx.wait();

        showStatus('info', 'Creating offer...', 'escrowStatus');
        const tx = await escrowContract.createOffer(
            CONTRACT_ADDRESSES.SWAT,
            amountWei,
            priceWei,
            buyer
        );

        await tx.wait();

        hideLoading();
        showStatus('success', `Offer created successfully! ${amount} SWAT for ${price} BUSD`, 'escrowStatus');

        await new Promise(resolve => setTimeout(resolve, 1000));
        
        document.getElementById('createOfferForm').reset();
        await refreshData();
        await loadOffers();

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
                <span class="offer-detail-value">${parseFloat(amount).toFixed(2)} SWAT</span>
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
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        await refreshData();
        await loadOffers();

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
        showLoading();
        
        const offer = await escrowContract.getOffer(offerId);
        
        if (offer.buyer.toLowerCase() !== userAddress.toLowerCase()) {
            throw new Error('You are not the designated buyer for this offer');
        }
        
        const busdContract = new ethers.Contract(
            CONTRACT_ADDRESSES.BUSD,
            SWAT_ABI,
            signer
        );
        
        const busdBalance = await busdContract.balanceOf(userAddress);
        if (busdBalance.lt(offer.priceInBUSD)) {
            throw new Error(`Insufficient BUSD balance. Need ${ethers.utils.formatEther(offer.priceInBUSD)} BUSD`);
        }
        
        showStatus('info', 'Step 1/2: Approving BUSD spending...', 'escrowStatus');
        const approveTx = await busdContract.approve(
            CONTRACT_ADDRESSES.Escrow,
            offer.priceInBUSD
        );
        await approveTx.wait();
        
        showStatus('info', 'Step 2/2: Accepting offer...', 'escrowStatus');
        const acceptTx = await escrowContract.acceptOffer(
            offerId,
            CONTRACT_ADDRESSES.BUSD
        );
        await acceptTx.wait();
        
        hideLoading();
        showStatus('success', `Offer accepted! You received ${ethers.utils.formatEther(offer.amount)} SWAT`, 'escrowStatus');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        await refreshData();
        await loadOffers();
        
    } catch (error) {
        console.error('Accept offer error:', error);
        hideLoading();
        showStatus('error', 'Failed to accept offer: ' + error.message, 'escrowStatus');
    }
}

async function refreshPrice() {
    try {
        const pairAddress = await factoryContract.getPair(
            CONTRACT_ADDRESSES.SWAT,
            CONTRACT_ADDRESSES.MockBUSD
        );

        if (pairAddress === ethers.constants.AddressZero) {
            document.getElementById('priceValue').textContent = 'No liquidity';
            return;
        }

        const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);
        const reserves = await pairContract.getReserves();
        const token0 = await pairContract.token0();

        let swatReserve, busdReserve;
        if (token0.toLowerCase() === CONTRACT_ADDRESSES.SWAT.toLowerCase()) {
            swatReserve = reserves.reserve0;
            busdReserve = reserves.reserve1;
        } else {
            swatReserve = reserves.reserve1;
            busdReserve = reserves.reserve0;
        }

        const swatReserveEther = parseFloat(ethers.utils.formatEther(swatReserve));
        const busdReserveEther = parseFloat(ethers.utils.formatEther(busdReserve));
        const price = busdReserveEther / swatReserveEther;

        document.getElementById('priceValue').textContent = '$' + price.toFixed(6);
        document.getElementById('currentPrice').textContent = '$' + price.toFixed(2);
        document.getElementById('swatReserve').textContent = swatReserveEther.toFixed(2) + ' SWAT';
        document.getElementById('busdReserve').textContent = busdReserveEther.toFixed(2) + ' BUSD';
        document.getElementById('liquidityPool').textContent = '$' + busdReserveEther.toFixed(0);

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
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

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
