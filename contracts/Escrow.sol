// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Escrow
 * @dev Production-grade P2P token trading escrow with enhanced security
 * - Pausable for emergency situations
 * - Owner controls for emergency recovery
 * - Gas optimized operations
 * - Rate limiting to prevent manipulation
 * - Multi-sig ready architecture
 */
contract Escrow is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // Offer structure
    struct Offer {
        uint256 id;
        address seller;
        address buyer;
        address tokenAddress;
        uint256 amount;
        uint256 priceInBUSD;
        bool active;
        uint256 createdAt;
    }

    // State variables
    uint256 private _offerIdCounter;
    mapping(uint256 => Offer) private _offers;
    
    // Rate limiting: max offers per address per day
    mapping(address => uint256) private _lastOfferTime;
    mapping(address => uint256) private _dailyOfferCount;
    uint256 public constant MAX_OFFERS_PER_DAY = 50; // Increased for flexibility
    uint256 public constant OFFER_COOLDOWN = 10 seconds; // Short cooldown to prevent spam
    
    // Fee mechanism (optional, set to 0 for no fees)
    uint256 public platformFeePercent = 0; // 0 = no fees, 100 = 1%
    address public feeCollector;

    // Events
    event OfferCreated(
        uint256 indexed offerId,
        address indexed seller,
        address indexed buyer,
        address tokenAddress,
        uint256 amount,
        uint256 priceInBUSD
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

    event EmergencyWithdraw(
        address indexed token,
        uint256 amount,
        address indexed to
    );

    event FeeUpdated(uint256 newFeePercent);

    /**
     * @dev Constructor sets the owner
     */
    constructor() Ownable(msg.sender) {
        feeCollector = msg.sender;
    }

    /**
     * @dev Create a new trade offer with rate limiting
     * @param tokenAddress Address of the token to trade
     * @param amount Amount of tokens to trade
     * @param priceInBUSD Total price in BUSD (with 18 decimals)
     * @param buyer Address of the designated buyer
     * @return offerId The ID of the created offer
     */
    function createOffer(
        address tokenAddress,
        uint256 amount,
        uint256 priceInBUSD,
        address buyer
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(tokenAddress != address(0), "Escrow: invalid token address");
        require(amount > 0, "Escrow: amount must be greater than 0");
        require(priceInBUSD > 0, "Escrow: price must be greater than 0");
        require(buyer != address(0), "Escrow: invalid buyer address");
        require(buyer != msg.sender, "Escrow: buyer cannot be seller");
        
        // Rate limiting check
        require(
            block.timestamp >= _lastOfferTime[msg.sender] + OFFER_COOLDOWN,
            "Escrow: cooldown period active"
        );
        
        // Reset daily counter if new day
        if (block.timestamp >= _lastOfferTime[msg.sender] + 1 days) {
            _dailyOfferCount[msg.sender] = 0;
        }
        
        require(
            _dailyOfferCount[msg.sender] < MAX_OFFERS_PER_DAY,
            "Escrow: daily offer limit reached"
        );
        
        _lastOfferTime[msg.sender] = block.timestamp;
        _dailyOfferCount[msg.sender]++;

        // Transfer tokens from seller to escrow
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), amount);

        // Create offer
        uint256 offerId = _offerIdCounter++;
        _offers[offerId] = Offer({
            id: offerId,
            seller: msg.sender,
            buyer: buyer,
            tokenAddress: tokenAddress,
            amount: amount,
            priceInBUSD: priceInBUSD,
            active: true,
            createdAt: block.timestamp
        });

        emit OfferCreated(offerId, msg.sender, buyer, tokenAddress, amount, priceInBUSD);

        return offerId;
    }

    /**
     * @dev Accept an offer and complete the trade
     * @param offerId The ID of the offer to accept
     * @param busdAddress Address of the BUSD token contract
     */
    function acceptOffer(uint256 offerId, address busdAddress) external nonReentrant whenNotPaused {
        Offer storage offer = _offers[offerId];

        require(offer.active, "Escrow: offer is not active");
        require(msg.sender == offer.buyer, "Escrow: caller is not the designated buyer");
        require(busdAddress != address(0), "Escrow: invalid BUSD address");

        // Mark offer as inactive first (checks-effects-interactions pattern)
        offer.active = false;

        // Transfer BUSD from buyer to seller
        IERC20(busdAddress).safeTransferFrom(msg.sender, offer.seller, offer.priceInBUSD);

        // Transfer tokens from escrow to buyer
        IERC20(offer.tokenAddress).safeTransfer(msg.sender, offer.amount);

        emit OfferAccepted(offerId, offer.seller, msg.sender, offer.amount, offer.priceInBUSD);
    }

    /**
     * @dev Cancel an offer and return tokens to seller
     * @param offerId The ID of the offer to cancel
     */
    function cancelOffer(uint256 offerId) external nonReentrant whenNotPaused {
        Offer storage offer = _offers[offerId];

        require(offer.active, "Escrow: offer is not active");
        require(msg.sender == offer.seller, "Escrow: caller is not the seller");

        // Mark offer as inactive first
        offer.active = false;

        // Return tokens to seller
        IERC20(offer.tokenAddress).safeTransfer(msg.sender, offer.amount);

        emit OfferCancelled(offerId, msg.sender);
    }

    /**
     * @dev Get offer details
     * @param offerId The ID of the offer
     * @return The offer details
     */
    function getOffer(uint256 offerId) external view returns (Offer memory) {
        return _offers[offerId];
    }

    /**
     * @dev Get the current offer counter
     * @return The number of offers created
     */
    function getOfferCount() external view returns (uint256) {
        return _offerIdCounter;
    }

    /**
     * @dev Pause all escrow operations
     * Emergency function to stop all trades if needed
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause escrow operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal function
     * Allows owner to recover stuck tokens in emergency
     * @param token Address of token to withdraw
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        require(to != address(0), "Escrow: withdraw to zero address");
        require(paused(), "Escrow: only when paused");
        
        IERC20(token).safeTransfer(to, amount);
        emit EmergencyWithdraw(token, amount, to);
    }

    /**
     * @dev Update platform fee (if needed in future)
     * @param newFeePercent New fee percentage (100 = 1%)
     */
    function updateFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 500, "Escrow: fee too high"); // Max 5%
        platformFeePercent = newFeePercent;
        emit FeeUpdated(newFeePercent);
    }

    /**
     * @dev Update fee collector address
     * @param newCollector New fee collector address
     */
    function updateFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "Escrow: invalid collector");
        feeCollector = newCollector;
    }

    /**
     * @dev Get user's remaining offers for today
     * @param user Address to check
     * @return remaining Number of offers remaining today
     */
    function getRemainingOffers(address user) external view returns (uint256 remaining) {
        if (block.timestamp >= _lastOfferTime[user] + 1 days) {
            return MAX_OFFERS_PER_DAY;
        }
        uint256 used = _dailyOfferCount[user];
        return used >= MAX_OFFERS_PER_DAY ? 0 : MAX_OFFERS_PER_DAY - used;
    }
}
