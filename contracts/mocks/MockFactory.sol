// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MockPair.sol";

/**
 * @title MockFactory
 * @dev Mock implementation of PancakeSwap Factory for local testing
 * Creates and manages liquidity pairs
 */
contract MockFactory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);

    /**
     * @dev Create a new liquidity pair
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return pair Address of the created pair
     */
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "MockFactory: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "MockFactory: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "MockFactory: PAIR_EXISTS");

        // Deploy new pair contract
        MockPair pairContract = new MockPair();
        pair = address(pairContract);
        
        // Initialize the pair
        pairContract.initialize(token0, token1);

        // Store pair address
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    /**
     * @dev Get total number of pairs
     */
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
}
