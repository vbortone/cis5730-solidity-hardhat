// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

struct Loan {
    uint256 amount;
    uint256 startTime;
    address borrower;
    bool active;
}

contract LendingPlatform {
    IERC20 token;
    uint256 private tokenBalance;
    uint256 private interestRate;
    mapping (address => Loan) loans;

    event LoanInitiated(address indexed borrower, uint256 amount, uint256 startTime);
    event LoanRepaid(address indexed borrower, uint256 amount, uint256 endTime);
    event TokensDeposited(address indexed lender, uint256 amount);

    constructor(IERC20 _token, uint256 _interestRate) {
        token = _token;
        interestRate = _interestRate;
    }

    function lend(uint256 _amount) public {
        require(token.transferFrom(msg.sender, address(this), _amount), "Transfer failed");

        tokenBalance += _amount;
        emit TokensDeposited(msg.sender, _amount);
    }

    function borrow(uint256 _amount) public {
        require(loans[msg.sender].active == false, "Loan already active");

        require(tokenBalance >= _amount, "Insufficient funds");
        require(token.transfer(msg.sender, _amount), "Transfer failed");

        loans[msg.sender] = Loan(_amount, block.timestamp, msg.sender, true);
        emit LoanInitiated(msg.sender, _amount, block.timestamp);
    }

    function repay() public {
        Loan storage loan = loans[msg.sender];
        require(loan.active == true, "No active loan");

        uint256 interest = calculateInterest(loan.amount, block.timestamp - loan.startTime);
        uint256 total = loan.amount + interest;

        require(token.transferFrom(msg.sender, address(this), total), "Transfer failed");

        tokenBalance += total;
        loan.active = false;
        emit LoanRepaid(msg.sender, loan.amount, block.timestamp);

    }

    function calculateInterest(uint256 _amount, uint256 _duration) internal view returns (uint256) {
        return _amount * interestRate * _duration / (365 * 100);
    }

    // Get the token balance of the contract
    function getTokenBalance() public view returns (uint256) {
        return tokenBalance;
    }

    // Get the interest rate for the contract
    function getInterestRate() public view returns (uint256) {
        return interestRate;
    }
}