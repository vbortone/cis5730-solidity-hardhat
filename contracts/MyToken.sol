// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @custom:security-contact vbortone@ucf.edu
 * @title MyToken
 * @dev The contract defines a fixed supply of tokens upon deployment.
 * The owner of the contract is the account that deploys the contract.
 * The owner is able to mint tokens to their own account.
 * The token has
 * - name: MyToken
 * - symbol: MTK
 * - 18 decimal places
 * This token is designed to work with the LendingPlatform contract.
 */
contract MyToken is ERC20, Ownable {
    /**
     * @dev Sets the values for {initialAmount}.
     *
     * All two of these values are immutable: they can only be set once during
     * construction.
     */
    constructor(
        uint _initialAmount
    ) ERC20("MyToken", "MTK") Ownable(msg.sender) {
        _mint(msg.sender, _initialAmount * 10 ** decimals());
    }

    /**
     * @dev Function to mint new tokens, only callable by the owner
     * @param _to The address that will receive the minted tokens.
     * @param _amount The amount of tokens to mint.
     */
    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount * 10 ** decimals());
    }
}
