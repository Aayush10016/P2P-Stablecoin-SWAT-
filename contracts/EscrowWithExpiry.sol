// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EscrowWithExpiry
 * @dev Enhanced P2P escrow with 15-minute expiry window (like Binance P2P)
 * 
 * Key Features:
 * - 15-minute acceptance window (configurable)
 * - Automatic expiry after timeout
 * - Seller can cancel anytime before acceptance
 * - Only designated buyer can accept
 * - Expired offers can be reclaimed by seller
 */
contract EscrowWithExpiry is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // Default expiry time: 15 minutes (like Binance P2P)
    uint256 public constant DEFAULT_EXPIRY_TIME = 15 minutes;
    
    // Offer structure with expiry
    struct Offer {
        uint256 id;
        address seller;
        address buyer;
        address tokenAddress;
        uint256 amount;
        uint256 priceInBUSD;
        bool active;
        uint256 createdAt;
        uint256 expiresAt;  // NEW: Expiry timestamp
    }

    // State variables
    uint256 private _offerIdCounter;
    mapping(uint256 => Offer) private _offers;
    
    // Configurable expiry time (owner can adjust)
    uint256 public offerExpiryTime = DEFAULT_EXPIRY_TIME;
    
    // Rate limiting
    mapping(address => uint256) private _lastOfferTime;
    mapping(address => uint256) private _dailyOfferCount;
    uint256 public constant MAX_OFFERS_PER_DAY = 50;
    uint256 public constant OFFER_COOLDOWN = 10 seconds;

    // Events
    event OfferCreated(
        uint256 indexed offerId,
        address indexed seller,
        address indexed buyer,
        address tokenAddress,
        uint256 amount,
        uint256 priceInBUSD,
        uint256 expiresAt
    );

    event OfferAccepted(
        uint256 indexed offerId,
        address indexed seller,
        address indexed buyer,
        uint256 amount,
        uint256 priceInBUSD
    );

    event OfferCancelled(
        uint256 indexed offerId,
        address indexed seller
    );

    event OfferExpired(
        uint256 indexed offerId,
        address indexed seller
    );

    event ExpiryTimeUpdated(uint256 newExpiryTime);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Create offer with automatic 15-minute expiry
     */
    function createOffer(
        address tokenAddress,
        uint256 amount,
        uint256 priceInBUSD,
        address buyer
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(tokenAddress != address(0), "Invalid token address");
        require(amount > 0, "Amount must be > 0");
        require(priceInBUSD > 0, "Price must be > 0");
        require(buyer != address(0), "Invalid buyer address");
        require(buyer != msg.sender, "Buyer cannot be seller");
        
        // Rate limiting
        require(
            block.timestamp >= _lastOfferTime[msg.sender] + OFFER_COOLDOWN,
            "Cooldown period active"
        );
        
        if (block.timestamp >= _lastOfferTime[msg.sender] + 1 days) {
            _dailyOfferCount[msg.sender] = 0;
        }
        
        require(
            _dailyOfferCount[msg.sender] < MAX_OFFERS_PER_DAY,
            "Daily offer limit reached"
        );
        
        _lastOfferTime[msg.sender] = block.timestamp;
        _dailyOfferCount[msg.sender]++;

        // Transfer tokens to escrow
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), amount);

        // Create offer with expiry
        uint256 offerId = _offerIdCounter++;
        uint256 expiresAt = block.timestamp + offerExpiryTime;
        
        _offers[offerId] = Offer({
            id: offerId,
            seller: msg.sender,
            buyer: buyer,
            tokenAddress: tokenAddress,
            amount: amount,
            priceInBUSD: priceInBUSD,
            active: true,
            createdAt: block.timestamp,
            expiresAt: expiresAt
        });

        emit OfferCreated(offerId, msg.sender, buyer, tokenAddress, amount, priceInBUSD, expiresAt);

        return offerId;
    }

    /**
     * @dev Accept offer (must be within 15-minute window)
     */
    function acceptOffer(uint256 offerId, address busdAddress) external nonReentrant whenNotPaused {
        Offer storage offer = _offers[offerId];

        require(offer.active, "Offer is not active");
        require(msg.sender == offer.buyer, "Not the designated buyer");
        require(busdAddress != address(0), "Invalid BUSD address");
        
        // CHECK EXPIRY - This is the key feature!
        require(block.timestamp <= offer.expiresAt, "Offer has expired");

        // Mark inactive
        offer.active = false;

        // Transfer BUSD from buyer to seller
        IERC20(busdAddress).safeTransferFrom(msg.sender, offer.seller, offer.priceInBUSD);

        // Transfer tokens from escrow to buyer
        IERC20(offer.tokenAddress).safeTransfer(msg.sender, offer.amount);

        emit OfferAccepted(offerId, offer.seller, msg.sender, offer.amount, offer.priceInBUSD);
    }

    /**
     * @dev Cancel offer (seller can cancel anytime)
     */
    function cancelOffer(uint256 offerId) external nonReentrant whenNotPaused {
        Offer storage offer = _offers[offerId];

        require(offer.active, "Offer is not active");
        require(msg.sender == offer.seller, "Not the seller");

        offer.active = false;

        // Return tokens to seller
        IERC20(offer.tokenAddress).safeTransfer(msg.sender, offer.amount);

        emit OfferCancelled(offerId, msg.sender);
    }

    /**
     * @dev Reclaim expired offer (anyone can call, but tokens go to seller)
     * This allows cleanup of expired offers
     */
    function reclaimExpired(uint256 offerId) external nonReentrant {
        Offer storage offer = _offers[offerId];

        require(offer.active, "Offer is not active");
        require(block.timestamp > offer.expiresAt, "Offer has not expired yet");

        offer.active = false;

        // Return tokens to seller
        IERC20(offer.tokenAddress).safeTransfer(offer.seller, offer.amount);

        emit OfferExpired(offerId, offer.seller);
    }

    /**
     * @dev Check if offer is expired
     */
    function isExpired(uint256 offerId) external view returns (bool) {
        Offer memory offer = _offers[offerId];
        return block.timestamp > offer.expiresAt;
    }

    /**
     * @dev Get time remaining for offer (in seconds)
     */
    function getTimeRemaining(uint256 offerId) external view returns (uint256) {
        Offer memory offer = _offers[offerId];
        if (block.timestamp >= offer.expiresAt) {
            return 0;
        }
        return offer.expiresAt - block.timestamp;
    }

    /**
     * @dev Get offer details
     */
    function getOffer(uint256 offerId) external view returns (Offer memory) {
        return _offers[offerId];
    }

    /**
     * @dev Get offer count
     */
    function getOfferCount() external view returns (uint256) {
        return _offerIdCounter;
    }

    /**
     * @dev Update expiry time (owner only)
     * @param newExpiryTime New expiry time in seconds
     */
    function updateExpiryTime(uint256 newExpiryTime) external onlyOwner {
        require(newExpiryTime >= 1 minutes, "Expiry too short");
        require(newExpiryTime <= 24 hours, "Expiry too long");
        offerExpiryTime = newExpiryTime;
        emit ExpiryTimeUpdated(newExpiryTime);
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal (only when paused)
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(paused(), "Only when paused");
        
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @dev Get remaining offers for user today
     */
    function getRemainingOffers(address user) external view returns (uint256) {
        if (block.timestamp >= _lastOfferTime[user] + 1 days) {
            return MAX_OFFERS_PER_DAY;
        }
        uint256 used = _dailyOfferCount[user];
        return used >= MAX_OFFERS_PER_DAY ? 0 : MAX_OFFERS_PER_DAY - used;
    }
}
