// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockBUSD
 * @dev Mock BUSD token for local testing
 * Allows anyone to mint for testing purposes
 */
contract MockBUSD is ERC20 {
    constructor() ERC20("Binance USD", "BUSD") {
        // Mint initial supply for testing
        _mint(msg.sender, 1000000 * 10**18); // 1 million BUSD
    }

    /**
     * @dev Mint tokens for testing (anyone can call)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @dev Returns 18 decimals
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
