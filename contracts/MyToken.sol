// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @custom:security-contact vbortone@ucf.edu
contract MyToken is ERC20 {
    constructor(uint256 initialAmount) ERC20("MyToken", "MTK") {
        _mint(msg.sender, initialAmount);
    }
}