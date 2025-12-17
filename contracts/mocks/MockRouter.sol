// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MockFactory.sol";
import "./MockPair.sol";

/**
 * @title MockRouter
 * @dev Mock implementation of PancakeSwap Router for local testing
 * Handles liquidity addition, removal, and token swaps
 */
contract MockRouter {
    using SafeERC20 for IERC20;

    address public immutable factory;

    constructor(address _factory) {
        factory = _factory;
    }

    /**
     * @dev Add liquidity to a token pair
     * @param tokenA Address of first token
     * @param tokenB Address of second token
     * @param amountADesired Desired amount of tokenA
     * @param amountBDesired Desired amount of tokenB
     * @param amountAMin Minimum amount of tokenA
     * @param amountBMin Minimum amount of tokenB
     * @param to Address to receive LP tokens
     * @param deadline Transaction deadline
     * @return amountA Actual amount of tokenA added
     * @return amountB Actual amount of tokenB added
     * @return liquidity Amount of LP tokens received
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        require(deadline >= block.timestamp, "MockRouter: EXPIRED");
        
        // Get or create pair
        address pair = MockFactory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = MockFactory(factory).createPair(tokenA, tokenB);
        }

        // Calculate optimal amounts
        (amountA, amountB) = _calculateLiquidityAmounts(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );

        // Transfer tokens to pair
        IERC20(tokenA).safeTransferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, pair, amountB);

        // Mint LP tokens
        liquidity = MockPair(pair).mint(to);
    }

    /**
     * @dev Remove liquidity from a token pair
     * @param tokenA Address of first token
     * @param tokenB Address of second token
     * @param liquidity Amount of LP tokens to burn
     * @param amountAMin Minimum amount of tokenA to receive
     * @param amountBMin Minimum amount of tokenB to receive
     * @param to Address to receive tokens
     * @param deadline Transaction deadline
     * @return amountA Amount of tokenA received
     * @return amountB Amount of tokenB received
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB) {
        require(deadline >= block.timestamp, "MockRouter: EXPIRED");
        
        address pair = MockFactory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "MockRouter: PAIR_NOT_FOUND");

        // Transfer LP tokens to pair
        IERC20(pair).safeTransferFrom(msg.sender, pair, liquidity);

        // Burn LP tokens and receive tokens
        (uint256 amount0, uint256 amount1) = MockPair(pair).burn(to);

        // Sort amounts
        (address token0,) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);

        require(amountA >= amountAMin, "MockRouter: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "MockRouter: INSUFFICIENT_B_AMOUNT");
    }

    /**
     * @dev Calculate optimal liquidity amounts
     */
    function _calculateLiquidityAmounts(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal view returns (uint256 amountA, uint256 amountB) {
        address pair = MockFactory(factory).getPair(tokenA, tokenB);
        
        if (pair == address(0)) {
            // New pair - use desired amounts
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            // Existing pair - calculate optimal amounts based on reserves
            (uint112 reserve0, uint112 reserve1,) = MockPair(pair).getReserves();
            (address token0,) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
            (uint256 reserveA, uint256 reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);

            if (reserveA == 0 && reserveB == 0) {
                (amountA, amountB) = (amountADesired, amountBDesired);
            } else {
                uint256 amountBOptimal = (amountADesired * reserveB) / reserveA;
                if (amountBOptimal <= amountBDesired) {
                    require(amountBOptimal >= amountBMin, "MockRouter: INSUFFICIENT_B_AMOUNT");
                    (amountA, amountB) = (amountADesired, amountBOptimal);
                } else {
                    uint256 amountAOptimal = (amountBDesired * reserveA) / reserveB;
                    require(amountAOptimal <= amountADesired, "MockRouter: INVALID_AMOUNT");
                    require(amountAOptimal >= amountAMin, "MockRouter: INSUFFICIENT_A_AMOUNT");
                    (amountA, amountB) = (amountAOptimal, amountBDesired);
                }
            }
        }
    }

    /**
     * @dev Get amounts out for a given input amount
     * Simplified version for testing
     */
    function getAmountsOut(uint256 amountIn, address[] calldata path) 
        external 
        view 
        returns (uint256[] memory amounts) 
    {
        require(path.length >= 2, "MockRouter: INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;

        for (uint256 i = 0; i < path.length - 1; i++) {
            address pair = MockFactory(factory).getPair(path[i], path[i + 1]);
            require(pair != address(0), "MockRouter: PAIR_NOT_FOUND");
            
            (uint112 reserve0, uint112 reserve1,) = MockPair(pair).getReserves();
            (address token0,) = path[i] < path[i + 1] ? (path[i], path[i + 1]) : (path[i + 1], path[i]);
            (uint256 reserveIn, uint256 reserveOut) = path[i] == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
            
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    /**
     * @dev Calculate output amount given input amount and reserves
     */
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) 
        internal 
        pure 
        returns (uint256 amountOut) 
    {
        require(amountIn > 0, "MockRouter: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "MockRouter: INSUFFICIENT_LIQUIDITY");
        
        uint256 amountInWithFee = amountIn * 997; // 0.3% fee
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }
}
