// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockPair
 * @dev Mock implementation of PancakeSwap Pair contract for local testing
 * Simulates liquidity pool behavior with reserves and LP tokens
 */
contract MockPair is ERC20 {
    address public token0;
    address public token1;
    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;

    uint256 public constant MINIMUM_LIQUIDITY = 10**3;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Sync(uint112 reserve0, uint112 reserve1);

    constructor() ERC20("PancakeSwap LP", "Cake-LP") {
        // Tokens will be set by factory
    }

    /**
     * @dev Initialize the pair with token addresses
     * Can only be called once
     */
    function initialize(address _token0, address _token1) external {
        require(token0 == address(0) && token1 == address(0), "MockPair: ALREADY_INITIALIZED");
        token0 = _token0;
        token1 = _token1;
    }

    /**
     * @dev Get current reserves
     * @return _reserve0 Reserve of token0
     * @return _reserve1 Reserve of token1
     * @return _blockTimestampLast Last block timestamp
     */
    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    /**
     * @dev Add liquidity to the pool
     * @param to Address to receive LP tokens
     * @return liquidity Amount of LP tokens minted
     */
    function mint(address to) external returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            // First liquidity provision
            liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(1), MINIMUM_LIQUIDITY); // Lock minimum liquidity
        } else {
            // Subsequent liquidity provisions
            liquidity = min((amount0 * _totalSupply) / _reserve0, (amount1 * _totalSupply) / _reserve1);
        }

        require(liquidity > 0, "MockPair: INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);

        _update(balance0, balance1);
        emit Mint(msg.sender, amount0, amount1);
    }

    /**
     * @dev Remove liquidity from the pool
     * @param to Address to receive tokens
     * @return amount0 Amount of token0 returned
     * @return amount1 Amount of token1 returned
     */
    function burn(address to) external returns (uint256 amount0, uint256 amount1) {
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        uint256 _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;

        require(amount0 > 0 && amount1 > 0, "MockPair: INSUFFICIENT_LIQUIDITY_BURNED");
        
        _burn(address(this), liquidity);
        IERC20(token0).transfer(to, amount0);
        IERC20(token1).transfer(to, amount1);

        balance0 = IERC20(token0).balanceOf(address(this));
        balance1 = IERC20(token1).balanceOf(address(this));

        _update(balance0, balance1);
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /**
     * @dev Update reserves
     */
    function _update(uint256 balance0, uint256 balance1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "MockPair: OVERFLOW");
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = uint32(block.timestamp % 2**32);
        emit Sync(reserve0, reserve1);
    }

    /**
     * @dev Square root function for liquidity calculation
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /**
     * @dev Returns minimum of two numbers
     */
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }
}
