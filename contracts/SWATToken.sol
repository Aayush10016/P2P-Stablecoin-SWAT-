// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SWATToken
 * @dev Educational stable coin BEP20 Token
 * - Name: SWAT Coin
 * - Symbol: SWAT
 * - Decimals: 18
 * - Mintable by owner only
 * - Pausable for emergency situations
 * - Gas optimized for mainnet deployment
 * - Multi-sig ready architecture
 */
contract SWATToken is ERC20, Ownable, Pausable {
    
    // Maximum supply cap to prevent unlimited minting
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 100 million tokens
    
    // Events for transparency
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed to);
    event MintingCompleted(uint256 totalSupply);
    
    /**
     * @dev Constructor that sets token name and symbol
     * The deployer becomes the owner and can mint tokens
     */
    constructor() ERC20("SWAT Coin", "SWAT") Ownable(msg.sender) Pausable() {
        // Contract is deployed, owner is set automatically
    }

    /**
     * @dev Mints new tokens to a specified address
     * Can only be called by the contract owner
     * Includes supply cap check for safety
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint (in wei, 18 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "SWATToken: mint to zero address");
        require(amount > 0, "SWATToken: mint amount must be greater than 0");
        require(totalSupply() + amount <= MAX_SUPPLY, "SWATToken: exceeds max supply");
        
        _mint(to, amount);
    }

    /**
     * @dev Pause all token transfers
     * Emergency function to stop all transfers if needed
     * Can only be called by owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     * Resume normal operations after emergency
     * Can only be called by owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal function
     * Allows owner to recover accidentally sent tokens
     * @param token Address of token to withdraw (use address(0) for ETH/BNB)
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function emergencyWithdraw(address token, uint256 amount, address to) external onlyOwner {
        require(to != address(0), "SWATToken: withdraw to zero address");
        
        if (token == address(0)) {
            // Withdraw BNB
            (bool success, ) = to.call{value: amount}("");
            require(success, "SWATToken: BNB transfer failed");
        } else {
            // Withdraw ERC20 tokens
            IERC20(token).transfer(to, amount);
        }
        
        emit EmergencyWithdraw(token, amount, to);
    }

    /**
     * @dev Override transfer to add pause functionality
     */
    function _update(address from, address to, uint256 amount) internal override whenNotPaused {
        super._update(from, to, amount);
    }

    /**
     * @dev Returns the number of decimals used for token amounts
     * @return uint8 The number of decimals (18)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /**
     * @dev Returns the address of the current owner (BEP20 compatibility)
     * @return address The owner's address
     */
    function getOwner() external view returns (address) {
        return owner();
    }

    /**
     * @dev Receive function to accept BNB
     */
    receive() external payable {}
}
