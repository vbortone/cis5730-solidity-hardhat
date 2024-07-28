// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LendingPlatformWithCollateral {
    constructor(IERC20 _token, uint256 _interestRate) {}
    function lend(uint256 _amount) public{}
    function borrow(uint256 _amount) public{}
    function repay() public{}
    function calculateInterest(uint256 _amount, uint256 _duration) internal view returns (uint256){}
}