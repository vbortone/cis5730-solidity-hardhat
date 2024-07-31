// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

struct Loan {
    uint256 amount;
    uint256 startTime;
    bool active;
}
contract LendingPlatformWithCollateral {
    IERC20 public token; // The token that will be lent out
    uint public collateralizationRatio = 150; // Collateralization ratio in percentage (e.g., 150%)
    uint public liquidationRatio = 110; // Liquidation ratio in percentage (e.g., 110%)
    uint public interestRate = 10; // Interest rate of 10% per year (in basis points)

    mapping(address => uint) public collateralEther;
    mapping(address => Loan) public loans;

    event CollateralDeposited(address indexed user, uint amount);
    event CollateralWithdrawn(address indexed user, uint amount);
    event LoanBorrowed(address indexed user, uint tokenAmount);
    event LoanRepaid(address indexed user, uint tokenAmount, uint interest);

    constructor(IERC20 _token) {
        token = _token;
    }

    // Deposit Ether as collateral
    function depositCollateral() external payable {
        require(msg.value > 0, "Must deposit Ether as collateral");
        collateralEther[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
    }

    // Withdraw Ether collateral
    function withdrawCollateral(uint amount) external {
        require(amount > 0, "Must withdraw a positive amount");
        require(collateralEther[msg.sender] >= amount, "Not enough collateral");
        require(canWithdrawCollateral(msg.sender, amount), "Collateral locked due to borrowed tokens");

        collateralEther[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit CollateralWithdrawn(msg.sender, amount);
    }

    // Borrow tokens against the deposited Ether collateral
    function borrow(uint tokenAmount) public {
        uint requiredCollateral = requiredCollateralForBorrowing(tokenAmount);
        require(collateralEther[msg.sender] >= requiredCollateral, "Not enough collateral");

        loans[msg.sender] = Loan({
            amount: tokenAmount,
            startTime: block.timestamp,
            active: true
        });

        require(token.transfer(msg.sender, tokenAmount), "Token transfer failed");
        emit LoanBorrowed(msg.sender, tokenAmount);
    }

    // Repay borrowed tokens
    function repay(uint tokenAmount) public {
        Loan storage loan = loans[msg.sender];
        require(loan.active == true, "No active loan");
        require(tokenAmount > 0, "Must repay a positive amount");
        require(loan.amount >= tokenAmount, "Repay amount exceeds borrowed amount");

        uint interest = calculateInterest(loan.amount, block.timestamp - loan.startTime);
        uint totalRepayment = tokenAmount + interest;
        require(token.transferFrom(msg.sender, address(this), totalRepayment), "Token transfer failed");

        loan.amount -= tokenAmount;
        if (loan.amount == 0) {
            loan.active = false;
        }

        // Adjust collateral proportionally to the repaid loan
        uint collateralToRelease = (collateralEther[msg.sender] * tokenAmount) / loan.amount;
        collateralEther[msg.sender] -= collateralToRelease;

        emit LoanRepaid(msg.sender, tokenAmount, interest);
    }

    // Check if the user can withdraw the given collateral amount
    function canWithdrawCollateral(address user, uint amount) internal view returns (bool) {
        uint remainingCollateral = collateralEther[user] - amount;
        uint requiredCollateral = requiredCollateralForBorrowing(loans[user].amount);
        return remainingCollateral >= requiredCollateral;
    }

    // Calculate the required collateral for borrowing the given token amount
    function requiredCollateralForBorrowing(uint tokenAmount) public view returns (uint) {
        // Assume 1 token = 1 USD and 1 Ether = 2000 USD for simplicity
        uint tokenValueInEther = tokenAmount / 2000; 
        return (tokenValueInEther * collateralizationRatio) / 100;
    }

    // Calculate interest based on amount and duration
    function calculateInterest(uint256 _amount, uint256 _duration) internal view returns (uint256) {
        return (_amount * interestRate * _duration) / (365 days * 100); // Interest rate per year
    }

    // Liquidate collateral if the value falls below the liquidation ratio
    function liquidate(address user) external {
        uint collateralValueInEther = collateralEther[user];
        uint requiredCollateral = (loans[user].amount / 2000) * liquidationRatio / 100;
        require(collateralValueInEther < requiredCollateral, "Collateral value is sufficient");

        // Liquidate the collateral
        uint amountToLiquidate = loans[user].amount;
        loans[user].amount = 0;
        collateralEther[user] = 0;

        payable(msg.sender).transfer(amountToLiquidate);
    }
}