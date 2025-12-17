// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TestToken {
    string public name = "Test Token";
    string public symbol = "TEST";
    uint8 public decimals = 18;
    
    function getMessage() public pure returns (string memory) {
        return "Hello from TestToken!";
    }
}
