// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// If running on Hardhat, use the following import to output console logs during tests
// import "hardhat/console.sol";

/**
 * @dev The struct defines the details of a loan, including the loan amount, start time, borrower address, and loan status.
 */
struct Loan {
    uint256 amount;
    uint256 startTime;
    address borrower;
    bool active;
}

/**
 * @title LendingPlatform
 * @dev The contract allows users to lend tokens to the contract and borrow tokens from the contract.
 * The contract charges an interest rate on loans and allows users to repay their loans.
 * The contract is designed to work with the MyToken contract.
 */
contract LendingPlatform is ReentrancyGuard {
    // State variables
    IERC20 internal token;
    uint256 internal tokenBalance;
    uint256 internal interestRate;
    mapping(address => Loan) internal loans;

    // Define events for loan initiation, repayment, and token deposits
    event LoanInitiated(
        address indexed borrower,
        uint256 amount,
        uint256 startTime
    );
    event LoanRepaid(address indexed borrower, uint256 amount, uint256 endTime);
    event TokensDeposited(address indexed lender, uint256 amount);

    /**
     * @dev Constructor to set the token and interest rate for the contract
     * @param _token Type of token to be used
     * @param _interestRate Interest rate to be charged on loans
     */
    constructor(IERC20 _token, uint256 _interestRate) {
        token = _token;
        interestRate = _interestRate;
    }

    /**
     * @dev Function to allow users to lend tokens to the contract
     * @param _amount The amount of tokens to lend
     */
    function lend(uint256 _amount) public nonReentrant {
        // Transfer tokens from the lender to the contract
        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );

        // Update the token balance of the contract and emit the TokensDeposited event
        tokenBalance += _amount;

        // Emit the TokensDeposited event
        emit TokensDeposited(msg.sender, _amount);
    }

    /**
     * @dev Function to allow users to borrow tokens from the contract
     * @param _amount The amount of tokens to borrow
     */
    function borrow(uint256 _amount) public nonReentrant virtual {
        // Check that the user does not have an active loan
        require(loans[msg.sender].active == false, "Loan already active");

        // Check that the contract has enough tokens to lend
        require(tokenBalance >= _amount, "Insufficient funds");

        // Transfer the borrowed tokens to the borrower
        require(token.transfer(msg.sender, _amount), "Transfer failed");

        // Initialize the loan details
        loans[msg.sender] = Loan(_amount, block.timestamp, msg.sender, true);

        // Update the token balance of the contract
        tokenBalance -= _amount;

        // Emit the LoanInitiated event
        emit LoanInitiated(msg.sender, _amount, block.timestamp);
    }

    /**
     * @dev Function to allow users to repay their loans
     * Users can repay the loan amount along with the interest accrued
     */
    function repay() public nonReentrant virtual{
        // Get the loan details of the borrower
        Loan storage loan = loans[msg.sender];
        // console.log("Loan: %s", loan.amount);

        // Check that the user has an active loan
        require(loan.active == true, "No active loan");

        // Calculate the interest accrued on the loan
        uint256 interest = calculateInterest(
            loan.amount,
            block.timestamp - loan.startTime
        );
        // console.log("Interest: %s", interest);

        // Calculate the total amount to be repaid
        uint256 total = loan.amount + interest;
        // console.log("Loan + interest: %s", total);

        // Transfer the total amount to be repaid from the borrower to the contract
        require(
            token.transferFrom(msg.sender, address(this), total),
            "Transfer failed"
        );

        // Update the token balance of the contract and mark the loan as inactive
        tokenBalance += total;
        loan.active = false;

        // Delete the loan and emit the LoanRepaid event
        delete loans[msg.sender];
        emit LoanRepaid(msg.sender, loan.amount, block.timestamp);
    }

    /**
     * @dev Function to calculate the interest accrued on a loan
     * The interest is calculated based on the loan amount and duration
     *
     * @param _amount Original loan amount
     * @param _duration Time duration of the loan (in days)
     */
    function calculateInterest(
        uint256 _amount,
        uint256 _duration
    ) internal view returns (uint256) {
        return (_amount * interestRate * _duration) / (365 days * 100);
    }

    /**
     * @dev Function to get the token balance of the contract
     */
    function getTokenBalance() public view returns (uint256) {
        return tokenBalance;
    }

    /**
     * @dev Function to get the interest rate of the contract
     */
    function getInterestRate() public view returns (uint256) {
        return interestRate;
    }
}
