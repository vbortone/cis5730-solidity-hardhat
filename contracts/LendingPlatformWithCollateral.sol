// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "./LendingPlatform.sol";
// If running on Hardhat, use the following import to output console logs during tests
import "hardhat/console.sol";

/**
 * @title LendingPlatformWithCollateral
 * @dev The contract extends the LendingPlatform contract to include collateralized loans.
 * Users can deposit Ether as collateral to borrow tokens from the contract.
 * The contract allows users to withdraw their collateral and repay their loans.
 * The contract also includes a liquidation mechanism to liquidate collateral if the value falls below a certain threshold.
 * The contract is designed to work with the MyToken contract.
 */
contract LendingPlatformWithCollateral is LendingPlatform {
    uint256 public collateralizationRatio = 150; // Collateralization ratio in percentage (e.g., 150%)
    uint256 public liquidationRatio = 110; // Liquidation ratio in percentage (e.g., 110%)

    mapping(address => uint256) public collateralEther; // mapping to store the Ether collateral deposited by users

    // Define events for collateral deposits and withdrawals
    event CollateralDeposited(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);

    /**
     * @dev Constructor to set the token and interest rate for the contract
     * @param _token Type of token to be used
     * @param _interestRate Interest rate to be charged on loans
     */
    constructor(
        IERC20 _token,
        uint256 _interestRate
    ) LendingPlatform(_token, _interestRate) {}

    /**
     * @dev Function to deposit Ether as collateral
     */
    function depositCollateral() external payable nonReentrant {
        // Require that the user deposits a non-zero amount of Ether
        require(msg.value > 0, "Must deposit Ether as collateral");

        // Update the user's collateral balance
        collateralEther[msg.sender] += msg.value;

        // Emit an event to log the collateral deposit
        emit CollateralDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Function to withdraw deposited collateral
     * @param _amount The amount of collateral to withdraw
     */
    function withdrawCollateral(uint256 _amount) public nonReentrant {
        // Require that the user withdraws a non-zero amount of collateral
        require(_amount > 0, "Must withdraw a positive amount");

        // Require that the user has enough collateral to withdraw
        require(
            collateralEther[msg.sender] >= _amount,
            "Not enough collateral"
        );

        // Check if the user can withdraw the given collateral amount
        require(
            canWithdrawCollateral(msg.sender, _amount),
            "Collateral locked due to borrowed tokens"
        );

        // Update the user's collateral balance and transfer the Ether
        collateralEther[msg.sender] -= _amount;

        // Transfer the Ether to the user
        payable(msg.sender).transfer(_amount);

        // Emit an event to log the collateral withdrawal
        emit CollateralWithdrawn(msg.sender, _amount);
    }

    /**
     * Function to borrow tokens from the contract
     * @param _amount The amount of tokens to borrow
     * @dev Override the borrow function from the parent contract to include collateral requirements
     * @dev Revert the transaction if the user does not have enough collateral
     */
    function borrow(uint256 _amount) public override nonReentrant {
        // Check if the user has enough collateral to borrow the requested amount
        uint256 requiredCollateral = requiredCollateralForBorrowing(_amount);
        require(
            collateralEther[msg.sender] >= requiredCollateral,
            "Not enough collateral"
        );

        // Call the borrow internal function from the parent contract
        super.borrowInternal(_amount);
    }

    /**
     * @dev Function to repay the loan
     */
    function repay() public override nonReentrant {
        // Repay the loan using the parent contract's repay function
        super.repayInternal();

        // Return the collateral to the user
        uint256 collateral = collateralEther[msg.sender];
        payable(msg.sender).transfer(collateral);
        delete collateralEther[msg.sender];
    }

    /**
     * @dev Check if the user can withdraw the given collateral amount
     * @param _user User address
     * @param _amount Amount of collateral to withdraw
     */
    function canWithdrawCollateral(
        address _user,
        uint256 _amount
    ) internal view returns (bool) {
        uint256 remainingCollateral = collateralEther[_user] - _amount;
        uint256 requiredCollateral = requiredCollateralForBorrowing(
            loans[_user].amount
        );
        return remainingCollateral >= requiredCollateral;
    }

    /**
     * @dev Function to calculate the required collateral for borrowing the given token amount
     * @param _tokenAmount The amount of tokens to borrow
     */
    function requiredCollateralForBorrowing(
        uint256 _tokenAmount
    ) public view returns (uint256) {
        // Assume 1 token = 1 USD and 1 Ether = 2000 USD for simplicity
        uint256 tokenValueInEther = _tokenAmount / 2000;
        return (tokenValueInEther * collateralizationRatio) / 100;
    }

    /**
     * @dev Function to liquidate the collateral of a user if the value falls below the liquidation ratio
     * @param _user The address of the user to liquidate
     */
    function liquidate(address _user) external nonReentrant {
        // Check if the user's collateral value is below the liquidation ratio
        uint256 collateralValueInEther = collateralEther[_user];
        // Assume 1 token = 1 USD and 1 Ether = 2000 USD for simplicity
        uint256 requiredCollateral = ((loans[_user].amount / 2000) *
            liquidationRatio) / 100;

        // Revert the transaction if the collateral value is sufficient
        require(
            collateralValueInEther < requiredCollateral,
            "Collateral value is sufficient"
        );

        // Liquidate the collateral
        uint256 amountToLiquidate = loans[_user].amount;
        loans[_user].amount = 0;
        collateralEther[_user] = 0;

        // Transfer the liquidated amount to the contract
        payable(msg.sender).transfer(amountToLiquidate);
    }
}
